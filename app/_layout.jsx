import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../src/hooks/useAuth.jsx';
import { SocketProvider } from '../src/hooks/useSocket.jsx';
import { SoundProvider, useSounds } from '../src/hooks/useSounds.jsx';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.jsx';
import { ToastProvider } from '../src/components/Toast.jsx';
import { usePushNotifications } from '../src/hooks/usePushNotifications.js';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // A 402 or 403 will not become a 200 on retry; only transport failures
        // are worth attempting again.
        if (error?.status && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

/**
 * Wires the pieces that need each other: push registration needs to know
 * whether anyone is signed in, and the sound provider needs to respect the
 * account's own sound preference.
 */
function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const { colors, isDark } = useTheme();
  const { setEnabled } = useSounds();

  usePushNotifications({ isAuthenticated });

  useEffect(() => {
    setEnabled(user?.preferences?.soundEnabled !== false);
  }, [user?.preferences?.soundEnabled, setEnabled]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="room/[roomId]" />
        <Stack.Screen name="coins" options={{ presentation: 'modal' }} />
        <Stack.Screen name="browse" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="status/new" options={{ presentation: 'modal' }} />
        {/* Full-screen and black: a story should not sit inside the app's chrome. */}
        <Stack.Screen name="status/[userId]" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <SoundProvider>
                <AuthProvider>
                  <SocketProvider>
                    <AppShell />
                  </SocketProvider>
                </AuthProvider>
              </SoundProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
