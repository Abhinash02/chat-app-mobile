import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';

import { useQueryClient } from '@tanstack/react-query';
import { getApiOrigin } from '../api/client.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { storage } from '../lib/storage.js';
import { useAuth } from './useAuth.jsx';
import { useSounds } from './useSounds.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useToast } from '../components/Toast.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const { applyTheme } = useTheme();
  const { playMessage, playCoin } = useSounds();
  const toast = useToast();
  const queryClient = useQueryClient();

  const socketRef = useRef(null);
  // The socket itself is held in state as well as a ref: consumers render
  // against it, and a ref read during render would hand them a stale value.
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [activeBannerNotification, setActiveBannerNotification] = useState(null);
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

      socket = io(getApiOrigin(), {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      });

      socketRef.current = socket;
      setSocket(socket);

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
      socket.on('connect_error', async (err) => {
        if (
          err.message === 'Authentication failed' ||
          err.message === 'Authentication required' ||
          err.data?.code === 'UNAUTHORIZED' ||
          err.data?.code === 'TOKEN_REVOKED'
        ) {
          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              const res = await fetch(`${getApiOrigin()}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (res.ok) {
                const data = await res.json();
                const tokens = data?.data?.tokens;
                if (tokens?.accessToken) {
                  await storage.setTokens(tokens);
                  socket.auth = { token: tokens.accessToken };
                  socket.connect();
                  return;
                }
              }
            }
          } catch {
            // refresh failed
          }
        }
      });

      socket.on(SOCKET_EVENT.READY, (payload) => {
        setWallet(payload.wallet);
        setUnreadCount(payload.unreadCount ?? 0);
        if (typeof payload.notificationUnreadCount === 'number') {
          setNotificationUnreadCount(payload.notificationUnreadCount);
        }
        if (payload.theme) handlersRef.current.applyTheme(payload.theme);
      });

      socket.on(SOCKET_EVENT.NOTIFICATION_NEW, (notification) => {
        const myGender = handlersRef.current.user?.gender;
        if (notification.targetAudience === 'boys' && myGender !== 'male') return;
        if (notification.targetAudience === 'girls' && myGender !== 'female') return;

        // Play real-time notification audio chime immediately
        if (notification.sound !== 'none') {
          handlersRef.current.playMessage();
        }

        // Real-time count ++
        setNotificationUnreadCount((c) => c + 1);

        // Show top interactive notification alert banner
        setActiveBannerNotification(notification);

        // Refresh notification query caches
        queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['in-app-notifications-home'] });
        queryClient.invalidateQueries({ queryKey: ['in-app-notifications-unread'] });
      });

      socket.on(SOCKET_EVENT.NOTIFICATION_COUNT_UPDATED, ({ unreadCount }) => {
        if (typeof unreadCount === 'number') {
          setNotificationUnreadCount(unreadCount);
        }
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
        const isMine = String(message.senderId) === String(handlersRef.current.user?.id);
        if (!isMine) {
          handlersRef.current.playMessage();
          setUnreadCount((count) => count + 1);
        }

        // Realtime instant update for conversation list cache without reloading!
        queryClient.setQueryData(['conversations'], (oldData) => {
          if (!oldData?.items) return oldData;
          let found = false;
          const updatedItems = oldData.items.map((conv) => {
            if (String(conv.id) === String(message.conversationId)) {
              found = true;
              return {
                ...conv,
                lastMessageAt: message.createdAt || new Date().toISOString(),
                lastMessage: {
                  id: message.id,
                  text: message.text,
                  type: message.type,
                  isMine,
                  createdAt: message.createdAt,
                },
                unreadCount: isMine ? (conv.unreadCount || 0) : (conv.unreadCount || 0) + 1,
              };
            }
            return conv;
          });

          // Sort latest conversation to the top
          updatedItems.sort(
            (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
          );

          return { ...oldData, items: updatedItems };
        });
      });

      socket.on(SOCKET_EVENT.MESSAGE_READ_RECEIPT, (payload) => {
        queryClient.setQueryData(['conversations'], (oldData) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((conv) =>
              String(conv.id) === String(payload.conversationId)
                ? { ...conv, unreadCount: 0 }
                : conv,
            ),
          };
        });
      });

      socket.on(SOCKET_EVENT.PRESENCE_UPDATED, ({ userId, isOnline, lastSeenAt }) => {
        setPresence((current) => ({ ...current, [userId]: { isOnline, lastSeenAt } }));
      });

      socket.on(SOCKET_EVENT.FOLLOW_UPDATED, ({ actorId, actorName, isFollowing }) => {
        if (isFollowing && actorName && String(actorId) !== String(handlersRef.current.user?.id)) {
          handlersRef.current.toast.info(`${actorName} started following you now! 👤✨`);
        }
        queryClient.invalidateQueries({ queryKey: ['my-profile'] });
        queryClient.invalidateQueries({ queryKey: ['followers'] });
        queryClient.invalidateQueries({ queryKey: ['following'] });
        queryClient.invalidateQueries({ queryKey: ['discover'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      });

      socket.on('feedback:status:updated', ({ category, status }) => { 
        handlersRef.current.toast.info(`Feedback update: Your ${category} was marked as ${status}`);
        queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      });

      socket.on('support:message:new', (data) => {
        if (data.message?.senderType === 'admin') {
          handlersRef.current.playMessage();
          handlersRef.current.toast.info('🎧 Support team replied to your ticket!');
        }
        queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['support-ticket-details'] });
      });

      socket.on('event:new', (newEvent) => {
        handlersRef.current.playCoin();
        handlersRef.current.toast.info(`🎉 New Event: ${newEvent.title}`);
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['banners'] });
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

      socket.on('settings:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['earnings-status'] });
        queryClient.invalidateQueries({ queryKey: ['payment-options'] });
        queryClient.invalidateQueries({ queryKey: ['referral-my-code'] });
        queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
        queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      });

      socket.on('earnings:updated', (data) => {
        setWallet((current) => current ? { ...current, earnings: { ...current.earnings, ...data.earnings } } : current);
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['earnings-status'] });
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
      setNotificationUnreadCount(0);
      setActiveBannerNotification(null);
    };
  }, [isAuthenticated, queryClient]);

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

  const dismissBannerNotification = useCallback(() => {
    setActiveBannerNotification(null);
  }, []);

  /**
   * Whether the free-talk allowance is actually being spent right now.
   *
   * Set by the chat screen while it is open and the app is in front — the only
   * situation in which the server is billing time. The header reads it to
   * decide whether its countdown should move: ticking on the Discover screen
   * showed the allowance draining while nobody was chatting, and the number
   * then jumped back up the moment the server corrected it.
   */
  const [isFreeTalkRunning, setFreeTalkRunning] = useState(false);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      wallet,
      setWallet,
      unreadCount,
      setUnreadCount,
      notificationUnreadCount,
      setNotificationUnreadCount,
      activeBannerNotification,
      dismissBannerNotification,
      presence,
      emit,
      on,
      isFreeTalkRunning,
      setFreeTalkRunning,
    }),
    [
      socket,
      isConnected,
      wallet,
      unreadCount,
      notificationUnreadCount,
      activeBannerNotification,
      dismissBannerNotification,
      presence,
      emit,
      on,
      isFreeTalkRunning,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside a SocketProvider');
  return context;
}
