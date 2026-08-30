import { Pressable, Text, View } from 'react-native';

import { Avatar, Badge } from './ui.jsx';
import { formatDistance, formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * One person in the discovery feed.
 *
 * Shared by the home row and the full browse screen so the two cannot drift —
 * a card that looks different depending on where you found it undermines the
 * sense that they are the same person.
 */
export function PersonCard({
  person,
  presence,
  onPress,
  isOpening,
  width = 132,
  // "Say hi" where the row is about starting something, "Chat" where it is
  // about browsing. Same action, different framing.
  actionLabel = 'Chat',
}) {
  const { colors, radius } = useTheme();

  // Socket presence overrides the value the list was fetched with, so the dot
  // is right even on a feed loaded minutes ago.
  const isOnline = presence?.[person.id]?.isOnline ?? person.isOnline;
  const distance = formatDistance(person.distanceKm);

  return (
    <Pressable
      onPress={onPress}
      disabled={isOpening}
      accessibilityRole="button"
      accessibilityLabel={`Say hi to ${person.nickname}${isOnline ? ', online now' : ''}`}
      className="p-3"
      style={({ pressed }) => ({
        width,
        backgroundColor: colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: isOpening ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View className="items-center">
        <Avatar
          uri={person.avatarUrl}
          name={person.nickname}
          gender={person.gender}
          emoji={person.avatarEmoji}
          color={person.avatarColor}
          size={72}
          isOnline={isOnline}
          showPresence
        />

        <Text
          numberOfLines={1}
          className="mt-2.5 text-sm font-semibold"
          style={{ color: colors.textPrimary }}
        >
          {person.nickname}
        </Text>

        {isOnline ? (
          <Text className="mt-0.5 text-[11px] font-medium" style={{ color: colors.onlineDot }}>
            Online now
          </Text>
        ) : (
          <Text className="mt-0.5 text-[11px]" style={{ color: colors.textMuted }}>
            {person.lastSeenAt ? `Seen ${formatRelativeTime(person.lastSeenAt)} ago` : 'Offline'}
          </Text>
        )}

        {person.bio ? (
          <Text
            numberOfLines={2}
            className="mt-1.5 text-center text-[11px] leading-4"
            style={{ color: colors.textMuted }}
          >
            {person.bio}
          </Text>
        ) : null}

        {distance ? (
          <View className="mt-2">
            <Badge label={`📍 ${distance}`} />
          </View>
        ) : null}
      </View>

      {/*
        * Filled, not outlined: on a card the eye lands on the face first, and
        * a tinted outline was quiet enough to be missed. Solid brand colour
        * makes the action unmissable while the pill stays small enough not to
        * become the card's footer.
        *
        * Offline uses the ink tone rather than the brand — the action still
        * works, but it should not compete with the people who are here now.
        */}
      <View className="mt-2.5 items-center">
        <View
          className="flex-row items-center gap-1"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: isOnline ? colors.primary : colors.textSecondary,
            // A little lift, so the pill reads as sitting on the card rather
            // than printed into it.
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.18,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 10 }}>💬</Text>
          <Text className="text-[11px] font-bold" style={{ color: colors.onPrimary }}>
            {isOpening ? 'Opening' : actionLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
