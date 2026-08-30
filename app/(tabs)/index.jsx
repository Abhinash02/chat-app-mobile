import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, Badge, EmptyState, Loading } from '../../src/components/ui.jsx';
import { BannerCarousel } from '../../src/components/BannerCarousel.jsx';
import { DailyCoinsCard } from '../../src/components/DailyCoinsCard.jsx';
import {
  CallableRow,
  LiveRoomsRow,
  OnlineChatRow,
  SectionHeader,
} from '../../src/components/HomeSections.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi, roomsApi, usersApi } from '../../src/api/endpoints.js';
import { formatDistance, formatRelativeTime } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

function FilterChip({ label, active, onPress }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="px-3.5 py-2"
      style={{
        backgroundColor: active ? colors.primary : colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: active ? colors.onPrimary : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One person in the feed. Tapping it opens the chat — and on a brand-new one
 * the server sends the greeting, which is why the label says "Say hi" rather
 * than "View profile".
 */
function PersonCard({ person, presence, onPress, isOpening }) {
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
      className="mb-3 flex-1 p-3"
      style={({ pressed }) => ({
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
    </Pressable>
  );
}

export default function Discover() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { presence } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [onlineOnly, setOnlineOnly] = useState(false);
  const [useNearby, setUseNearby] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const looking = user?.gender === 'male' ? 'girls' : 'boys';

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['discover', { onlineOnly, coordinates }],
    queryFn: () =>
      usersApi.discover({
        limit: 30,
        onlineOnly: String(onlineOnly),
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      }),
  });

  /**
   * Location is requested only when the user asks for nearby, never on launch.
   * A dating-adjacent app asking for location before showing anything is how
   * permission prompts get denied permanently.
   */
  const enableNearby = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        toast.info('Location is off. Turn it on in Settings to see people nearby.');
        setUseNearby(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoordinates(next);

      // Sharing it with the server is what lets other people find this user
      // by distance too.
      usersApi.updateLocation(next).catch(() => undefined);
    } catch {
      toast.error('Could not get your location');
      setUseNearby(false);
    }
  }, [toast]);

  // Toggling nearby is a user action, so it does its work in the handler
  // rather than through an effect watching the flag.
  const toggleNearby = useCallback(() => {
    if (useNearby) {
      setUseNearby(false);
      setCoordinates(null);
      return;
    }

    setUseNearby(true);
    void enableNearby();
  }, [useNearby, enableNearby]);

  async function openChat(person) {
    setOpeningId(person.id);

    try {
      const result = await chatApi.open(person.id);

      if (result.greetingSkippedReason === 'INSUFFICIENT_COINS') {
        toast.info('You are out of coins — top up to say hi.');
        router.push('/coins');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${result.conversation.id}`);
    } catch (openError) {
      toast.error(openError.message ?? 'Could not open that chat');
    } finally {
      setOpeningId(null);
    }
  }

  /*
   * Online people, fetched once and split between the two rows rather than
   * queried twice. The chat row is reversed so the two rows never open with
   * the same three faces.
   */
  const { data: onlineData, isLoading: isLoadingOnline } = useQuery({
    queryKey: ['discover', 'online'],
    queryFn: () => usersApi.discover({ onlineOnly: true, limit: 20 }),
    staleTime: 30_000,
  });

  const { data: liveRooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms', 'live'],
    queryFn: () => roomsApi.list({ limit: 10 }),
    staleTime: 30_000,
  });

  const onlinePeople = onlineData?.items ?? [];
  const callable = onlinePeople.slice(0, 8);
  const chattable = [...onlinePeople].reverse().slice(0, 12);

  const people = data?.items ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <View>
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Discover
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {people.length > 0 ? `${data?.meta?.total ?? people.length} ${looking} to meet` : looking}
          </Text>
        </View>
        <WalletHeader />
      </View>

      <View className="flex-row gap-2 px-4 pb-3">
        <FilterChip label="Everyone" active={!onlineOnly} onPress={() => setOnlineOnly(false)} />
        <FilterChip label="🟢 Online" active={onlineOnly} onPress={() => setOnlineOnly(true)} />
        <FilterChip label="📍 Nearby" active={useNearby} onPress={toggleNearby} />
      </View>

      {isLoading ? (
        <Loading label={`Finding ${looking}…`} />
      ) : error ? (
        <EmptyState
          emoji="📡"
          title="Could not load anyone"
          description={error.message}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          // Inside the list rather than above it, so the banner scrolls away
          // with the feed instead of eating a fixed strip of a small screen.
          ListHeaderComponent={
            <View className="px-4">
              <BannerCarousel />
              <DailyCoinsCard />

              {callable.length > 0 || isLoadingOnline ? (
                <View className="mb-5">
                  <SectionHeader
                    title="Say Hi"
                    action="Shuffle"
                    onAction={() => queryClient.invalidateQueries({ queryKey: ['discover', 'online'] })}
                  />
                  <CallableRow people={callable} isLoading={isLoadingOnline} onCall={openChat} />
                </View>
              ) : null}

              {chattable.length > 0 || isLoadingOnline ? (
                <View className="mb-5">
                  <SectionHeader title="Online Now" badge="LIVE" />
                  <OnlineChatRow people={chattable} isLoading={isLoadingOnline} onChat={openChat} />
                </View>
              ) : null}

              {(liveRooms?.items?.length ?? 0) > 0 || isLoadingRooms ? (
                <View className="mb-5">
                  <SectionHeader
                    title="Voice Rooms"
                    action="See all"
                    onAction={() => router.push('/(tabs)/rooms')}
                  />
                  <LiveRoomsRow rooms={liveRooms?.items} isLoading={isLoadingRooms} />
                </View>
              ) : null}

              <SectionHeader title="Browse everyone" />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              presence={presence}
              isOpening={openingId === item.id}
              onPress={() => openChat(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="🔍"
              title={onlineOnly ? `No ${looking} online right now` : `No ${looking} to show yet`}
              description={
                onlineOnly
                  ? 'Try turning off the online filter — you can still message anyone.'
                  : 'Check back in a little while as more people join.'
              }
            />
          }
        />
      )}
    </View>
  );
}
