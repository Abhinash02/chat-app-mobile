import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from './ui.jsx';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 232;

/**
 * One person card in the horizontal discovery feed.
 *
 * ✅  APK + Web safe — zero use of CSS-only properties like `inset: 0`.
 *     All positioning uses explicit top/right/bottom/left values.
 *     Fixed dimensions guarantee the card never collapses in native builds.
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
  const ageLabel = person.ageGroup ? `Age ${person.ageGroup}` : null;
  const metaText = [ageLabel, person.city].filter(Boolean).join(' • ');
  const hasDistance =
    person.distanceKm !== null && person.distanceKm !== undefined;

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
      style={({ pressed }) => [
        styles.card,
        {
          width,
          height,
          backgroundColor: colors.surface,
          borderColor: isOnline ? `${colors.primary}50` : colors.border,
          shadowColor: isOnline ? colors.primary : '#000000',
          shadowOpacity: isOnline ? 0.18 : 0.08,
          elevation: isOnline ? 5 : 2,
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

        {/* --- Top section: avatar + name + status + bio --- */}
        <View style={styles.topSection}>
          {/* Avatar */}
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
            style={[styles.name, { color: colors.textPrimary }]}
          >
            {person.nickname}
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
              <Text style={styles.onlineText}>Online now</Text>
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
                  ? `Seen ${formatRelativeTime(person.lastSeenAt)} ago`
                  : 'Offline'}
              </Text>
            </View>
          )}

          {/* Bio / meta — always shows age below bio when both are present */}
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
          </View>

          {/* Distance badge */}
          {hasDistance && (
            <View
              style={[
                styles.distanceBadge,
                { backgroundColor: `${colors.primary}12` },
              ]}
            >
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                📍 {person.distanceKm} KM{'\n'}AWAY
              </Text>
            </View>
          )}
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
              transform: [{ scale: pressed ? 0.97 : 1 }],
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
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    // APK-safe: no `overflow: hidden` on the outer Pressable so shadow renders on Android
    // The inner body clips correctly with its own borderRadius
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
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
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
    marginTop: 7,
    textAlign: 'center',
    letterSpacing: 0.1,
    width: '100%',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
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
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  seenText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  bioArea: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 5,
    gap: 3,
  },
  bioText: {
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 13,
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
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 13,
    letterSpacing: 0.3,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    height: 34,
    borderRadius: 17,
    shadowOpacity: 0.32,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginTop: 8,
  },
  chatEmoji: {
    fontSize: 11,
  },
  chatLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
