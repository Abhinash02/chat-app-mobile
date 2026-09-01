import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, Loading } from '../src/components/ui.jsx';
import { eventsApi } from '../src/api/endpoints.js';
import { formatCountdown } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

function EventCard({ item, onSelect }) {
  const { colors, radius } = useTheme();

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

  const hasPerks = item.rewardCoins > 0 || item.discountPercent > 0 || item.rewardFreeMinutes > 0;

  return (
    <Pressable
      onPress={() => onSelect(item)}
      accessibilityRole="button"
      className="mb-4 overflow-hidden rounded-3xl p-4 border active:scale-98 transition shadow-sm"
      style={{
        backgroundColor: colors.surface,
        borderColor: `${colors.primary}30`,
      }}
    >
      <View className="flex-row items-center justify-between gap-2 mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
            {item.title}
          </Text>
          {item.badgeText ? (
            <Badge label={item.badgeText} tone="brand" />
          ) : null}
        </View>

        {msRemaining !== null && (
          <View
            className="px-2.5 py-1 rounded-full flex-row items-center gap-1"
            style={{ backgroundColor: `${colors.warning || '#F59E0B'}20` }}
          >
            <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              ⏱️ {formatCountdown(msRemaining)}
            </Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={2}
        className="text-xs leading-5 mb-3"
        style={{ color: colors.textSecondary }}
      >
        {item.description}
      </Text>

      {hasPerks && (
        <View
          className="p-2.5 rounded-xl mb-3 flex-row flex-wrap items-center gap-2"
          style={{ backgroundColor: colors.surfaceAlt }}
        >
          {item.rewardCoins > 0 && (
            <View className="flex-row items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-lg">
              <CoinIcon size={12} />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">+{item.rewardCoins} Bonus</Text>
            </View>
          )}

          {item.discountPercent > 0 && (
            <View className="flex-row items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-lg">
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🏷️ {item.discountPercent}% OFF</Text>
            </View>
          )}

          {item.rewardFreeMinutes > 0 && (
            <View className="flex-row items-center gap-1 bg-indigo-500/15 px-2 py-0.5 rounded-lg">
              <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">⏱️ +{item.rewardFreeMinutes}m Free Chat</Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center justify-between pt-1 border-t" style={{ borderTopColor: colors.border }}>
        <Text className="text-[11px] font-medium" style={{ color: colors.textMuted }}>
          {item.targetGender === 'male'
            ? '👦 Exclusive for Boys'
            : item.targetGender === 'female'
            ? '👧 Exclusive for Girls'
            : '👥 Open to Everyone'}
        </Text>

        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-bold" style={{ color: colors.primary }}>
            View Details
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function Events() {
  const { colors, radius } = useTheme();
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
