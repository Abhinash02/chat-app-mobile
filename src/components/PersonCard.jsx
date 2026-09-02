import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from './ui.jsx';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 230;

/**
 * One person card in the horizontal discovery feed.
 * Engineered to match EndCard's solid box styling with uniform height and zero UI breakdown.
 */
export function PersonCard({
  person,
  presence,
  onPress,
  isOpening,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  actionLabel = 'Chat',
}) {
  const { colors } = useTheme();

  const isOnline = presence?.[person.id]?.isOnline ?? person.isOnline;
  const hasBio = Boolean(person.bio?.trim());
  const metaText = [person.ageGroup, person.zodiacSign, person.city].filter(Boolean).join(' • ');

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
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: isOnline ? colors.primary : '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isOnline ? 0.16 : 0.08,
        shadowRadius: 12,
        elevation: isOnline ? 4 : 2,
        transform: [{ scale: pressed && !isOpening ? 0.97 : 1 }],
        opacity: isOpening ? 0.7 : 1,
      })}
    >
      {/* 1. Solid Background Container */}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: colors.surface,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: isOnline ? `${colors.primary}45` : colors.border,
        }}
      />

      {/* 2. Top-Left Soft Glow Blob */}
      <View
        style={{
          position: 'absolute',
          top: -15,
          left: -15,
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: isOnline ? `${colors.primary}15` : `${colors.border}30`,
        }}
      />

      {/* 3. Online Strip Indicator */}
      {isOnline && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3.5,
            backgroundColor: colors.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        />
      )}

      {/* 4. Card Content */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          paddingTop: 14,
          paddingBottom: 12,
        }}
      >
        {/* Top Details (Avatar + Name + Status + Bio) */}
        <View style={{ alignItems: 'center', width: '100%' }}>
          {/* Avatar with Presence Indicator */}
          <Avatar
            uri={person.avatarUrl}
            name={person.nickname}
            gender={person.gender}
            emoji={person.avatarEmoji}
            color={person.avatarColor}
            size={60}
            isOnline={isOnline}
            showPresence
          />

          {/* Name */}
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: '800',
              marginTop: 6,
              textAlign: 'center',
              width: '100%',
              letterSpacing: 0.1,
            }}
          >
            {person.nickname}
          </Text>

          {/* Online / Offline Status Badge */}
          {isOnline ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: 3,
                paddingHorizontal: 7,
                paddingVertical: 1.5,
                borderRadius: 10,
                backgroundColor: '#22c55e15',
                borderWidth: 1,
                borderColor: '#22c55e30',
              }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' }} />
              <Text style={{ fontSize: 9.5, color: '#16a34a', fontWeight: '800' }}>Online now</Text>
            </View>
          ) : (
            <View
              style={{
                marginTop: 3,
                paddingHorizontal: 6,
                paddingVertical: 1.5,
                borderRadius: 10,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text
                style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}
                numberOfLines={1}
              >
                {person.lastSeenAt ? `Seen ${formatRelativeTime(person.lastSeenAt)} ago` : 'Offline'}
              </Text>
            </View>
          )}

          {/* Bio / Meta Section — Fixed Height Container (no jumping heights) */}
          <View
            style={{
              height: 28,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              marginTop: 4,
            }}
          >
            {hasBio ? (
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 9.5,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 13,
                }}
              >
                {person.bio}
              </Text>
            ) : metaText ? (
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9.5,
                  color: colors.primary,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {metaText}
              </Text>
            ) : (
              <Text
                style={{
                  fontSize: 9,
                  color: colors.textMuted,
                  fontStyle: 'italic',
                }}
              >
                ✨ Say hi
              </Text>
            )}
          </View>
        </View>

        {/* 5. Solid Primary Chat Button (Always Pinned at Bottom) */}
        <Pressable
          onPress={handleChatPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            width: '100%',
            height: 33,
            borderRadius: 16.5,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ fontSize: 11 }}>💬</Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11.5,
              fontWeight: '800',
              color: colors.onPrimary || '#FFFFFF',
              letterSpacing: 0.2,
            }}
          >
            {isOpening ? 'Opening…' : actionLabel}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
