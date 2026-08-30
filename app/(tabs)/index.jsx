import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { EmptyState } from '../../src/components/ui.jsx';
import { BrowseRow } from '../../src/components/BrowseRow.jsx';
import { BannerCarousel } from '../../src/components/BannerCarousel.jsx';
import { DailyCoinsCard } from '../../src/components/DailyCoinsCard.jsx';
import { VerifyBanner } from '../../src/components/VerifyBanner.jsx';
import { GamesRow, LiveRoomsRow, SectionHeader } from '../../src/components/HomeSections.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi, gamesApi, roomsApi, usersApi } from '../../src/api/endpoints.js';
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
   * Everyone online right now. One row rather than two: showing the same
   * people twice under different headings padded the screen without telling
   * anyone anything new.
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

  const { data: games, isLoading: isLoadingGames } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const onlinePeople = onlineData?.items ?? [];

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

      {error ? (
        <EmptyState emoji="📡" title="Could not load anyone" description={error.message} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View className="px-4">
            <VerifyBanner />
            <BannerCarousel />
            <DailyCoinsCard />
          </View>

          {onlinePeople.length > 0 || isLoadingOnline ? (
            <View className="mb-5">
              <View className="px-4">
                <SectionHeader
                  title="Online now"
                  badge="LIVE"
                  action="See all"
                  onAction={() => router.push('/browse?online=true')}
                />
              </View>
              <View className="pl-4">
                <BrowseRow
                  people={onlinePeople}
                  total={onlineData?.meta?.total}
                  isLoading={isLoadingOnline}
                  presence={presence}
                  openingId={openingId}
                  onOpen={openChat}
                  seeMoreHref="/browse?online=true"
                  actionLabel="Say hi"
                />
              </View>
            </View>
          ) : null}

          {(liveRooms?.items?.length ?? 0) > 0 || isLoadingRooms ? (
            <View className="mb-5">
              <View className="px-4">
                <SectionHeader
                  title="Voice Rooms"
                  action="See all"
                  onAction={() => router.push('/(tabs)/rooms')}
                />
              </View>
              <View className="pl-4">
                <LiveRoomsRow rooms={liveRooms?.items} isLoading={isLoadingRooms} />
              </View>
            </View>
          ) : null}

          {(games?.length ?? 0) > 0 || isLoadingGames ? (
            <View className="mb-5">
              <View className="px-4">
                <SectionHeader
                  title="Play & Win"
                  action="Leaderboard"
                  onAction={() => router.push('/leaderboard')}
                />
              </View>
              <View className="pl-4">
                <GamesRow games={games} isLoading={isLoadingGames} />
              </View>
            </View>
          ) : null}

          <View className="mb-2">
            <View className="px-4">
              <SectionHeader
                title="Browse everyone"
                action="See all"
                onAction={() => router.push('/browse')}
              />
            </View>
            <View className="pl-4">
              <BrowseRow
                people={people}
                total={data?.meta?.total}
                isLoading={isLoading}
                presence={presence}
                openingId={openingId}
                onOpen={openChat}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
