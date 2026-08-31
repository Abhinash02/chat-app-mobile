import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, EmptyState } from '../../src/components/ui.jsx';
import { BrowseRow } from '../../src/components/BrowseRow.jsx';
import { BannerCarousel } from '../../src/components/BannerCarousel.jsx';
import { DailyCoinsCard } from '../../src/components/DailyCoinsCard.jsx';
import { LocationPrompt } from '../../src/components/LocationPrompt.jsx';
import { VerifyBanner } from '../../src/components/VerifyBanner.jsx';
import { GamesRow, LiveRoomsRow, SectionHeader } from '../../src/components/HomeSections.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi, gamesApi, roomsApi, usersApi } from '../../src/api/endpoints.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { storage } from '../../src/lib/storage.js';
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

function getTimeGreeting(name) {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  let emoji = '🌙';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
    emoji = '☀️';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    emoji = '🌤️';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
    emoji = '✨';
  } else {
    greeting = 'Good night';
    emoji = '🌙';
  }

  const firstName = (name || '').trim().split(' ')[0];
  return firstName ? `${greeting}, ${firstName} ${emoji}` : `${greeting} ${emoji}`;
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

  /*
   * Asked once, on the home screen rather than during signup.
   *
   * A permission prompt in the middle of registration is asking before anyone
   * has a reason to say yes. Here they have already seen the feed, so "find
   * people near you" means something.
   */
  const [shouldAskLocation, setShouldAskLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    storage.hasAskedLocation().then((asked) => {
      if (!cancelled && !asked) setShouldAskLocation(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

      let city = null;
      let country = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (geo) {
          city = geo.city || geo.subregion || geo.district || geo.region || null;
          country = geo.country || null;
        }
      } catch {
        // Fallback gracefully if reverse geocoding fails
      }

      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city,
        country,
      };

      setCoordinates(next);

      // Sharing it with the server saves their real city and distance
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
  /*
   * Only in play while the nearby filter is on, so the rooms row and the
   * people feed can never disagree about whether location is being used.
   *
   * Declared above every query that reads it: `const` is hoisted but stays
   * unusable until this line runs, so referencing it earlier throws.
   */
  const nearbyCoordinates = useNearby ? coordinates : null;

  const { data: onlineData, isLoading: isLoadingOnline } = useQuery({
    queryKey: ['discover', 'online'],
    queryFn: () => usersApi.discover({ onlineOnly: true, limit: 20 }),
    staleTime: 30_000,
  });

  /*
   * Rooms near the user when a location is already known from the discovery
   * filter, and the plain list otherwise. Nothing here asks for permission on
   * its own — that prompt belongs to the control the user actually tapped.
   */
  const { data: liveRooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms', 'live', nearbyCoordinates ?? 'all'],
    queryFn: () =>
      roomsApi.list({
        limit: 10,
        ...(nearbyCoordinates ? { ...nearbyCoordinates, radiusKm: 50 } : {}),
      }),
    staleTime: 30_000,
  });

  const { data: games, isLoading: isLoadingGames } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const onlinePeople = onlineData?.items ?? [];

  const people = data?.items ?? [];

  const displayName = user?.name || user?.nickname || 'Viber';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {shouldAskLocation ? (
        <LocationPrompt onDone={() => setShouldAskLocation(false)} />
      ) : null}

      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-3 flex-1 mr-2">
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            className="relative"
          >
            <Avatar
              uri={user?.avatarUrl}
              name={user?.nickname}
              gender={user?.gender}
              emoji={user?.avatarEmoji}
              color={user?.avatarColor}
              size={40}
            />
            <View
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{
                backgroundColor: '#22c55e',
                borderColor: colors.background,
              }}
            />
          </Pressable>

          <View className="min-w-0 flex-1 justify-center">
            <Text
              className="text-[15px] font-bold"
              style={{ color: colors.textPrimary }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className="text-[11px] font-medium mt-0.5"
              style={{ color: colors.primary }}
              numberOfLines={1}
            >
              {getTimeGreeting(displayName)}
            </Text>
          </View>
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

            <Pressable
              onPress={() => router.push('/events')}
              className="mb-4 flex-row items-center justify-between p-3 rounded-2xl"
              style={{
                backgroundColor: `${colors.primary}10`,
                borderWidth: 1,
                borderColor: `${colors.primary}25`,
              }}
            >
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Text className="text-base">🎉</Text>
                </View>
                <View>
                  <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                    Live Events & Special Offers
                  </Text>
                  <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                    Festival sales, free chat hours & bonus coins
                  </Text>
                </View>
              </View>
              <View
                className="px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-[10px] font-bold text-white">Explore</Text>
              </View>
            </Pressable>
          </View>

          {/*
            * This section stays put when nobody is online, unlike the others.
            *
            * A row that disappears is indistinguishable from one that was
            * removed — and "nobody is online" is itself worth knowing, where
            * "there are no live rooms" is not.
            */}
          <View className="mb-5">
            <View className="px-4">
              <SectionHeader
                title="Online now"
                badge={onlinePeople.length > 0 ? 'LIVE' : undefined}
                action={onlinePeople.length > 0 ? 'See all' : undefined}
                onAction={() => router.push('/browse?online=true')}
              />
            </View>

            {onlinePeople.length === 0 && !isLoadingOnline ? (
              <View className="px-4">
                <View
                  className="flex-row items-center gap-3 px-4 py-4"
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      Nobody is online right now
                    </Text>
                    <Text className="text-xs" style={{ color: colors.textMuted }}>
                      Browse everyone below and say hi anyway.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
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
            )}
          </View>

          {/* Always shown: the create tile is what makes an empty room list
              useful rather than a dead end. */}
          <View className="mb-5">
              <View className="px-4">
                <SectionHeader
                  title={nearbyCoordinates ? 'Rooms near you' : 'Voice Rooms'}
                  action="Start one"
                  onAction={() => router.push('/(tabs)/rooms?create=true')}
                />
              </View>
            <View className="pl-4">
              <LiveRoomsRow rooms={liveRooms?.items} isLoading={isLoadingRooms} />
            </View>
          </View>

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
