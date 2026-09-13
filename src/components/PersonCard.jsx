import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { CartoonAvatar } from './CartoonAvatar.jsx';
import { LANGUAGES } from '../constants/languages.js';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const CARD_WIDTH = 154;
export const CARD_HEIGHT = 218;

/*
 * Compact media panel height (~98px) so the avatar is nicely sized and framed,
 * leaving plenty of room for high-contrast name, subtitle, badges, and action CTA.
 */
const MEDIA_HEIGHT = 98;
const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  media: {
    height: MEDIA_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  livePillText: {
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    includeFontPadding: false,
  },
  mutedPill: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mutedPillText: {
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 2,
    justifyContent: 'flex-start',
  },
  /*
   * Every text style here pairs `includeFontPadding: false` with an explicit
   * `lineHeight`. Dropping the font padding on Android removes the metrics the
   * platform would otherwise use to size the line box, and a custom family
   * (Cause) does not always supply usable ones in its place — leaving the line
   * free to collapse to nothing. Stating the height keeps the glyphs on screen.
   */
  name: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '600',
    marginTop: 2,
    includeFontPadding: false,
  },
  bio: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    marginTop: 2,
    includeFontPadding: false,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 3,
    marginTop: 3,
    alignItems: 'center',
  },
  langChip: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langChipText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  langMore: {
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '700',
    alignSelf: 'center',
    includeFontPadding: false,
  },
  ctaBlock: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
  },
  cta: {
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
});

/**
 * Clean, perfectly proportioned discovery card for Android APK and Web.
 */
function PersonCardComponent({
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

  const displayName = person.nickname || person.name || 'User';
  const age = person.ageGroup ? `Age ${person.ageGroup}` : null;
  const city = person.city || null;
  const subtitle = [age, city].filter(Boolean).join(' · ');

  const hasDistance =
    person.distanceKm !== null &&
    person.distanceKm !== undefined &&
    !Number.isNaN(Number(person.distanceKm));

  const photoUri = person.avatarUrl || null;

  const spokenLanguages = Array.isArray(person.languages)
    ? person.languages
        .map((code) => LANGUAGES.find((entry) => entry.code === code))
        .filter(Boolean)
    : [];

  const shownLanguages = spokenLanguages.slice(0, 2);
  const extraLanguages = spokenLanguages.length - shownLanguages.length;

  function handleCardPress() {
    if (person.id) router.push(`/user/${person.id}`);
  }

  function handleChatPress(event) {
    event?.stopPropagation?.();
    if (onPress) onPress(person);
    else if (person.id) router.push(`/user/${person.id}`);
  }

  const primaryColor = colors.primary || '#7C4DFF';
  const onPrimaryColor = colors.onPrimary || '#FFFFFF';

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: colors.surface || '#FFFFFF',
          borderColor: isOnline ? `${primaryColor}45` : colors.border || '#E5E7EB',
          shadowColor: isOnline ? primaryColor : '#000000',
          opacity: isOpening ? 0.75 : 1,
        },
      ]}
    >
      <Pressable
        onPress={handleCardPress}
        disabled={isOpening}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${displayName}${isOnline ? ', online now' : ''}`}
        /*
         * A plain style object, not `({ pressed }) => …`.
         *
         * NativeWind registers `cssInterop` against Pressable for every element
         * in the tree, and its native runtime treats `props.style` as an object
         * it can walk and assign into. Handed a function it cannot, so the
         * style is lost — taking this `flex: 1` with it, which collapsed the
         * card body and left the name, subtitle and chips with no height. Press
         * feedback comes from the `active:` class instead, which is the path
         * the interop actually supports.
         */
        className="active:opacity-90"
        style={{ flex: 1 }}
      >
        {/* ── Compact Media & Avatar Box ── */}
        <View
          style={[
            styles.media,
            {
              backgroundColor: isOnline ? `${primaryColor}14` : colors.surfaceAlt || '#F3F4F6',
            },
          ]}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
              recyclingKey={String(person.id)}
            />
          ) : (
            <CartoonAvatar gender={person.gender} seed={person.id} size={AVATAR_SIZE} />
          )}

          {/* Status Badges Overlay */}
          <View style={styles.topRow}>
            {isOnline ? (
              <View style={[styles.pill, { backgroundColor: colors.onlineDot || '#10B981' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>ONLINE</Text>
              </View>
            ) : person.lastSeenAt ? (
              <View style={styles.mutedPill}>
                <Text style={styles.mutedPillText} numberOfLines={1}>
                  {formatRelativeTime(person.lastSeenAt)}
                </Text>
              </View>
            ) : (
              <View />
            )}

            {hasDistance ? (
              <View style={styles.mutedPill}>
                <Text style={styles.mutedPillText} numberOfLines={1}>
                  {Math.round(Number(person.distanceKm))} km
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── High-Contrast Identity Block ── */}
        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: colors.textPrimary || '#111827' }]}
          >
            {displayName}
          </Text>

          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: colors.textMuted || '#6B7280' }]}
            >
              {subtitle}
            </Text>
          ) : null}

          {shownLanguages.length > 0 ? (
            <View style={styles.langRow}>
              {shownLanguages.map((entry) => (
                <View
                  key={entry.code}
                  style={[styles.langChip, { backgroundColor: `${primaryColor}18` }]}
                >
                  <Text numberOfLines={1} style={[styles.langChipText, { color: primaryColor }]}>
                    {entry.native}
                  </Text>
                </View>
              ))}
              {extraLanguages > 0 ? (
                <Text style={[styles.langMore, { color: colors.textMuted || '#6B7280' }]}>
                  +{extraLanguages}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.bio,
                { color: person.bio ? (colors.textSecondary || '#4B5563') : (colors.textMuted || '#9CA3AF') },
              ]}
            >
              {person.bio?.trim() || 'Say hello 👋'}
            </Text>
          )}
        </View>
      </Pressable>

      {/* ── High-Visibility Chat CTA Button ── */}
      <View style={styles.ctaBlock}>
        <Pressable
          onPress={handleChatPress}
          disabled={isOpening}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} with ${displayName}`}
          className="active:opacity-90"
          style={[
            styles.cta,
            {
              backgroundColor: primaryColor,
              shadowColor: primaryColor,
            },
          ]}
        >
          <Text style={{ fontSize: 10 }}>💬</Text>
          <Text
            numberOfLines={1}
            style={[styles.ctaText, { color: onPrimaryColor }]}
          >
            {isOpening ? 'Opening…' : actionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PersonCard = memo(PersonCardComponent);
export default PersonCard;
