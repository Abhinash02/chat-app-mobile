import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider.jsx';

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = { success: 2600, info: 2600, error: 4200 };

function ToastItem({ toast, onDismiss }) {
  const { colors, radius } = useTheme();

  // A lazy `useState` initialiser rather than a ref: the animated value is
  // read during render to build the style, and reading a ref there is exactly
  // what React tells you not to do.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        onDismiss(toast.id),
      );
      // Errors stay longer: they usually ask the reader to do something.
    }, AUTO_DISMISS_MS[toast.type] ?? AUTO_DISMISS_MS.info);

    return () => clearTimeout(timer);
  }, [progress, toast.id, toast.type, onDismiss]);

  const accent = {
    success: colors.success,
    error: colors.danger,
    info: colors.info,
    coin: colors.coinGold,
  }[toast.type] ?? colors.info;

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <Pressable
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        className="mb-2 flex-row items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {toast.icon ? <Text className="text-lg">{toast.icon}</Text> : null}
        <View className="flex-1">
          {toast.title ? (
            <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {toast.title}
            </Text>
          ) : null}
          <Text className="text-sm" style={{ color: toast.title ? colors.textSecondary : colors.textPrimary }}>
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Toasts render above everything, below the notch.
 *
 * Deliberately not a library: the palette is decided at runtime by the server,
 * and every toast library styles itself at build time.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const insets = useSafeAreaInsets();
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options) => {
    nextId.current += 1;
    const toast = { id: nextId.current, type: 'info', ...options };

    // Three at a time is the most a phone screen can show without covering
    // the thing the user is trying to read.
    setToasts((current) => [...current.slice(-2), toast]);
    return toast.id;
  }, []);

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show({ ...options, message, type: 'success', icon: options?.icon ?? '✓' }),
      error: (message, options) => show({ ...options, message, type: 'error', icon: options?.icon ?? '⚠️' }),
      info: (message, options) => show({ ...options, message, type: 'info' }),
      coins: (message, options) => show({ ...options, message, type: 'coin', icon: '🪙' }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 px-4"
        style={{ top: insets.top + 8 }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
