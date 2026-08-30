import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { GradientButton } from './ui.jsx';
import { usersApi } from '../api/endpoints.js';
import { useDeviceLocation } from '../hooks/useDeviceLocation.js';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { storage } from '../lib/storage.js';

/**
 * Asks for location once, shortly after someone first signs in.
 *
 * Deliberately a screen of our own before the system dialog, not the system
 * dialog on its own. iOS and Android each allow exactly one prompt — deny it
 * and the app can never ask again, only send the user into Settings. So this
 * explains what it is for first, and only triggers the real prompt when they
 * say yes. Someone who taps "Not now" here has denied nothing, and the app can
 * ask again another day.
 */
export function LocationPrompt({ onDone }) {
  const { colors, radius } = useTheme();
  const { request, isRequesting } = useDeviceLocation();
  const [isVisible, setIsVisible] = useState(true);

  const save = useMutation({
    mutationFn: (coords) => usersApi.updateLocation(coords),
  });

  async function close(remember) {
    if (remember) await storage.setLocationAsked();
    setIsVisible(false);
    onDone?.();
  }

  async function allow() {
    const coords = await request();

    // Whatever the outcome, do not ask again on the next launch: a second
    // unprompted dialog is how an app becomes annoying, and the setting is
    // available in the profile screen either way.
    if (coords) {
      // Stored server-side so other people's nearby searches can find them —
      // being findable is the point, not just seeing others.
      await save.mutateAsync(coords).catch(() => undefined);
    }

    await close(true);
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={() => close(true)}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: '#00000088' }}>
        <View
          className="w-full items-center p-6"
          style={{ backgroundColor: colors.surface, borderRadius: radius + 10 }}
        >
          <Text style={{ fontSize: 44 }}>📍</Text>

          <Text className="mt-3 text-center text-xl font-bold" style={{ color: colors.textPrimary }}>
            Find people near you
          </Text>

          <Text
            className="mt-2 text-center text-sm leading-relaxed"
            style={{ color: colors.textSecondary }}
          >
            Share your location and we will show you who is chatting nearby, and put you in front of
            people in your area. You can turn this off any time in your profile.
          </Text>

          <View className="mt-5 w-full">
            <GradientButton
              title={isRequesting ? 'Just a moment…' : 'Allow location'}
              onPress={allow}
              isLoading={isRequesting}
            />
          </View>

          <Pressable
            onPress={() => close(true)}
            accessibilityRole="button"
            className="mt-1 w-full items-center py-3"
          >
            <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
              Not now
            </Text>
          </Pressable>

          <Text className="mt-1 text-center text-[11px]" style={{ color: colors.textMuted }}>
            We never show your exact position — only rough distance.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
