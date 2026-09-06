import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'vibe.accessToken';
const REFRESH_TOKEN_KEY = 'vibe.refreshToken';
const USER_KEY = 'vibe.user';
const LOCATION_ASKED_KEY = 'vibe.locationAsked';
const THEME_KEY = 'vibe.theme';

/**
 * Session storage.
 *
 * On a phone this is the device keychain (iOS) / keystore (Android), not
 * AsyncStorage — which is plain unencrypted files any process with filesystem
 * access can read on a rooted device.
 *
 * `expo-secure-store` has no web implementation at all, so the browser falls
 * back to localStorage. That is fine for the development preview this enables,
 * but it is NOT equivalent: localStorage is readable by any script on the page.
 */
const isWeb = Platform.OS === 'web';

async function read(key) {
  try {
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    // Private browsing, blocked site data, or a device where the keystore is
    // unavailable. Losing a stored session means "sign in again", not a crash.
    return null;
  }
}

async function write(key, value) {
  try {
    const isEmpty = value === null || value === undefined;

    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      if (isEmpty) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
      return;
    }

    if (isEmpty) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Degrades to a session that ends when the app is closed.
  }
}

export const storage = {
  getAccessToken: () => read(ACCESS_TOKEN_KEY),
  getRefreshToken: () => read(REFRESH_TOKEN_KEY),

  async getUser() {
    const raw = await read(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setSession({ tokens, user }) {
    await Promise.all([
      write(ACCESS_TOKEN_KEY, tokens?.accessToken ?? null),
      write(REFRESH_TOKEN_KEY, tokens?.refreshToken ?? null),
      write(USER_KEY, user ? JSON.stringify(user) : null),
    ]);
  },

  async setTokens(tokens) {
    await Promise.all([
      write(ACCESS_TOKEN_KEY, tokens?.accessToken ?? null),
      write(REFRESH_TOKEN_KEY, tokens?.refreshToken ?? null),
    ]);
  },

  async setUser(user) {
    await write(USER_KEY, user ? JSON.stringify(user) : null);
  },

  /**
   * Whether the location prompt has already been shown.
   */
  async hasAskedLocation() {
    return (await read(LOCATION_ASKED_KEY)) === 'true';
  },

  async setLocationAsked() {
    await write(LOCATION_ASKED_KEY, 'true');
  },

  /**
   * The last theme the server actually served.
   *
   * Kept so a reload can paint the colours the app had a moment ago rather
   * than the palette compiled into the build. Without it every launch shows
   * the bundled default for as long as `/theme/active` takes to answer, and
   * then visibly repaints — which reads as a bug even though nothing is wrong.
   */
  async getCachedTheme() {
    const raw = await read(THEME_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // A truncated or older-format entry is not worth keeping.
      return null;
    }
  },

  async setCachedTheme(theme) {
    await write(THEME_KEY, theme ? JSON.stringify(theme) : null);
  },

  async getLanguage() {
    return (await read('vibe.language')) || 'en';
  },

  async setLanguage(lang) {
    await write('vibe.language', lang);
  },

  async clear() {
    await Promise.all([
      write(ACCESS_TOKEN_KEY, null),
      write(REFRESH_TOKEN_KEY, null),
      write(USER_KEY, null),
    ]);
  },
};
