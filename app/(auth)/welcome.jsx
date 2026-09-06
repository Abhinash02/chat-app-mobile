import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WelcomeMarquee } from '../../src/components/WelcomeMarquee.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

/**
 * The first screen of the app.
 *
 * Composed as a title page over a moving wall rather than a coloured banner
 * with a logo tile on it. The drifting tiles sit behind the words and run off
 * the top of the screen, so the eye lands on the name and then notices there is
 * something alive underneath — which is the impression the screen is for.
 *
 * No gradient, no glass, no emoji bullets. The type does the work and the
 * accent appears exactly twice: a short rule under the name, and the one button
 * this screen exists for.
 */
export default function Welcome() {
  const { colors, branding, fonts } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── The moving wall ──
          Bleeds off the top edge and is cropped by the copy below it, so it
          reads as a glimpse of something larger rather than a contained
          decorative panel. */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -18,
          left: 90,
          height: 460,
        }}
        pointerEvents="none"
      >
        <WelcomeMarquee height={460} />
      </View>

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 26,
          paddingHorizontal: 26,
          justifyContent: 'flex-end',
        }}
      >
        {/* Sits on the background rather than in a card, and is opaque so the
            drifting tiles pass behind it cleanly instead of showing through. */}
        <View style={{ backgroundColor: colors.background, paddingTop: 26 }}>
          <Text
            style={{
              fontSize: 12.5,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              color: colors.textMuted,
            }}
          >
            {branding?.tagline || 'Say hi to someone new'}
          </Text>

          <Text
            style={{
              marginTop: 14,
              fontSize: 58,
              lineHeight: 62,
              letterSpacing: -1.8,
              color: colors.textPrimary,
              fontFamily: fonts?.display,
            }}
          >
            {branding?.appName || 'Vibe'}
          </Text>

          {/* Narrower than the word on purpose — a full-width line would read
              as a divider rather than as a mark. */}
          <View
            style={{
              height: 3,
              width: 46,
              marginTop: 12,
              backgroundColor: colors.primary,
            }}
          />

          <Text
            style={{
              marginTop: 22,
              fontSize: 16.5,
              lineHeight: 25,
              color: colors.textSecondary,
              maxWidth: 290,
            }}
          >
            Somewhere to meet people who are actually free to talk right now.
            Voice rooms, quick games, and thirty minutes free to start.
          </Text>

          {/* ── Actions ──
              One solid button for what the screen is for, plain text for the
              other. Two filled buttons would make neither of them the answer to
              "what do I do here". */}
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="button"
            accessibilityLabel="Create an account"
            style={({ pressed }) => ({
              marginTop: 34,
              backgroundColor: colors.primary,
              paddingVertical: 17,
              alignItems: 'center',
              borderRadius: 6,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text
              style={{
                color: colors.onPrimary,
                fontSize: 15.5,
                letterSpacing: 0.2,
                fontWeight: '600',
              }}
            >
              Create an account
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={10}
            style={({ pressed }) => ({
              marginTop: 20,
              alignSelf: 'center',
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Text style={{ fontSize: 14.5, color: colors.textPrimary }}>
              I already have an account
            </Text>
          </Pressable>

          <Text
            style={{
              marginTop: 26,
              fontSize: 11.5,
              lineHeight: 17,
              color: colors.textMuted,
              maxWidth: 290,
            }}
          >
            By continuing you agree to chat respectfully. Reports are reviewed and accounts can be
            suspended.
          </Text>
        </View>
      </View>
    </View>
  );
}
