import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * What the app is for, said in the first three seconds.
 *
 * A sign-in screen is often the first thing a new install shows, and a bare
 * email field says nothing about why anyone should fill it in. These rotate so
 * the answer arrives without needing a paragraph nobody would read.
 */
const QUOTES = [
  { icon: 'chatbubbles', text: 'Real people, real conversations — no bots, no noise.' },
  { icon: 'language', text: 'Talk in your language — Hindi, Punjabi, Marathi and more.' },
  { icon: 'mic', text: 'Live voice rooms. Drop in, say hello, stay a while.' },
  { icon: 'sparkles', text: 'Every great connection begins with a simple hello.' },
  { icon: 'game-controller', text: 'Play games, earn coins, meet someone new.' },
];

const ROTATE_MS = 3600;
const FADE_MS = 420;

/**
 * The branded top of the auth screens.
 *
 * Shared by sign-in and sign-up so the two read as one product rather than two
 * forms that happen to be in the same app.
 */
export function AuthHero({ title, subtitle, onBack, compact = false }) {
  const { colors, branding, fonts } = useTheme();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);

  /*
   * Two values rather than one: opacity carries the fade, translateY gives the
   * line a small lift so it reads as the next thing arriving instead of the
   * same line flickering.
   *
   * Held in state with a lazy initialiser rather than the usual
   * `useRef(new Animated.Value()).current`. Both create the value exactly
   * once, but reading `.current` during render is what the React Compiler
   * lint rejects — and it is right to: a ref read in the render path is the
   * shape of a bug even when this particular use is benign.
   */
  const [fade] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // A single quote has nothing to rotate to; animating it would be motion
    // for its own sake.
    if (QUOTES.length < 2) return undefined;

    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(lift, { toValue: -8, duration: FADE_MS, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (!finished) return;

        setIndex((current) => (current + 1) % QUOTES.length);
        lift.setValue(8);

        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
          Animated.timing(lift, {
            toValue: 0,
            duration: FADE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [fade, lift]);

  const quote = QUOTES[index];
  const appName = branding?.appName || 'Vibe';

  return (
    <LinearGradient
      colors={[
        colors.gradientStart || colors.primary,
        colors.gradientEnd || colors.secondary || colors.primary,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + 14,
        paddingHorizontal: 22,
        paddingBottom: compact ? 26 : 34,
        // Only the bottom is rounded: the gradient runs off the top of the
        // screen, so rounding there would leave two slivers of background.
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.18)',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={15} color="#FFFFFF" />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>Back</Text>
        </Pressable>
      ) : null}

      {/* ── Brand mark ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: onBack ? 18 : 4 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.22)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.35)',
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={23} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 21,
              fontWeight: '900',
              letterSpacing: -0.4,
              color: '#FFFFFF',
              fontFamily: fonts?.display,
            }}
          >
            {appName}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>
            {branding?.tagline || 'Say hi to someone new'}
          </Text>
        </View>
      </View>

      {/* ── Screen title ── */}
      <Text
        style={{
          marginTop: compact ? 18 : 24,
          fontSize: compact ? 25 : 29,
          fontWeight: '900',
          letterSpacing: -0.8,
          color: '#FFFFFF',
          fontFamily: fonts?.display,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ marginTop: 5, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.88)' }}>
          {subtitle}
        </Text>
      ) : null}

      {/* ── Rotating quote ── */}
      <Animated.View
        style={{
          marginTop: compact ? 16 : 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingVertical: 11,
          paddingHorizontal: 13,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.16)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.22)',
          opacity: fade,
          transform: [{ translateY: lift }],
        }}
      >
        <Ionicons name={quote.icon} size={16} color="#FFFFFF" />
        <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '600', color: '#FFFFFF' }}>
          {quote.text}
        </Text>
      </Animated.View>

      {/* Which of the lines is showing. Non-interactive — it is a position
          indicator, not a control, so it takes no touch target. */}
      <View
        style={{ flexDirection: 'row', gap: 5, marginTop: 11, justifyContent: 'center' }}
        pointerEvents="none"
      >
        {QUOTES.map((entry, position) => (
          <View
            key={entry.text}
            style={{
              width: position === index ? 15 : 5,
              height: 5,
              borderRadius: 3,
              backgroundColor:
                position === index ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
            }}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

export default AuthHero;
