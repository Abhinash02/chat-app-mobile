import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * Leaves the current screen, always.
 *
 * `router.back()` alone does nothing when there is no history to go back to —
 * which happens on a web reload, on a deep link, and after a notification tap.
 * The user is then stuck on a screen with a dead back button, so this falls
 * through to the home tab rather than silently doing nothing.
 */
export function goBack(fallback = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

/**
 * Header for any screen pushed outside the tab bar.
 *
 * Every such screen needs a way out, and having one component means a new
 * screen cannot accidentally ship without one.
 */
export function ScreenHeader({
  title,
  subtitle,
  right,
  fallback = '/(tabs)',
  variant = 'back',
  onClose,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = onClose ?? (() => goBack(fallback));

  return (
    <View
      className="flex-row items-center gap-3 px-4 pb-3"
      style={{
        paddingTop: insets.top + 8,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={variant === 'close' ? 'Close' : 'Go back'}
        // A generous hit area: this is the control people reach for most, and
        // a 24px glyph is an unkind target on a phone.
        hitSlop={12}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.surfaceAlt }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 18, lineHeight: 22 }}>
          {variant === 'close' ? '✕' : '‹'}
        </Text>
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-lg font-bold"
          style={{ color: colors.textPrimary }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="text-xs" style={{ color: colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? null}
    </View>
  );
}
