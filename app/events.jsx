import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, CoinIcon, Loading } from '../src/components/ui.jsx';
import { eventsApi } from '../src/api/endpoints.js';
import { formatCountdown } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

function EventCard({ item, onSelect }) {
  const { colors, fonts } = useTheme();

  const [msRemaining, setMsRemaining] = useState(() => {
    if (!item.endsAt) return null;
    return Math.max(0, new Date(item.endsAt).getTime() - new Date().getTime());
  });

  useEffect(() => {
    if (!item.endsAt) return undefined;
    const timer = setInterval(() => {
      setMsRemaining(Math.max(0, new Date(item.endsAt).getTime() - new Date().getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, [item.endsAt]);


  /*
   * What this offer actually gives you, as one line of plain text.
   *
   * These were three coloured chips — amber, emerald, indigo — which put three
   * more brand colours on a screen that already has one, and turned the useful
   * part of the offer into decoration. Read as a sentence they are quicker to
   * take in and cost nothing visually.
   */
  const perks = [
    item.rewardCoins > 0 ? `${item.rewardCoins} bonus coins` : null,
    item.discountPercent > 0 ? `${item.discountPercent}% off` : null,
    item.rewardFreeMinutes > 0 ? `${item.rewardFreeMinutes} min free chat` : null,
  ].filter(Boolean);

  const audience =
    item.targetGender === 'male'
      ? 'For boys'
      : item.targetGender === 'female'
        ? 'For girls'
        : 'Everyone';

  const isEnding = msRemaining !== null && msRemaining < 6 * 60 * 60 * 1000;

  return (
    /*
     * A row on a page, not a card in a grid.
     *
     * The only line is the hairline separating one offer from the next — no
     * border box, no shadow, no filled panel. Offers are a list; making each
     * one a floating rectangle was what made the screen look assembled.
     */
    <Pressable
      onPress={() => onSelect(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${audience}.`}
      style={({ pressed }) => ({
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* Eyebrow: who it is for, and how long is left. The countdown only
          takes the accent once it is genuinely urgent — a permanent red clock
          on every row teaches people to ignore it. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontSize: 10.5,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colors.textMuted,
          }}
        >
          {audience}
        </Text>

        {msRemaining !== null ? (
          <>
            <Text style={{ fontSize: 10.5, color: colors.textMuted }}>·</Text>
            <Text
              style={{
                fontSize: 10.5,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: isEnding ? colors.primary : colors.textMuted,
              }}
            >
              {formatCountdown(msRemaining)} left
            </Text>
          </>
        ) : null}

        {item.badgeText ? (
          <>
            <Text style={{ fontSize: 10.5, color: colors.textMuted }}>·</Text>
            <Text
              style={{
                fontSize: 10.5,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: colors.textMuted,
              }}
            >
              {item.badgeText}
            </Text>
          </>
        ) : null}
      </View>

      <Text
        style={{
          marginTop: 9,
          fontSize: 21,
          lineHeight: 27,
          letterSpacing: -0.4,
          color: colors.textPrimary,
          fontFamily: fonts?.display,
        }}
      >
        {item.title}
      </Text>

      {item.description ? (
        <Text
          numberOfLines={2}
          style={{
            marginTop: 6,
            fontSize: 14,
            lineHeight: 21,
            color: colors.textSecondary,
          }}
        >
          {item.description}
        </Text>
      ) : null}

      {perks.length > 0 ? (
        <Text style={{ marginTop: 10, fontSize: 13.5, color: colors.primary }}>
          {perks.join('  ·  ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function Events() {
  const { colors } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const [modalMsRemaining, setModalMsRemaining] = useState(null);

  useEffect(() => {
    if (!selectedEvent?.endsAt) {
      setModalMsRemaining(null);
      return undefined;
    }
    setModalMsRemaining(Math.max(0, new Date(selectedEvent.endsAt).getTime() - new Date().getTime()));

    const timer = setInterval(() => {
      setModalMsRemaining(Math.max(0, new Date(selectedEvent.endsAt).getTime() - new Date().getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedEvent]);

  function handleAction(event) {
    setSelectedEvent(null);
    if (!event) return;

    if (event.actionUrl === 'rooms') {
      router.push('/(tabs)/rooms');
    } else if (event.actionUrl === 'chats') {
      router.push('/(tabs)/chats');
    } else if (event.actionUrl === 'games') {
      router.push('/(tabs)/games');
    } else {
      router.push('/coins');
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader
        title="Events & Offers"
        subtitle="Exclusive perks and active announcements"
        fallback="/(tabs)"
      />

      {isLoading ? (
        <Loading label="Loading events…" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) => <EventCard item={item} onSelect={setSelectedEvent} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View className="py-12 items-center justify-center">
              <Text className="text-3xl mb-2">🎉</Text>
              <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                No active events right now
              </Text>
              <Text className="text-xs text-center mt-1" style={{ color: colors.textMuted }}>
                Check back soon for new offers, discounts, and announcements.
              </Text>
            </View>
          }
        />
      )}

      {/* EVENT DETAILS POPUP MODAL */}
      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/60 px-5"
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="p-6 rounded-3xl border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            {/* Header */}
            <View className="flex-row items-start justify-between gap-3 mb-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  {selectedEvent?.badgeText ? (
                    <Badge label={selectedEvent.badgeText} tone="brand" />
                  ) : null}
                  <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
                    {selectedEvent?.type === 'announcement'
                      ? '📢 Announcement'
                      : selectedEvent?.type === 'free_chat'
                      ? '🎁 Free Chat'
                      : selectedEvent?.type === 'bonus_coins'
                      ? '🪙 Bonus Coins'
                      : selectedEvent?.type === 'festival'
                      ? '🎙️ Party Festival'
                      : '🎉 Special Offer'}
                  </Text>
                </View>
                <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>
                  {selectedEvent?.title}
                </Text>
              </View>

              <Pressable
                onPress={() => setSelectedEvent(null)}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.surfaceAlt }}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Countdown timer if applicable */}
            {modalMsRemaining !== null && (
              <View
                className="p-2.5 rounded-2xl mb-4 flex-row items-center justify-between"
                style={{ backgroundColor: `${colors.warning || '#F59E0B'}18` }}
              >
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  ⏱️ Event Ends In:
                </Text>
                <Text className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {formatCountdown(modalMsRemaining)}
                </Text>
              </View>
            )}

            {/* Event Description */}
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} className="mb-4">
              <Text className="text-sm leading-6" style={{ color: colors.textSecondary }}>
                {selectedEvent?.description}
              </Text>
            </ScrollView>

            {/* Perks breakdown */}
            {(selectedEvent?.rewardCoins > 0 ||
              selectedEvent?.discountPercent > 0 ||
              selectedEvent?.rewardFreeMinutes > 0) && (
              <View
                className="p-3.5 rounded-2xl mb-5 flex-row flex-wrap gap-2.5"
                style={{ backgroundColor: colors.surfaceAlt }}
              >
                {selectedEvent.rewardCoins > 0 && (
                  <View className="flex-row items-center gap-1.5 bg-amber-500/15 px-3 py-1 rounded-xl">
                    <CoinIcon size={14} />
                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      +{selectedEvent.rewardCoins} Free Bonus Coins
                    </Text>
                  </View>
                )}

                {selectedEvent.discountPercent > 0 && (
                  <View className="flex-row items-center gap-1.5 bg-emerald-500/15 px-3 py-1 rounded-xl">
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🏷️ {selectedEvent.discountPercent}% OFF on Store Packs
                    </Text>
                  </View>
                )}

                {selectedEvent.rewardFreeMinutes > 0 && (
                  <View className="flex-row items-center gap-1.5 bg-indigo-500/15 px-3 py-1 rounded-xl">
                    <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      ⏱️ +{selectedEvent.rewardFreeMinutes} Mins Free Chat
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action CTA Button */}
            <Pressable
              onPress={() => handleAction(selectedEvent)}
              className="py-3.5 px-5 rounded-2xl flex-row items-center justify-center gap-2 shadow-md active:scale-98 transition"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-sm font-black text-white uppercase tracking-wider">
                {selectedEvent?.actionUrl === 'rooms'
                  ? 'Join Voice Rooms Now →'
                  : selectedEvent?.actionUrl === 'chats'
                  ? 'Start Chatting Now →'
                  : selectedEvent?.actionUrl === 'games'
                  ? 'Play Arcade Games →'
                  : 'Claim in Coin Store →'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
