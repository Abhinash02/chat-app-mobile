import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { CartoonAvatar } from './CartoonAvatar.jsx';
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

/**
 * A filled, gradient-backed button.
 *
 * `gradient` overrides the theme's brand pair with an explicit two-colour
 * array. It exists so a screen offering several actions of equal weight — the
 * payment methods, for one — can give each its own colour while keeping one
 * button shape. Left unset, the button stays on the admin-controlled brand
 * gradient, which is what every other caller wants.
 */
export function GradientButton({ title, onPress, isLoading, disabled, className = '', gradient }) {
  const { colors, radius } = useTheme();
  const isDisabled = disabled || isLoading;

  const fill =
    Array.isArray(gradient) && gradient.length >= 2
      ? gradient
      : [colors.gradientStart, colors.gradientEnd];

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
        colors={fill}
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
 * Two states, in priority order:
 *
 *   1. the uploaded photo, once there is one
 *   2. a gendered silhouette
 *
 * The silhouette is what WhatsApp and Instagram both settle on, and for the
 * same reason: it reads instantly as "no photo yet" at any size, where an
 * emoji reads as a deliberate choice the person made. It also renders
 * identically on every device — emoji do not, and the assigned face changed
 * character between Android versions.
 *
 * `emoji` and `color` are still accepted so the dozens of existing call sites
 * keep working unchanged; they are simply no longer drawn.
 */
export function Avatar({
  uri,
  gender,
  size = 48,
  // Which face this person wears. Same id, same expression, every render.
  seed,
  isOnline,
  showPresence = false,
  // Accepted and ignored. Every call site still passes these; taking them here
  // rather than deleting them everywhere keeps one change from touching forty
  // files, and leaves the door open if a photo-less identity is ever wanted
  // again.
  name: _name,
  emoji: _emoji,
  color: _color,
}) {
  const { colors } = useTheme();

  // Theme colour rather than a gendered pink/blue: the character carries the
  // distinction, so the tint is free to match the rest of the app.
  const genderTint = colors.primary;
  const dotSize = Math.max(10, size * 0.24);

  return (
    <View style={{ width: size, height: size }}>
      <View
        className="items-center justify-center overflow-hidden"
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${genderTint}1F` }}
      >
        {/* Drawn slightly larger than the circle and pinned to the bottom, so
            the character is cropped at the shoulders like a real portrait
            rather than floating in the middle with space under it. */}
        <CartoonAvatar gender={gender} seed={seed} size={size} />

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
