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
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  disabled = false,
  icon,
  className = '',
  style,
}) {
  const { colors, radius } = useTheme();

  const primaryBg = colors?.primary || '#FF4E88';
  const primaryText = colors?.onPrimary || '#FFFFFF';
  const textPri = colors?.textPrimary || '#1B1024';
  const textSec = colors?.textSecondary || '#5C4A63';
  const surfAlt = colors?.surfaceAlt || '#FDEDF3';
  const borderColor = colors?.border || '#F3D7E2';
  const dangerColor = colors?.danger || '#F5325B';

  const palettes = {
    primary: { background: primaryBg, text: primaryText, border: 'transparent' },
    brand: { background: primaryBg, text: primaryText, border: 'transparent' },
    secondary: { background: surfAlt, text: textPri, border: 'transparent' },
    outline: { background: 'transparent', text: textPri, border: borderColor },
    ghost: { background: 'transparent', text: textSec, border: 'transparent' },
    danger: { background: dangerColor, text: '#FFFFFF', border: 'transparent' },
  };

  const palette = palettes[variant] || palettes.primary;

  const sizing = {
    sm: 'px-3.5 py-2',
    md: 'px-5 py-3.5',
    lg: 'px-6 py-4',
  }[size] || 'px-5 py-3.5';

  const isBusy = isLoading || loading;
  const isDisabled = disabled || isBusy;
  const buttonLabel = title || children;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={typeof buttonLabel === 'string' ? buttonLabel : 'Button'}
      accessibilityState={{ disabled: isDisabled, busy: isBusy }}
      className={`flex-row items-center justify-center gap-2 ${sizing} ${className}`}
      style={({ pressed }) => [
        {
          backgroundColor: palette.background,
          borderRadius: radius,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {isBusy ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {icon ? <Text className="text-base">{icon}</Text> : null}
          {typeof buttonLabel === 'string' ? (
            <Text
              className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'}`}
              style={{ color: palette.text }}
            >
              {buttonLabel}
            </Text>
          ) : (
            buttonLabel
          )}
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

export function Badge({
  label,
  children,
  tone,
  variant = 'neutral',
  size = 'md',
  className = '',
  style,
}) {
  const { colors } = useTheme();
  const currentTone = tone || variant || 'neutral';

  const badgeColors = {
    neutral: { bg: colors.surfaceAlt || '#F3F4F6', text: colors.textSecondary || '#6B7280' },
    purple: { bg: '#8B5CF622', text: '#8B5CF6' },
    pending: { bg: '#8B5CF622', text: '#8B5CF6' },
    open: { bg: '#F59E0B22', text: '#D97706' },
    in_progress: { bg: `${colors.primary || '#FF4E88'}22`, text: colors.primary || '#FF4E88' },
    warning: { bg: `${colors.warning || '#F59E0B'}22`, text: colors.warning || '#F59E0B' },
    success: { bg: `${colors.success || '#22C55E'}22`, text: colors.success || '#16A34A' },
    danger: { bg: `${colors.danger || '#EF4444'}22`, text: colors.danger || '#EF4444' },
    brand: { bg: `${colors.primary || '#FF4E88'}22`, text: colors.primary || '#FF4E88' },
  };

  const selected = badgeColors[currentTone] || badgeColors.neutral;
  const content = label || children;

  return (
    <View
      className={`rounded-full items-center justify-center ${className}`}
      style={[{ backgroundColor: selected.bg }, style]}
    >
      <Text
        className={`font-bold uppercase tracking-wider ${
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
        }`}
        style={{ color: selected.text }}
      >
        {content}
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

export { CoinIcon } from './CoinIcon.jsx';
