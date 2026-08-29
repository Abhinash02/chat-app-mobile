import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient } from '../../src/components/Gradient.jsx';
import { Button, GradientButton } from '../../src/components/ui.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

export default function Welcome() {
  const { colors, branding } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Gradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        className="flex-1 items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <View
          className="h-24 w-24 items-center justify-center rounded-[32px]"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <Text className="text-5xl">💬</Text>
        </View>

        <Text className="mt-6 text-4xl font-bold" style={{ color: colors.onPrimary }}>
          {branding.appName}
        </Text>
        <Text
          className="mt-2 text-center text-base"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          {branding.tagline}
        </Text>
      </Gradient>

      <View className="px-6 pt-8" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="mb-7 gap-3">
          {[
            { emoji: '👋', text: 'Tap a profile and we send the first hello for you' },
            { emoji: '⏱️', text: '30 minutes of free chatting to get started' },
            { emoji: '🎙️', text: 'Free voice rooms and quick games with everyone' },
          ].map((item) => (
            <View key={item.text} className="flex-row items-center gap-3">
              <Text className="text-xl">{item.emoji}</Text>
              <Text className="flex-1 text-sm" style={{ color: colors.textSecondary }}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        <GradientButton title="Create an account" onPress={() => router.push('/(auth)/register')} />

        <Button
          title="I already have an account"
          variant="ghost"
          className="mt-2"
          onPress={() => router.push('/(auth)/login')}
        />

        <Text className="mt-5 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
          By continuing you agree to chat respectfully. Reports are reviewed and accounts can be
          suspended.
        </Text>
      </View>
    </View>
  );
}
