import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { Gradient } from './Gradient.jsx';
import { ScreenLoader } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * Shared primitives.
 *
 * Layout, spacing and type come from Tailwind classes; every colour comes from
 * the theme context and is applied with `style`, because the palette is chosen
 * by an administrator at runtime and cannot exist as a build-time class name.
 */

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  className = '',
  style,
}) {
  const { colors, radius } = useTheme();

  const palette = {
    primary: { background: colors.primary, text: colors.onPrimary, border: 'transparent' },
    secondary: { background: colors.surfaceAlt, text: colors.textPrimary, border: 'transparent' },
    outline: { background: 'transparent', text: colors.textPrimary, border: colors.border },
    ghost: { background: 'transparent', text: colors.textSecondary, border: 'transparent' },
    danger: { background: colors.danger, text: '#FFFFFF', border: 'transparent' },
  }[variant];

  const sizing = {
    sm: 'px-3.5 py-2',
    md: 'px-5 py-3.5',
    lg: 'px-6 py-4',
  }[size];

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      className={`flex-row items-center justify-center gap-2 ${sizing} ${className}`}
      style={({ pressed }) => [
        {
          backgroundColor: palette.background,
          borderRadius: radius,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          // A pressed button should feel like it moved, not just dimmed.
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {icon ? <Text className="text-base">{icon}</Text> : null}
          <Text
            className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'}`}
            style={{ color: palette.text }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function GradientButton({ title, onPress, isLoading, disabled, className = '' }) {
  const { colors, radius } = useTheme();
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={className}
      style={({ pressed }) => ({ opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 })}
    >
      <Gradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius }}
        className="flex-row items-center justify-center px-6 py-4"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text className="text-base font-semibold" style={{ color: colors.onPrimary }}>
            {title}
          </Text>
        )}
      </Gradient>
    </Pressable>
  );
}

export function Field({ label, error, hint, children }) {
  const { colors } = useTheme();

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
      ) : null}
      {children}
      {/* Hint and error share one slot: showing both buries the actionable one. */}
      {error ? (
        <Text className="mt-1.5 text-xs" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs" style={{ color: colors.textMuted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Input({ invalid = false, style, ...props }) {
  const { colors, radius } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      className="px-4 py-3.5 text-base"
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: invalid ? colors.danger : colors.border,
          color: colors.textPrimary,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Card({ children, className = '', style }) {
  const { colors, radius } = useTheme();

  return (
    <View
      className={`p-4 ${className}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Three states, in priority order:
 *
 *   1. the uploaded photo, once there is one
 *   2. the emoji assigned at signup, which every account has
 *   3. initials, for accounts that predate the emoji or came from a lean
 *      payload that did not include it
 *
 * The emoji sits underneath the photo rather than beside it, so a URL that
 * fails to load reveals the emoji instead of leaving an empty circle.
 */
export function Avatar({
  uri,
  name = '',
  gender,
  emoji,
  color,
  size = 48,
  isOnline,
  showPresence = false,
}) {
  const { colors } = useTheme();

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const genderTint = gender === 'female' ? colors.femaleAccent : colors.maleAccent;
  const background = emoji ? (color ?? genderTint) : `${genderTint}22`;
  const dotSize = Math.max(10, size * 0.24);

  return (
    <View style={{ width: size, height: size }}>
      <View
        className="items-center justify-center overflow-hidden"
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background }}
      >
        {emoji ? (
          <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
        ) : (
          <Text style={{ color: genderTint, fontSize: size * 0.36, fontWeight: '700' }}>
            {initials}
          </Text>
        )}

        {uri ? (
          <Image
            source={{ uri }}
            style={{ position: 'absolute', width: size, height: size }}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
            recyclingKey={uri}
          />
        ) : null}
      </View>

      {showPresence ? (
        <View
          accessibilityLabel={isOnline ? 'Online' : 'Offline'}
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: isOnline ? colors.onlineDot : colors.offlineDot,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', className = '' }) {
  const { colors } = useTheme();

  const background = {
    neutral: colors.surfaceAlt,
    success: `${colors.success}22`,
    warning: `${colors.warning}22`,
    danger: `${colors.danger}22`,
    brand: `${colors.primary}22`,
  }[tone];

  const text = {
    neutral: colors.textSecondary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    brand: colors.primary,
  }[tone];

  return (
    <View className={`rounded-full px-2.5 py-1 ${className}`} style={{ backgroundColor: background }}>
      <Text className="text-xs font-semibold" style={{ color: text }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The app-wide loading state.
 *
 * Re-exported from `Loader.jsx` so every screen already importing `Loading`
 * picks up the animated version without a change at the call site.
 */
export function Loading({ label }) {
  return <ScreenLoader label={label} />;
}

export function EmptyState({ emoji = '✨', title, description, action }) {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="mb-3 text-4xl">{emoji}</Text>
      <Text className="text-center text-base font-semibold" style={{ color: colors.textPrimary }}>
        {title}
      </Text>
      {description ? (
        <Text className="mt-1.5 text-center text-sm leading-5" style={{ color: colors.textMuted }}>
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
