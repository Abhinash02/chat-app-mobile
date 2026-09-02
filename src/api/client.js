import axios from 'axios';
import Constants from 'expo-constants';

import { storage } from '../lib/storage.js';

export function getApiOrigin() {
  const liveUrl = process.env.EXPO_PUBLIC_API_URL_LIVE
    ? process.env.EXPO_PUBLIC_API_URL_LIVE.replace(/\/+$/, '')
    : null;
  const localUrl = process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '')
    : null;

  // 1. Web Browser Environment
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.');

    // If browsing in web browser on local computer / local network, connect to that hostname's backend
    if (isLocalHost) {
      return `http://${hostname}:5000`;
    }

    // If deployed on Render / Vercel / Live domain, use the live backend URL
    if (liveUrl) return liveUrl;
    if (localUrl && localUrl.startsWith('https://')) return localUrl;
  }

  // 2. Native Mobile / Expo Go Environment
  // If localUrl is provided and you're testing locally, use localUrl
  if (localUrl && (localUrl.startsWith('http://192.168.') || localUrl.startsWith('http://10.') || localUrl.startsWith('http://localhost'))) {
    return localUrl;
  }

  // If liveUrl is provided, connect to live backend
  if (liveUrl) return liveUrl;

  // Auto-detect local computer Wi-Fi IP in Expo Go during local dev
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  // Fallback
  return localUrl || 'http://localhost:5000';
}

export const BASE_URL = `${getApiOrigin()}/api/v1`;

export const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

/** One error shape, whatever actually went wrong. */
export class ApiError extends Error {
  constructor({ code, message, details, status }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function toApiError(error) {
  const payload = error.response?.data?.error;

  if (payload) {
    return new ApiError({
      code: payload.code,
      message: payload.message,
      details: payload.details,
      status: error.response.status,
    });
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError({ code: 'TIMEOUT', message: 'That took too long. Try again.' });
  }

  // On a phone this is the common case: no signal, aeroplane mode, a captive
  // portal. Saying so is more useful than "unexpected error".
  if (!error.response) {
    return new ApiError({ code: 'NETWORK_ERROR', message: 'No connection. Check your internet.' });
  }

  return new ApiError({
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Please try again.',
    status: error.response.status,
  });
}

api.interceptors.request.use(async (config) => {
  const token = await storage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * A phone reopened after a week always has an expired access token, so refresh
 * is the normal path rather than an edge case. Concurrent 401s share one
 * refresh promise: refresh tokens rotate on use, and firing several at once
 * looks like token theft to the server and revokes the whole session.
 */
let refreshPromise = null;
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function refreshTokens() {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) throw new ApiError({ code: 'NO_REFRESH_TOKEN', message: 'Session expired' });

  // Bare axios: the instance interceptor would attach the dead access token.
  const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const tokens = response.data.data.tokens;
  await storage.setTokens(tokens);
  return tokens.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const isAuthProblem = status === 401 && code !== 'INVALID_CREDENTIALS';

    if (isAuthProblem && request && !request.__isRetry) {
      request.__isRetry = true;

      try {
        refreshPromise =
          refreshPromise ??
          refreshTokens().finally(() => {
            refreshPromise = null;
          });

        const accessToken = await refreshPromise;
        request.headers.Authorization = `Bearer ${accessToken}`;
        return api(request);
      } catch {
        await storage.clear();
        onSessionExpired();
        return Promise.reject(
          new ApiError({ code: 'SESSION_EXPIRED', message: 'Please sign in again.', status: 401 }),
        );
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export async function request(config) {
  const response = await api.request(config);
  return response.data.data;
}

export async function requestList(config) {
  const response = await api.request(config);
  return { items: response.data.data, meta: response.data.meta ?? null };
}
