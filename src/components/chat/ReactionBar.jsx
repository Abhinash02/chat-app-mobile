import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/** Mirrors the server's list; anything else is refused. */
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

/**
 * The row of reactions offered on a long press.
 *
 * The one already chosen is highlighted, because tapping it again is how you
 * take it back — without that, the only clue that a second tap removes rather
 * than adds is trying it.
 */
export function ReactionPicker({ current, onPick }) {
  const { colors, radius } = useTheme();

  return (
    <View
      className="flex-row items-center justify-center gap-1 px-2 py-2"
      style={{ backgroundColor: colors.surface, borderRadius: radius * 3 }}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onPick(emoji)}
          accessibilityRole="button"
          accessibilityLabel={`React with ${emoji}`}
          accessibilityState={{ selected: emoji === current }}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: emoji === current ? colors.surfaceAlt : 'transparent' }}
        >
          <Text className="text-2xl">{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The little chip under a bubble showing what was reacted.
 *
 * It overlaps the bubble's bottom edge so it reads as attached to that message
 * rather than floating between two of them.
 */
export function ReactionChips({ reactions, isMine, onPress }) {
  const { colors } = useTheme();

  if (!reactions?.length) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change your reaction"
      className={`-mt-1.5 flex-row items-center gap-0.5 px-2 py-0.5 ${isMine ? 'self-end' : 'self-start'}`}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: isMine ? 6 : 0,
        marginLeft: isMine ? 0 : 6,
      }}
    >
      {reactions.map((reaction) => (
        <View key={reaction.emoji} className="flex-row items-center">
          <Text style={{ fontSize: 12 }}>{reaction.emoji}</Text>
          {reaction.count > 1 ? (
            <Text className="ml-0.5 text-[10px]" style={{ color: colors.textSecondary }}>
              {reaction.count}
            </Text>
          ) : null}
        </View>
      ))}
    </Pressable>
  );
}
