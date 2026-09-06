import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Ionicons } from '@expo/vector-icons';

import { Avatar, EmptyState } from '../../src/components/ui.jsx';
import { BrowseRow } from '../../src/components/BrowseRow.jsx';
import { BannerCarousel } from '../../src/components/BannerCarousel.jsx';
import { HomeBottomAdSection } from '../../src/components/HomeBottomAdSection.jsx';
import { LocationPrompt } from '../../src/components/LocationPrompt.jsx';
import { VerifyBanner } from '../../src/components/VerifyBanner.jsx';
import { SectionHeader } from '../../src/components/HomeSections.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi, usersApi } from '../../src/api/endpoints.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { languageNativeList } from '../../src/constants/languages.js';
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
  const { presence, notificationUnreadCount } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [onlineOnly, setOnlineOnly] = useState(false);

  /*
   * "People I can actually talk to."
   *
   * Starts on for anyone who picked languages at signup, because that is what
   * picking them was for — but it stays a visible, reversible chip rather than
   * a hidden rule, so nobody is quietly shown a smaller app than exists.
   * Someone who never chose any language has nothing to filter by, so the
   * chip is not offered at all.
   */
  const myLanguages = user?.languages ?? [];
  const hasLanguages = myLanguages.length > 0;
  const [matchLanguages, setMatchLanguages] = useState(hasLanguages);
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
    queryKey: ['discover', { onlineOnly, coordinates, matchLanguages: matchLanguages && hasLanguages }],
    queryFn: () =>
      usersApi.discover({
        limit: 30,
        onlineOnly: String(onlineOnly),
        ...(matchLanguages && hasLanguages ? { matchMyLanguages: 'true' } : {}),
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
  // ── Online now: auto-refresh every 20s + instantly on any presence change ──
  const [onlineAll, setOnlineAll] = useState([]);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [isLoadingMoreOnline, setLoadingMoreOnline] = useState(false);
  const onlineCursorRef = useRef(null);

  const { data: onlineData, isLoading: isLoadingOnline, refetch: refetchOnline } = useQuery({
    queryKey: ['discover', 'online', matchLanguages && hasLanguages],
    queryFn: () =>
      usersApi.discover({
        onlineOnly: true,
        limit: 20,
        ...(matchLanguages && hasLanguages ? { matchMyLanguages: 'true' } : {}),
      }),
    refetchInterval: 20_000,   // Auto-refresh every 20 seconds
    staleTime: 0,
  });

  // Sync fresh page into accumulated list
  useEffect(() => {
    if (onlineData?.items) {
      setOnlineAll(onlineData.items);
      setOnlineTotal(onlineData.meta?.total ?? onlineData.items.length);
      onlineCursorRef.current = onlineData.meta?.cursor ?? null;
    }
  }, [onlineData]);

  /*
   * Auto-refresh when someone actually goes online or offline.
   *
   * `presence` is replaced wholesale on every socket tick, so depending on the
   * object itself fired a network refetch per event — a refetch storm that
   * re-rendered both discovery rows each time and was enough to hang the app on
   * a mid-range phone. The signature below only changes when the set of online
   * ids does, which is the thing this row actually cares about.
   */
  const presenceSignature = Object.entries(presence)
    .filter(([, state]) => state?.isOnline)
    .map(([id]) => id)
    .sort()
    .join(',');

  const didLoadPresence = useRef(false);

  useEffect(() => {
    // The first signature arrives with the socket handshake and matches what
    // the query already fetched, so refetching on it is pure waste.
    if (!didLoadPresence.current) {
      didLoadPresence.current = true;
      return undefined;
    }

    const timer = setTimeout(() => refetchOnline(), 400);
    return () => clearTimeout(timer);
  }, [presenceSignature, refetchOnline]);

  // Load next page of online users inline
  const loadMoreOnline = useCallback(async () => {
    if (isLoadingMoreOnline) return;
    setLoadingMoreOnline(true);
    try {
      const next = await usersApi.discover({
        onlineOnly: true,
        limit: 20,
        // Same filter as page one: without it, scrolling quietly widens the feed.
        ...(matchLanguages && hasLanguages ? { matchMyLanguages: 'true' } : {}),
        ...(onlineCursorRef.current ? { cursor: onlineCursorRef.current } : { skip: onlineAll.length }),
      });
      if (next?.items?.length) {
        setOnlineAll((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          return [...prev, ...next.items.filter((u) => !existingIds.has(u.id))];
        });
        onlineCursorRef.current = next.meta?.cursor ?? null;
      }
    } finally {
      setLoadingMoreOnline(false);
    }
  }, [isLoadingMoreOnline, onlineAll.length, matchLanguages, hasLanguages]);

  // ── Browse everyone: accumulated with inline load-more ──
  const [browseAll, setBrowseAll] = useState([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [isLoadingMoreBrowse, setLoadingMoreBrowse] = useState(false);
  const browseCursorRef = useRef(null);

  useEffect(() => {
    if (data?.items) {
      setBrowseAll(data.items);
      setBrowseTotal(data.meta?.total ?? data.items.length);
      browseCursorRef.current = data.meta?.cursor ?? null;
    }
  }, [data]);

  const loadMoreBrowse = useCallback(async () => {
    if (isLoadingMoreBrowse) return;
    setLoadingMoreBrowse(true);
    try {
      const next = await usersApi.discover({
        limit: 20,
        onlineOnly: String(onlineOnly),
        ...(matchLanguages && hasLanguages ? { matchMyLanguages: 'true' } : {}),
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
        ...(browseCursorRef.current ? { cursor: browseCursorRef.current } : { skip: browseAll.length }),
      });
      if (next?.items?.length) {
        setBrowseAll((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          return [...prev, ...next.items.filter((u) => !existingIds.has(u.id))];
        });
        browseCursorRef.current = next.meta?.cursor ?? null;
      }
    } finally {
      setLoadingMoreBrowse(false);
    }
  }, [isLoadingMoreBrowse, browseAll.length, onlineOnly, coordinates, matchLanguages, hasLanguages]);

  /*
   * Rooms near the user when a location is already known from the discovery
   * filter, and the plain list otherwise.
   */
  const onlinePeople = onlineAll;

  const people = browseAll;

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

        <View className="flex-row items-center gap-2">
          <WalletHeader />
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-xl border relative active:scale-95"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
            {notificationUnreadCount > 0 ? (
              <View
                className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full items-center justify-center px-1 border"
                style={{
                  backgroundColor: '#ef4444',
                  borderColor: colors.background,
                }}
              >
                <Text className="text-[9px] font-extrabold text-white">
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View className="flex-row gap-2 px-4 pb-3">
        <FilterChip label="Everyone" active={!onlineOnly} onPress={() => setOnlineOnly(false)} />
        <FilterChip label="🟢 Online" active={onlineOnly} onPress={() => setOnlineOnly(true)} />
        <FilterChip label="📍 Nearby" active={useNearby} onPress={toggleNearby} />
        {hasLanguages ? (
          <FilterChip
            label={`🗣 ${languageNativeList(myLanguages, ' ')}`}
            active={matchLanguages}
            onPress={() => setMatchLanguages((on) => !on)}
          />
        ) : null}
      </View>

      {error ? (
        <EmptyState emoji="📡" title="Could not load anyone" description={error.message} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: (insets.bottom || 16) + 85 }}
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
          </View>

          {/*
            * Ordered by what is worth someone's attention first.
            *
            * Perishable content leads: who is free to talk *right now* goes
            * above the evergreen list of everyone, because a person online is
            * a conversation available for the next few minutes and a profile
            * is available forever. Promotions and the ad sit below the primary
            * action rather than in front of it — a feed that opens on an offer
            * reads as an advert with a chat app attached.
            */}

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
                total={onlineTotal}
                isLoading={isLoadingOnline && onlineAll.length === 0}
                presence={presence}
                openingId={openingId}
                onOpen={openChat}
                onLoadMore={loadMoreOnline}
                isLoadingMore={isLoadingMoreOnline}
                actionLabel="Say hi"
              />
            </View>
            )}
          </View>

          {/* Nearby Random Call Section */}
          <View className="mb-6 px-4">
            <Pressable
              onPress={() => router.push('/random-call')}
              className="flex-row items-center justify-between p-3.5 rounded-2xl shadow-sm border active:scale-95 transition"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View
                  className="h-11 w-11 items-center justify-center rounded-2xl shadow-md"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-xl">📞</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: colors.textPrimary }}
                    >
                      Nearby Random Call
                    </Text>
                    <View className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Text className="text-[10px] font-bold text-emerald-500">1-on-1</Text>
                  </View>
                  <Text
                    className="text-[11px] mt-0.5"
                    style={{ color: colors.textSecondary }}
                    numberOfLines={1}
                  >
                    Talk 1-on-1 with people closest to your location instantly
                  </Text>
                </View>
              </View>

              <View
                className="px-3 py-1.5 rounded-xl ml-2 shadow-sm"
                style={{ backgroundColor: colors.primary }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: colors.onPrimary || '#FFFFFF' }}
                >
                  Call Now →
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Browse Everyone (Moved right after Voice Rooms) */}
          <View className="mb-5">
            <View className="px-4">
              <SectionHeader
                title="Browse everyone"
              />
            </View>
            <View className="pl-4">
              <BrowseRow
                people={people}
                total={browseTotal}
                isLoading={isLoading && browseAll.length === 0}
                presence={presence}
                openingId={openingId}
                onOpen={openChat}
                onLoadMore={loadMoreBrowse}
                isLoadingMore={isLoadingMoreBrowse}
              />
            </View>
          </View>

          <View className="px-4">

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

          {/* Quick Refer & Earn Short Link Card directly below Ad Section */}
          <View className="px-4 mt-2.5 mb-8">
            <Pressable
              onPress={() => router.push('/refer')}
              className="overflow-hidden rounded-2xl shadow-sm active:opacity-90"
              style={{
                backgroundColor: colors.surface || '#FFFFFF',
                borderWidth: 1,
                borderColor: colors.border || '#E5E7EB',
              }}
            >
              <LinearGradient
                colors={[
                  `${colors.gradientStart || colors.primary || '#FF4E88'}18`,
                  `${colors.gradientEnd || colors.secondary || '#7C4DFF'}0A`,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}
              >
                <View
                  className="w-11 h-11 rounded-2xl items-center justify-center mr-3.5 shadow-sm"
                  style={{
                    backgroundColor: colors.primary || '#FF4E88',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🎁</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      Refer &amp; Earn Free Coins
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${colors.primary || '#FF4E88'}20` }}
                    >
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: colors.primary || '#FF4E88' }}
                      >
                        FREE
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: colors.textSecondary }}
                    numberOfLines={1}
                  >
                    Invite friends &amp; get instant bonus coins!
                  </Text>
                </View>
                <View
                  className="px-3.5 py-2 rounded-xl ml-2 shadow-sm"
                  style={{ backgroundColor: colors.primary || '#FF4E88' }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: colors.onPrimary || '#FFFFFF' }}
                  >
                    Invite →
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Lower Ad Section (Option A: In-House Custom Ad | Option B: Google AdMob) */}
          <HomeBottomAdSection />

        </ScrollView>
      )}
    </View>
  );
}
