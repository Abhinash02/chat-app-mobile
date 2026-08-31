import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar, Badge } from './ui.jsx';
import { formatDistance, formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * One person in the discovery feed.
 *
 * Tapping the card opens their public profile.
 * Tapping the bottom chat pill opens the chat directly.
 */
export const CARD_HEIGHT = 226;

export function PersonCard({
  person,
  presence,
  onPress,
  isOpening,
  width = 138,
  height = CARD_HEIGHT,
  actionLabel = 'Chat',
}) {
  const { colors, radius } = useTheme();

  const isOnline = presence?.[person.id]?.isOnline ?? person.isOnline;
  const distance = formatDistance(person.distanceKm);

  function handleCardPress() {
    router.push(`/user/${person.id}`);
  }

  function handleChatPress(e) {
    e?.stopPropagation?.();
    if (onPress) {
      onPress(person);
    } else {
      router.push(`/user/${person.id}`);
    }
  }

  return (
    <Pressable
      onPress={handleCardPress}
      disabled={isOpening}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${person.nickname}${isOnline ? ', online now' : ''}`}
      style={({ pressed }) => ({
        width,
        height,
        backgroundColor: colors.surface || '#FFFFFF',
        borderRadius: radius || 16,
        borderWidth: 1.5,
        borderColor: colors.border || '#F0D5E0',
        paddingHorizontal: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#1A0826',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        opacity: isOpening ? 0.6 : pressed ? 0.88 : 1,
        transform: [{ scale: pressed && !isOpening ? 0.98 : 1 }],
      })}
    >
      <View className="items-center" style={{ width: '100%' }}>
        <Avatar
          uri={person.avatarUrl}
          name={person.nickname}
          gender={person.gender}
          emoji={person.avatarEmoji}
          color={person.avatarColor}
          size={68}
          isOnline={isOnline}
          showPresence
        />

        <Text
          numberOfLines={1}
          className="mt-2 text-sm font-semibold text-center"
          style={{ color: colors.textPrimary, width: '100%' }}
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

        <View style={{ height: 28, justifyContent: 'center', marginTop: 4, width: '100%' }}>
          {person.bio ? (
            <Text
              numberOfLines={2}
              className="text-center text-[11px] leading-3.5"
              style={{ color: colors.textMuted }}
            >
              {person.bio}
            </Text>
          ) : null}
        </View>

        {person.ageGroup || person.zodiacSign || person.city ? (
          <Text
            numberOfLines={1}
            className="mt-1 text-[10px] text-center font-medium"
            style={{ color: colors.primary }}
          >
            {[person.ageGroup, person.zodiacSign, person.city].filter(Boolean).join(' • ')}
          </Text>
        ) : null}

        {distance ? (
          <View className="mt-1">
            <Badge label={`📍 ${distance}`} />
          </View>
        ) : null}
      </View>

      <View className="items-center" style={{ width: '100%' }}>
        <Pressable
          onPress={handleChatPress}
          className="flex-row items-center justify-center gap-1"
          style={{
            width: '90%',
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: isOnline ? colors.primary : colors.textSecondary,
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
        </Pressable>
      </View>
    </Pressable>
  );
}
