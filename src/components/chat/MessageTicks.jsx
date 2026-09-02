import { Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * How far a message has got, in the shorthand everyone already reads.
 *
 *   ✓    sent      written down; their device has not acknowledged it
 *   ✓✓   delivered it reached them
 *   ✓✓   read      they opened it — the same pair, in blue
 *
 * Drawn as two overlapping ticks rather than a "✓✓" glyph because no single
 * character renders consistently across platforms, and the spacing is what
 * makes the pair legible at ten pixels.
 */
export function MessageTicks({ state, tint }) {
  const { colors } = useTheme();

  if (state === 'sending') {
    return (
      <View
        className="flex-row items-center"
        accessibilityRole="image"
        accessibilityLabel="Sending…"
        style={{ width: 12 }}
      >
        <Text style={{ color: tint ?? colors.textMuted, fontSize: 9, lineHeight: 11 }}>🕒</Text>
      </View>
    );
  }

  const isRead = state === 'read';
  const isPair = state === 'delivered' || isRead;
  const color = isRead ? '#0EA5E9' : (tint ?? colors.textMuted);

  return (
    <View
      className="flex-row items-center"
      accessibilityRole="image"
      accessibilityLabel={isRead ? 'Read' : state === 'delivered' ? 'Delivered' : 'Sent'}
      style={{ width: isPair ? 15 : 10 }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: isRead ? '700' : '500', lineHeight: 13 }}>✓</Text>
      {isPair ? (
        <Text style={{ color, fontSize: 11, fontWeight: isRead ? '700' : '500', lineHeight: 13, marginLeft: -4.5 }}>
          ✓
        </Text>
      ) : null}
    </View>
  );
}
