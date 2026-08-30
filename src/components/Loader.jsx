import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View, Platform } from 'react-native';

/**
 * react-native-web has no native animated module, so requesting the native
 * driver there logs a warning for every animation and falls back anyway.
 * On a real device this stays true, which is where it matters.
 */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * Three dots that rise and fall in sequence.
 *
 * Driven by the native driver, so the animation keeps running smoothly even
 * while the JavaScript thread is busy parsing the response we are waiting for —
 * which is exactly the moment a loader must not stutter.
 */
export function DotsLoader({ size = 10, color, gap = 6 }) {
  const { colors } = useTheme();
  // Lazy `useState` rather than a ref: these values are read during render to
  // build the transform, and reading a ref there is what React warns about.
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    const animations = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          // Staggering the start is what makes it read as a wave rather than
          // three dots blinking together.
          Animated.delay(index * 140),
          Animated.timing(value, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay((2 - index) * 140),
        ]),
      ),
    );

    Animated.parallel(animations).start();

    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View className="flex-row items-center" style={{ gap }} accessibilityLabel="Loading">
      {dots.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color ?? colors.primary,
            opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.7] }) },
              { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/**
 * A ring that spins and breathes, for waits long enough that dots feel static.
 */
export function PulseLoader({ size = 44 }) {
  const { colors } = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );

    rotation.start();
    breathing.start();

    return () => {
      rotation.stop();
      breathing.stop();
    };
  }, [spin, pulse]);

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.04] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
        }}
      />

      <Animated.View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          borderWidth: 3,
          borderColor: colors.primary,
          // A transparent top edge is what turns a circle into a spinner.
          borderTopColor: 'transparent',
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      />
    </View>
  );
}

/**
 * A shimmer sweeping across a placeholder block.
 *
 * Used for lists, where showing the shape of the content that is coming reads
 * as faster than a spinner even when the wait is identical.
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  const { colors } = useTheme();
  const [shimmer] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          width: '45%',
          height: '100%',
          backgroundColor: colors.border,
          opacity: 0.7,
          transform: [
            {
              translateX: shimmer.interpolate({
                inputRange: [0, 1],
                // Starts and ends off-block, so the sweep enters and leaves
                // rather than appearing in the middle.
                outputRange: [-160, 320],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

/** The shape of one discovery card, shown while the feed loads. */
export function PersonCardSkeleton() {
  const { colors, radius } = useTheme();

  return (
    <View
      className="mb-3 flex-1 items-center p-3"
      style={{ backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border }}
    >
      <Skeleton width={72} height={72} radius={36} />
      <Skeleton width="60%" height={12} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={9} style={{ marginTop: 10 }} />
    </View>
  );
}

/** Full-screen wait, with the app's own personality rather than a bare spinner. */
export function ScreenLoader({ label }) {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center gap-4 py-12">
      <PulseLoader />
      {label ? (
        <Text className="text-sm" style={{ color: colors.textMuted }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
