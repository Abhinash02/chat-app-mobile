import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';

import { SOCKET_EVENT } from '../constants/events.js';
import { storage } from '../lib/storage.js';
import { useAuth } from './useAuth.jsx';
import { useSounds } from './useSounds.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useToast } from '../components/Toast.jsx';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

const SocketContext = createContext(null);

/**
 * The app's single realtime connection.
 *
 * Everything that must feel live comes through here: the coin counter, the
 * free-time countdown, presence dots, incoming messages and admin theme
 * changes. Each of those also has a REST equivalent, so a dropped socket
 * degrades the app to "pull to refresh" rather than breaking it.
 */
export function SocketProvider({ children }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const { applyTheme } = useTheme();
  const { playMessage, playCoin } = useSounds();
  const toast = useToast();

  const socketRef = useRef(null);
  // The socket itself is held in state as well as a ref: consumers render
  // against it, and a ref read during render would hand them a stale value.
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [presence, setPresence] = useState({});

  // Socket listeners are registered once per connection but must call the
  // newest versions of these. Updating the box in an effect rather than during
  // render keeps the write out of the render phase.
  const handlersRef = useRef({});

  useEffect(() => {
    handlersRef.current = { applyTheme, playMessage, playCoin, toast, signOut, user };
  }, [applyTheme, playMessage, playCoin, toast, signOut, user]);

  useEffect(() => {
    // Signing out is handled by this effect's own cleanup, which React runs
    // when `isAuthenticated` flips. Tearing down here as well would mean
    // setting state in the effect body for a teardown that already happened.
    if (!isAuthenticated) return undefined;

    let socket;
    let isCancelled = false;

    (async () => {
      const token = await storage.getAccessToken();
      if (!token || isCancelled) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      });

      socketRef.current = socket;
      setSocket(socket);

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      socket.on(SOCKET_EVENT.READY, (payload) => {
        setWallet(payload.wallet);
        setUnreadCount(payload.unreadCount ?? 0);
        if (payload.theme) handlersRef.current.applyTheme(payload.theme);
      });

      socket.on(SOCKET_EVENT.WALLET_UPDATED, (snapshot) => {
        setWallet((previous) => {
          // A credit is worth celebrating; a charge is not worth interrupting.
          if (previous && snapshot.coinBalance > previous.coinBalance) {
            handlersRef.current.playCoin();
          }
          return snapshot;
        });
      });

      socket.on(SOCKET_EVENT.FREE_TALK_TICK, ({ freeTalkSecondsRemaining }) => {
        setWallet((previous) => (previous ? { ...previous, freeTalkSecondsRemaining } : previous));
      });

      socket.on(SOCKET_EVENT.FREE_TALK_EXHAUSTED, ({ messagesPerBlock, coinsPerBlock }) => {
        handlersRef.current.toast.info(
          `Free chat time is over. ${messagesPerBlock} messages now cost ${coinsPerBlock} coins.`,
        );
      });

      socket.on(SOCKET_EVENT.DAILY_BONUS_READY, ({ amount }) => {
        handlersRef.current.toast.coins(`Your ${amount} daily coins are ready to claim!`);
      });

      socket.on(SOCKET_EVENT.MESSAGE_NEW, (message) => {
        // Only chime for messages from the other person.
        if (String(message.senderId) !== String(handlersRef.current.user?.id)) {
          handlersRef.current.playMessage();
          setUnreadCount((count) => count + 1);
        }
      });

      socket.on(SOCKET_EVENT.PRESENCE_UPDATED, ({ userId, isOnline, lastSeenAt }) => {
        setPresence((current) => ({ ...current, [userId]: { isOnline, lastSeenAt } }));
      });

      socket.on(SOCKET_EVENT.THEME_UPDATED, (theme) => {
        handlersRef.current.applyTheme(theme);
      });

      socket.on(SOCKET_EVENT.ACCOUNT_SUSPENDED, ({ reason }) => {
        handlersRef.current.toast.error(reason || 'Your account has been suspended.');
        handlersRef.current.signOut();
      });

      socket.on(SOCKET_EVENT.FORCE_LOGOUT, () => {
        handlersRef.current.toast.info('You have been signed out.');
        handlersRef.current.signOut();
      });

      socket.on(SOCKET_EVENT.ERROR, (error) => {
        if (error?.code !== 'INSUFFICIENT_COINS') {
          handlersRef.current.toast.error(error?.message ?? 'Something went wrong');
        }
      });
    })();

    return () => {
      isCancelled = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      socketRef.current = null;

      // Wallet and presence mirror a live connection; leaving them behind
      // would show the next signed-in user the previous one's balance.
      setSocket(null);
      setIsConnected(false);
      setWallet(null);
      setPresence({});
      setUnreadCount(0);
    };
  }, [isAuthenticated]);

  /**
   * Phones suspend sockets in the background. Reconnecting on foreground is
   * what stops the presence dot going stale and messages arriving late.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    });

    return () => subscription.remove();
  }, []);

  const emit = useCallback((event, payload, acknowledgement) => {
    socketRef.current?.emit(event, payload, acknowledgement);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      wallet,
      setWallet,
      unreadCount,
      setUnreadCount,
      presence,
      emit,
      on,
    }),
    [socket, isConnected, wallet, unreadCount, presence, emit, on],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside a SocketProvider');
  return context;
}
