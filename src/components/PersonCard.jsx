import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { CartoonAvatar } from './CartoonAvatar.jsx';
import { LANGUAGES } from '../constants/languages.js';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const CARD_WIDTH = 168;
export const CARD_HEIGHT = 254;

/*
 * Fixed heights, not proportional ones.
 *
 * A one-line bio and a two-line one have to put the chat button in exactly the
 * same place, or a scrolling row of these stops reading as a grid and starts
 * reading as a jumble.
 */
const MEDIA_HEIGHT = 148;

/*
 * Derived from the panel height, not from `width`.
 *
 * `width` is a layout value and callers are entitled to pass "100%" — the grid
 * on the browse screen does exactly that. Multiplying it for the avatar gave
 * NaN and React dropped the width and height off every <svg>. Height is always
 * a number here, and the drawing is square, so it is the safe dimension to
 * scale from. Slightly larger than the panel on purpose: the figure is a
 * head-and-shoulders portrait, so letting it run past the lower edge fills the
 * frame the way a real photo would.
 */
const AVATAR_SIZE = Math.round(MEDIA_HEIGHT * 1.18);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  media: {
    height: MEDIA_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
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
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mutedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.55)',
  },
  mutedPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#F6F3F1',
  },
  body: {
    flex: 1,
    paddingHorizontal: 11,
    paddingTop: 9,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1.5,
  },
  bio: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '500',
    marginTop: 5,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  langChip: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  langChipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  langMore: {
    fontSize: 9.5,
    fontWeight: '700',
    alignSelf: 'center',
  },
  ctaBlock: {
    paddingHorizontal: 11,
    paddingBottom: 11,
  },
  cta: {
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

/**
 * One person in the discovery feed (Online Now / Browse Everyone).
 *
 * The picture sits in its own panel and the name sits on the card below it,
 * rather than on a dark scrim laid over the picture. Overlaid text needs the
 * scrim to survive a bright photo — but most cards here have no photo, and
 * darkening the illustration to make white text work turned a bright drawing
 * into grey mush. On the plate the name is theme-coloured, always legible, and
 * identical whether or not someone has uploaded a photo.
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

  // Every one of these is rendered into a <Text>, so each has to survive a
  // null from the API rather than only an undefined.
  const displayName = person.nickname || person.name || 'User';
  const age = person.ageGroup ? String(person.ageGroup) : null;
  const city = person.city || null;
  const subtitle = [age, city].filter(Boolean).join(' · ');

  const hasDistance =
    person.distanceKm !== null &&
    person.distanceKm !== undefined &&
    !Number.isNaN(Number(person.distanceKm));

  const photoUri = person.avatarUrl || null;

  /*
   * The languages they said they speak.
   *
   * Shown in place of the bio rather than beside it: the card has room for one
   * more line, and on an app whose discovery is filtered by language, "we can
   * actually talk" is worth more than a bio that is blank on most profiles.
   * Someone who has set no languages still gets their bio, so the space is
   * never simply empty.
   */
  const spokenLanguages = Array.isArray(person.languages)
    ? person.languages
        .map((code) => LANGUAGES.find((entry) => entry.code === code))
        .filter(Boolean)
    : [];

  // Two fit the width; the rest become a count so the row never wraps into the
  // chat button.
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

  return (
    /*
     * The card frame is a plain View, not a Pressable.
     *
     * The profile tap target and the chat button are siblings inside it rather
     * than one nested in the other. React Native tolerates nested pressables,
     * but react-native-web renders each as a <button>, and a button inside a
     * button is invalid HTML that React rejects outright.
     */
    <View
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: colors.surface,
          shadowColor: '#160C22',
          opacity: isOpening ? 0.75 : 1,
        },
      ]}
    >
      <Pressable
        onPress={handleCardPress}
        disabled={isOpening}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${displayName}${isOnline ? ', online now' : ''}`}
        style={({ pressed }) => [{ flex: 1, opacity: pressed && !isOpening ? 0.9 : 1 }]}
      >
        {/* ── Picture ── */}
        <View style={[styles.media, { backgroundColor: `${colors.primary}14` }]}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={String(person.id)}
            />
          ) : (
            /* Drawn wider than the card and anchored to the bottom edge. The
               illustration is a head-and-shoulders portrait, so letting it run
               past the sides and off the lower edge fills the panel the way a
               real photo would, instead of floating a small figure in the
               middle of a coloured box. */
            <CartoonAvatar gender={person.gender} seed={person.id} size={AVATAR_SIZE} />
          )}

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

        {/* ── Identity ──
            Reading the bio and opening the profile are the same intent, so all
            of this stays inside the one tap target. */}
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.textPrimary }]}>
            {displayName}
          </Text>

          {subtitle ? (
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}

          {shownLanguages.length > 0 ? (
            <View style={styles.langRow}>
              {shownLanguages.map((entry) => (
                <View
                  key={entry.code}
                  style={[styles.langChip, { backgroundColor: `${colors.primary}16` }]}
                >
                  <Text numberOfLines={1} style={[styles.langChipText, { color: colors.primary }]}>
                    {entry.native}
                  </Text>
                </View>
              ))}
              {extraLanguages > 0 ? (
                <Text style={[styles.langMore, { color: colors.textMuted }]}>
                  +{extraLanguages}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text
              numberOfLines={2}
              style={[
                styles.bio,
                { color: person.bio ? colors.textSecondary : colors.textMuted },
              ]}
            >
              {person.bio?.trim() || 'Tap to say hello 👋'}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Sibling of the tap area, so neither wraps the other. */}
      <View style={styles.ctaBlock}>
        <Pressable
          onPress={handleChatPress}
          disabled={isOpening}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} with ${displayName}`}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.ctaText, { color: colors.onPrimary || '#FFFFFF' }]}>
            {isOpening ? 'Opening…' : actionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Memoised: a presence tick re-renders the row, and without this every card in
 * it rebuilds its image view — the thing that makes long rows stutter on
 * mid-range Android.
 */
export const PersonCard = memo(PersonCardComponent);

export default PersonCard;
