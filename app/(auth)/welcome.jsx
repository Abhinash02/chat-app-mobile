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

          {/* ── Actions ── */}
          <View style={{ marginTop: 32, gap: 12 }}>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              style={({ pressed }) => ({
                backgroundColor: colors.primary || '#06B6D4',
                paddingVertical: 16,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius || 14,
                shadowColor: colors.primary || '#06B6D4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 10,
                elevation: 4,
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  letterSpacing: 0.3,
                  fontWeight: '700',
                }}
              >
                ✨ Create an account
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="I already have an account"
              style={({ pressed }) => ({
                backgroundColor: colors.surfaceAlt || '#ECFAFC',
                borderWidth: 1.5,
                borderColor: colors.border || '#D7EEF3',
                paddingVertical: 15,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius || 14,
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15.5,
                  fontWeight: '700',
                  color: colors.primary || '#0891B2',
                  letterSpacing: 0.2,
                }}
              >
                I already have an account
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              marginTop: 22,
              fontSize: 11.5,
              lineHeight: 17,
              color: colors.textMuted || '#8AA5AD',
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
