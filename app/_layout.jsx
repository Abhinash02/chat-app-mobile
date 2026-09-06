import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';

import { AuthProvider, useAuth } from '../src/hooks/useAuth.jsx';
import { SocketProvider } from '../src/hooks/useSocket.jsx';
import { SoundProvider, useSounds } from '../src/hooks/useSounds.jsx';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.jsx';
import { LanguageProvider } from '../src/i18n/LanguageProvider.jsx';
import { ActionSheetProvider } from '../src/components/ActionSheet.jsx';
import { AppUpdateModal } from '../src/components/AppUpdateModal.jsx';
import { DailyBonusModal } from '../src/components/DailyBonusModal.jsx';
import { InAppNotificationBanner } from '../src/components/InAppNotificationBanner.jsx';
import { ToastProvider } from '../src/components/Toast.jsx';
import { usePushNotifications } from '../src/hooks/usePushNotifications.js';
import { markFontsReady } from '../src/lib/app-font.js';
import { initializeMobileAds } from '../src/services/ads';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
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
    initializeMobileAds();
  }, []);

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
      <InAppNotificationBanner />
      <AppUpdateModal />
      <DailyBonusModal />
    </View>
  );
}

export default function RootLayout() {
  /*
   * Cause is the app's typeface. All three weights are registered here, and
   * `app-font.js` makes them the default for every Text and TextInput once
   * they are ready — see that file for why a font cannot simply be set once at
   * the root in React Native.
   *
   * Rendering is not blocked on it: text shows in the system face for the
   * moment before the files register, which is a better first impression than
   * a splash screen held until a font finishes loading.
   */
  const [fontsLoaded] = useFonts({
    'Cause-Regular': require('../assets/fonts/Cause-Regular.ttf'),
    'Cause-SemiBold': require('../assets/fonts/Cause-SemiBold.ttf'),
    'Cause-Bold': require('../assets/fonts/Cause-Bold.ttf'),
  });

  // Flipping this flag is what switches the whole tree over. `fontsLoaded`
  // changing is itself a re-render, so everything picks it up on that pass.
  if (fontsLoaded) markFontsReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <ThemeProvider fontsLoaded={fontsLoaded}>
              <ToastProvider>
                <ActionSheetProvider>
                  <SoundProvider>
                    <AuthProvider>
                      <SocketProvider>
                        <AppShell />
                      </SocketProvider>
                    </AuthProvider>
                  </SoundProvider>
                </ActionSheetProvider>
              </ToastProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
