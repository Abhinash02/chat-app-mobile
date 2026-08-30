import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * A nudge to finish email verification.
 *
 * Deliberately a banner rather than a gate. Signup signs the user straight in,
 * so this must not block anything they came to do — and someone whose code
 * never arrived would otherwise be stuck outside their own account.
 *
 * Dismissal is per-session on purpose: it should stop nagging within a sitting
 * but return next launch, because the account really is unverified.
 */
export function VerifyBanner() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || user?.status !== 'pending_verification') return null;

  return (
    <View
      className="mb-4 flex-row items-center gap-3 p-3.5"
      style={{
        backgroundColor: `${colors.warning}1A`,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: `${colors.warning}55`,
      }}
    >
      <Text style={{ fontSize: 18 }}>✉️</Text>

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
          Confirm your email
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          Others cannot find you until you do.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/(auth)/verify', params: { email: user.email } })}
        accessibilityRole="button"
        className="px-3.5 py-2"
        style={{ backgroundColor: colors.primary, borderRadius: radius }}
      >
        <Text className="text-xs font-bold" style={{ color: colors.onPrimary }}>
          Verify
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setIsDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={10}
        className="px-1"
      >
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}
