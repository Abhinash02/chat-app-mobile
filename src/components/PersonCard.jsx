import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from './ui.jsx';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const CARD_WIDTH = 156;
export const CARD_HEIGHT = 244;

/**
 * One person card in the horizontal discovery feed (Online Now / Browse Everyone).
 *
 * Engineered with explicit Android DPI font metric safe zones so text and bottom
 * action buttons never clip, freeze, or overflow on Android APK or Web.
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

  if (!person) return null;

  const isOnline = presence?.[person.id]?.isOnline ?? person.isOnline ?? false;
  const hasBio = Boolean(person.bio && person.bio.trim().length > 0);
  const ageLabel = person.ageGroup ? `Age ${person.ageGroup}` : null;
  const metaText = [ageLabel, person.city].filter(Boolean).join(' • ');
  const hasDistance =
    person.distanceKm !== null && person.distanceKm !== undefined && !isNaN(person.distanceKm);

  function handleCardPress() {
    if (person.id) {
      router.push(`/user/${person.id}`);
    }
  }

  function handleChatPress(e) {
    e?.stopPropagation?.();
    if (onPress) {
      onPress(person);
    } else if (person.id) {
      router.push(`/user/${person.id}`);
    }
  }

  const displayName = person.nickname || person.name || 'User';

  return (
    <Pressable
      onPress={handleCardPress}
      disabled={isOpening}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${displayName}${isOnline ? ', online now' : ''}`}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          height,
          backgroundColor: colors.surface,
          borderColor: isOnline ? `${colors.primary}55` : colors.border,
          shadowColor: isOnline ? colors.primary : '#000000',
          shadowOpacity: isOnline ? 0.16 : 0.06,
          elevation: isOnline ? 4 : 2,
          transform: [{ scale: pressed && !isOpening ? 0.97 : 1 }],
          opacity: isOpening ? 0.72 : 1,
        },
      ]}
    >
      {/* ── Online accent strip at top ── */}
      {isOnline && (
        <View
          style={[
            styles.onlineStrip,
            { backgroundColor: colors.primary },
          ]}
        />
      )}

      {/* ── Card body ── */}
      <View style={styles.body}>
        {/* --- Top section: avatar + name + status --- */}
        <View style={styles.topSection}>
          <Avatar
            uri={person.avatarUrl}
            name={displayName}
            gender={person.gender}
            emoji={person.avatarEmoji}
            color={person.avatarColor}
            size={56}
            isOnline={isOnline}
            showPresence
          />

          {/* Name */}
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.textPrimary }]}
          >
            {displayName}
          </Text>

          {/* Online / Seen badge */}
          {isOnline ? (
            <View
              style={[
                styles.onlineBadge,
                { backgroundColor: '#22c55e18', borderColor: '#22c55e35' },
              ]}
            >
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          ) : (
            <View
              style={[
                styles.seenBadge,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.seenText, { color: colors.textMuted }]}
              >
                {person.lastSeenAt
                  ? `Seen ${formatRelativeTime(person.lastSeenAt)}`
                  : 'Offline'}
              </Text>
            </View>
          )}
        </View>

        {/* --- Middle section: bio / location --- */}
        <View style={styles.bioArea}>
          {hasBio ? (
            <Text
              numberOfLines={2}
              style={[styles.bioText, { color: colors.textSecondary }]}
            >
              {person.bio}
            </Text>
          ) : null}

          {metaText ? (
            <Text
              numberOfLines={1}
              style={[
                styles.metaText,
                { color: hasBio ? colors.textMuted : colors.primary },
              ]}
            >
              {metaText}
            </Text>
          ) : !hasBio ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              ✨ Say hi
            </Text>
          ) : null}

          {hasDistance ? (
            <View
              style={[
                styles.distanceBadge,
                { backgroundColor: `${colors.primary}12` },
              ]}
            >
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                📍 {person.distanceKm} km away
              </Text>
            </View>
          ) : null}
        </View>

        {/* --- Chat button pinned at bottom --- */}
        <Pressable
          onPress={handleChatPress}
          style={({ pressed }) => [
            styles.chatBtn,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Text style={styles.chatEmoji}>💬</Text>
          <Text
            numberOfLines={1}
            style={[styles.chatLabel, { color: colors.onPrimary || '#FFFFFF' }]}
          >
            {isOpening ? 'Opening…' : actionLabel}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  onlineStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: 0.1,
    width: '100%',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 9.5,
    color: '#16a34a',
    fontWeight: '800',
  },
  seenBadge: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  seenText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  bioArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
    gap: 2,
  },
  bioText: {
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 12.5,
  },
  metaText: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  distanceBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    height: 32,
    borderRadius: 16,
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginTop: 4,
  },
  chatEmoji: {
    fontSize: 10,
  },
  chatLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
