import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { request, setSessionExpiredHandler } from '../api/client.js';
import { deviceApi } from '../api/endpoints.js';
import { storage } from '../lib/storage.js';
import { registerForPushNotifications, unregisterPushToken } from './usePushNotifications.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  /**
   * A stored session is re-validated on launch rather than trusted.
   *
   * The account may have been suspended, deleted or signed out remotely while
   * the app was closed, and the phone has no way to know that until it asks.
   */
  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const token = await storage.getAccessToken();

      if (!token) {
        if (!isCancelled) setIsRestoring(false);
        return;
      }

      // Show the cached profile immediately so the app does not sit on a
      // spinner while the network catches up.
      const cached = await storage.getUser();
      if (cached && !isCancelled) setUser(cached);

      try {
        const fresh = await request({ method: 'GET', url: '/auth/me' });
        if (isCancelled) return;

        setUser(fresh);
        await storage.setUser(fresh);

        // Auto-register hardware device token on session restore
        registerForPushNotifications()
          .then((token) => {
            if (token) {
              deviceApi.register({
                token,
                platform: Platform.OS === 'web' ? 'web' : Platform.OS,
                deviceName: 'Mobile Device',
                appVersion: '1.0.0',
              }).catch(() => undefined);
            }
          })
          .catch(() => undefined);
      } catch (error) {
        // Only a rejected session signs the user out. A dead network must not:
        // reopening the app on a train should not lose your session.
        if (error?.status === 401 || error?.status === 403) {
          await storage.clear();
          if (!isCancelled) setUser(null);
        }
      } finally {
        if (!isCancelled) setIsRestoring(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const pushToken = await registerForPushNotifications().catch(() => null);
    const result = await request({ method: 'POST', url: '/auth/login', data: { email, password } });
    await storage.setSession({ tokens: result.tokens, user: result.user });
    setUser(result.user);

    // Save device info in DeviceToken table linked with user ID
    const tokenToRegister = pushToken || `ExponentPushToken[app-${Platform.OS}-auto]`;
    deviceApi.register({
      token: tokenToRegister,
      platform: Platform.OS === 'web' ? 'web' : Platform.OS,
      deviceName: 'Mobile Device',
      appVersion: '1.0.0',
    }).catch(() => undefined);

    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    // Registration returns no tokens — the email has to be verified first.
    return request({ method: 'POST', url: '/auth/register', data: payload });
  }, []);

  const verifyEmail = useCallback(async ({ email, code }) => {
    const pushToken = await registerForPushNotifications().catch(() => null);
    const result = await request({ method: 'POST', url: '/auth/verify-email', data: { email, code } });
    await storage.setSession({ tokens: result.tokens, user: result.user });
    setUser(result.user);

    // Save device info in DeviceToken table linked with user ID
    const tokenToRegister = pushToken || `ExponentPushToken[app-${Platform.OS}-auto]`;
    deviceApi.register({
      token: tokenToRegister,
      platform: Platform.OS === 'web' ? 'web' : Platform.OS,
      deviceName: 'Mobile Device',
      appVersion: '1.0.0',
    }).catch(() => undefined);

    return result.user;
  }, []);

  const resendCode = useCallback(async (email) => {
    return request({ method: 'POST', url: '/auth/resend-code', data: { email } });
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await storage.getRefreshToken();

    // Retire the push token first, while the session still authorises it —
    // otherwise this device keeps receiving someone else's notifications.
    await unregisterPushToken();

    await storage.clear();
    setUser(null);

    if (refreshToken) {
      request({ method: 'POST', url: '/auth/logout', data: { refreshToken } }).catch(() => undefined);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await request({ method: 'GET', url: '/auth/me' });
    setUser(fresh);
    await storage.setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRestoring,
      signIn,
      register,
      verifyEmail,
      resendCode,
      signOut,
      refreshUser,
      setUser,
    }),
    [user, isRestoring, signIn, register, verifyEmail, resendCode, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
