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
export const CARD_HEIGHT = 210;

export function PersonCard({
  person,
  presence,
  onPress,
  isOpening,
  width = 155,
  height = CARD_HEIGHT,
  actionLabel = 'Chat',
}) {
  const { colors, radius } = useTheme();

  const isOnline = presence?.[person.id]?.isOnline ?? person.isOnline;
  const distance = formatDistance(person.distanceKm);
  const hasBio = Boolean(person.bio?.trim());
  const hasMeta = Boolean(person.ageGroup || person.zodiacSign || person.city);

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
        backgroundColor: colors.surface || '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: isOnline ? `${colors.primary}55` : (colors.border || '#F0D5E0'),
        padding: 12,
        alignItems: 'center',
        shadowColor: isOnline ? colors.primary : '#1A0826',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isOnline ? 0.15 : 0.08,
        shadowRadius: 10,
        elevation: isOnline ? 4 : 2,
        opacity: isOpening ? 0.6 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed && !isOpening ? 0.97 : 1 }],
      })}
    >
      {/* Online Indicator Strip at top */}
      {isOnline && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: colors.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            opacity: 0.8,
          }}
        />
      )}

      {/* Avatar */}
      <Avatar
        uri={person.avatarUrl}
        name={person.nickname}
        gender={person.gender}
        emoji={person.avatarEmoji}
        color={person.avatarColor}
        size={64}
        isOnline={isOnline}
        showPresence
      />

      {/* Name */}
      <Text
        numberOfLines={1}
        style={{
          color: colors.textPrimary,
          fontSize: 13,
          fontWeight: '700',
          marginTop: 8,
          textAlign: 'center',
          width: '100%',
        }}
      >
        {person.nickname}
      </Text>

      {/* Online / Offline status */}
      {isOnline ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
          <Text style={{ fontSize: 10, color: '#22c55e', fontWeight: '600' }}>Online now</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
          {person.lastSeenAt ? `Seen ${formatRelativeTime(person.lastSeenAt)} ago` : 'Offline'}
        </Text>
      )}

      {/* Bio — only shown if set */}
      {hasBio && (
        <Text
          numberOfLines={2}
          style={{
            fontSize: 10,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 4,
            lineHeight: 14,
          }}
        >
          {person.bio}
        </Text>
      )}

      {/* Age / Zodiac / City — only shown if available */}
      {hasMeta && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 9,
            color: colors.primary,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: hasBio ? 2 : 4,
          }}
        >
          {[person.ageGroup, person.zodiacSign, person.city].filter(Boolean).join(' • ')}
        </Text>
      )}

      {/* Distance badge */}
      {distance ? (
        <View style={{ marginTop: 3 }}>
          <Badge label={`📍 ${distance}`} />
        </View>
      ) : null}

      {/* Chat Button — always pinned at bottom with proper spacing */}
      <Pressable
        onPress={handleChatPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: '100%',
          paddingVertical: 7,
          borderRadius: 999,
          marginTop: 10,
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Text style={{ fontSize: 11 }}>💬</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.onPrimary || '#FFF' }}>
          {isOpening ? 'Opening…' : actionLabel}
        </Text>
      </Pressable>
    </Pressable>
  );
}
