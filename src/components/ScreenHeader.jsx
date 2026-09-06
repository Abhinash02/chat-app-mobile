import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
 * The way out of a screen, as one control.
 *
 * `ScreenHeader` covers most screens, but several build their own header
 * because they need something the standard one cannot carry — a chat avatar, a
 * room's live state, a row of support tickets. Those were each drawing their
 * own back button, and they had drifted: a bare "&lsaquo;" glyph in a <Text> on three
 * screens, a circular "&larr;" on support, and chevrons at three different sizes
 * elsewhere. Same gesture, six different targets, some of them barely tappable.
 *
 * Exported separately so a custom header can use the real control instead of
 * approximating it.
 */
export function BackButton({
  fallback = '/(tabs)',
  variant = 'back',
  // 'onColor' for a header sitting on a filled accent block, where the default
  // surface treatment would read as a grey smudge. Same size and shape either
  // way — only the colours change, so the control stays recognisable.
  tone = 'default',
  onPress,
  style,
}) {
  const { colors } = useTheme();
  const handlePress = onPress ?? (() => goBack(fallback));
  const onColor = tone === 'onColor';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={variant === 'close' ? 'Close' : 'Go back'}
      // The visible square is 40x40; hitSlop takes the real target to 64x64,
      // which is what makes it comfortable at the top corner of a phone.
      hitSlop={12}
      className="h-10 w-10 items-center justify-center rounded-2xl border shadow-sm active:scale-95 transition"
      style={[
        {
          backgroundColor: onColor ? 'rgba(255,255,255,0.22)' : colors.surfaceAlt,
          borderColor: onColor ? 'rgba(255,255,255,0.35)' : colors.border,
        },
        style,
      ]}
    >
      <Ionicons
        name={variant === 'close' ? 'close' : 'arrow-back'}
        size={20}
        color={onColor ? '#FFFFFF' : colors.textPrimary}
      />
    </Pressable>
  );
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
  const { colors, fonts } = useTheme();
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
      <BackButton variant={variant} onPress={handlePress} />

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-lg font-bold"
          style={{ color: colors.textPrimary, fontFamily: fonts?.display }}
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
