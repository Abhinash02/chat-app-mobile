import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Gradient } from '../../src/components/Gradient.jsx';
import { useActionSheet } from '../../src/components/ActionSheet.jsx';
import { goBack } from '../../src/components/ScreenHeader.jsx';
import { Avatar, Loading } from '../../src/components/ui.jsx';
import { STATUS_BACKGROUNDS } from '../../src/constants/status.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { statusApi } from '../../src/api/endpoints.js';
import { formatRelativeTime } from '../../src/lib/format.js';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

/** How long a photo or a text card stays up before advancing. */
const STILL_DURATION_MS = 5000;

/** The bar advances in steps rather than continuously; 50ms reads as smooth. */
const TICK_MS = 50;

function gradientFor(backgroundId) {
  return (
    STATUS_BACKGROUNDS.find((entry) => entry.id === backgroundId)?.colors ??
    STATUS_BACKGROUNDS[0].colors
  );
}

/** One segment per status, filling left to right as it plays. */
function ProgressBars({ count, index, progress }) {
  return (
    <View className="flex-row gap-1 px-3">
      {Array.from({ length: count }, (_unused, position) => {
        const filled = position < index ? 1 : position === index ? progress : 0;

        return (
          <View key={position} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
            <View className="h-full rounded-full bg-white" style={{ width: `${filled * 100}%` }} />
          </View>
        );
      })}
    </View>
  );
}

/** The author's list of who watched, opened from the viewer count. */
function ViewerSheet({ statusId, onClose }) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['status-viewers', statusId],
    queryFn: () => statusApi.viewers(statusId),
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius * 2,
            borderTopRightRadius: radius * 2,
            paddingBottom: insets.bottom + 12,
            maxHeight: '70%',
          }}
        >
          <View className="items-center py-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
          </View>

          <Text className="px-5 pb-2 text-base font-semibold" style={{ color: colors.textPrimary }}>
            {data ? `Seen by ${data.viewCount}` : 'Seen by'}
          </Text>

          {isLoading ? (
            <Loading label="Loading…" />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {(data?.viewers ?? []).length === 0 ? (
                <Text className="py-6 text-center text-[13px]" style={{ color: colors.textMuted }}>
                  No one has seen this yet.
                </Text>
              ) : (
                data.viewers.map((viewer) => (
                  <View key={viewer.userId} className="flex-row items-center gap-3 py-2.5">
                    <Avatar
                      uri={viewer.avatarUrl}
                      name={viewer.nickname}
                      gender={viewer.gender}
                      emoji={viewer.avatarEmoji}
                      color={viewer.avatarColor}
                      size={38}
                    />
                    <Text className="flex-1 text-[15px]" style={{ color: colors.textPrimary }}>
                      {viewer.nickname}
                    </Text>
                    <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                      {formatRelativeTime(viewer.viewedAt)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * The video in a status, if the current one is a video.
 *
 * A separate component so the player is created and destroyed with the video
 * rather than living for the whole ring — mounting a decoder for every status
 * including the text ones would hold hardware open for nothing.
 */
function StatusVideo({ url, isPaused, onDuration }) {
  const player = useVideoPlayer({ uri: url }, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => {
    if (isPaused) player.pause();
    else player.play();
  }, [isPaused, player]);

  useEffect(() => {
    /*
     * A video runs for its own length, not the fixed five seconds a photo
     * gets. The duration is not known until the file loads, so the timer is
     * told about it when it arrives rather than guessed up front.
     */
    const subscription = player.addListener('statusChange', () => {
      if (player.duration > 0) onDuration(player.duration * 1000);
    });

    return () => subscription.remove();
  }, [player, onDuration]);

  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />;
}

export default function StatusViewerScreen() {
  const { userId } = useLocalSearchParams();
  // No theme here on purpose: a status viewer is black in every theme, the way
  // a cinema is. Tinting it to the palette would wash out the photos.
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const actionSheet = useActionSheet();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewerSheetOpen, setIsViewerSheetOpen] = useState(false);

  const durationRef = useRef(STILL_DURATION_MS);
  const elapsedRef = useRef(0);
  const viewedRef = useRef(new Set());

  /*
   * Set once the ring is over and this screen is on its way out.
   *
   * Leaving does not stop the timer synchronously — the interval is cleared by
   * effect cleanup, which runs on unmount, and the next tick lands 50ms later.
   * Without this latch that tick calls back again and pops a second screen off
   * the stack, dropping the person somewhere they never navigated to. The same
   * latch covers an impatient double-tap on the last status.
   */
  const isLeavingRef = useRef(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['status-ring', userId],
    queryFn: () => statusApi.byUser(userId),
  });

  const current = items?.[index] ?? null;
  const isOwn = current?.isOwn ?? false;

  /*
   * Watching your own story while people are watching it: the count ticks up
   * under your thumb rather than after a pull-to-refresh you would never think
   * to do while the screen is full-bleed.
   */
  useEffect(() => {
    const off = on(SOCKET_EVENT.STATUS_VIEWED, () => {
      queryClient.invalidateQueries({ queryKey: ['status-ring', userId] });
    });

    return () => off?.();
  }, [on, queryClient, userId]);

  /*
   * Liking a status, the way WhatsApp does it: anyone who can see it can react,
   * including the author.
   *
   * The count and heart are updated in the cache before the request lands. A
   * heart that waits on a round trip feels broken, and the server takes the
   * desired state rather than a toggle, so both sides settle on the same answer
   * either way.
   */
  const like = useMutation({
    mutationFn: ({ id, next }) => statusApi.setLike(id, next),
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: ['status-ring', userId] });
      const previous = queryClient.getQueryData(['status-ring', userId]);

      queryClient.setQueryData(['status-ring', userId], (old) =>
        Array.isArray(old)
          ? old.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    hasLiked: next,
                    likeCount: Math.max(0, (entry.likeCount ?? 0) + (next ? 1 : -1)),
                  }
                : entry,
            )
          : old,
      );

      return { previous };
    },
    // Put the old numbers back rather than leaving a heart that lied.
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['status-ring', userId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['status-ring', userId] });
      queryClient.invalidateQueries({ queryKey: ['status-feed'] });
    },
  });

  const remove = useMutation({
    mutationFn: (statusId) => statusApi.remove(statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-feed'] });
      queryClient.invalidateQueries({ queryKey: ['status-ring', userId] });
      toast.success('Status deleted');
      goBack();
    },
    onError: (error) => toast.error(error.message ?? 'Could not delete that'),
  });

  /**
   * Moves to the next status, or leaves when the ring is finished.
   *
   * The end-of-ring check reads `index` directly rather than doing it inside a
   * `setIndex` updater. Updater functions run during render, so navigating
   * from one changes the navigator while React is drawing this screen — React
   * flags it, and the closing story can leave the stack in a state where the
   * back gesture is the only way out.
   *
   * Closing beats wrapping to the first status: a ring that loops has no
   * natural end, so there is nothing to tell you that you have seen it all.
   */
  const advance = useCallback(() => {
    if (isLeavingRef.current) return;

    const total = items?.length ?? 0;

    if (index + 1 >= total) {
      isLeavingRef.current = true;
      goBack();
      return;
    }

    setProgress(0);
    elapsedRef.current = 0;
    durationRef.current = STILL_DURATION_MS;
    setIndex(index + 1);
  }, [index, items?.length]);

  // Marking a view is fire-and-forget: it must never delay the story, and the
  // server counts each viewer once however many times this is called.
  useEffect(() => {
    if (!current || current.isOwn || viewedRef.current.has(current.id)) return;

    viewedRef.current.add(current.id);
    statusApi
      .markViewed(current.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['status-feed'] }))
      .catch(() => undefined);
  }, [current, queryClient]);

  useEffect(() => {
    if (!current || isPaused || isViewerSheetOpen || isLeavingRef.current) return undefined;

    const timer = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const ratio = elapsedRef.current / durationRef.current;

      if (ratio >= 1) {
        advance();
        return;
      }

      setProgress(ratio);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [current, isPaused, isViewerSheetOpen, advance]);

  const setVideoDuration = useCallback((milliseconds) => {
    durationRef.current = milliseconds;
  }, []);

  function goBackOne() {
    setProgress(0);
    elapsedRef.current = 0;
    durationRef.current = STILL_DURATION_MS;
    // Tapping back on the first status restarts it rather than leaving, which
    // is the forgiving reading of a tap that may have been aimed at the photo.
    setIndex((value) => Math.max(0, value - 1));
  }

  function confirmDelete() {
    // Paused while the sheet is up, so the story does not advance out from
    // under the question being asked about it.
    setIsPaused(true);

    actionSheet.show({
      title: 'Delete this status?',
      message: 'It disappears for everyone straight away.',
      options: [
        { label: 'Delete', destructive: true, onPress: () => remove.mutate(current.id) },
      ],
      onClose: () => setIsPaused(false),
    });
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <Loading label="Opening…" />
      </View>
    );
  }

  if (!items?.length || !current) {
    return (
      <Pressable className="flex-1 items-center justify-center bg-black" onPress={goBack}>
        <Text className="text-[15px] text-white/70">Nothing to see here — it has expired.</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1">
        {current.type === 'image' ? (
          /*
           * A status is whatever shape the camera produced — a portrait
           * selfie, a landscape view, a square crop, a screenshot. The image
           * is always shown whole rather than cropped to fill, because
           * cropping a status silently throws away the part the person was
           * pointing at.
           *
           * Showing it whole leaves bars on any photo that is not exactly the
           * screen's shape, so the same image is stretched behind it and
           * blurred. The bars become an out-of-focus wash of the photo's own
           * colours instead of dead black, and portrait and landscape both
           * look deliberate.
           */
          <View className="flex-1">
            <Image
              source={{ uri: current.media.url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={40}
              // Dimmed so the sharp image in front always wins the eye.
              accessible={false}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#00000066' }]} />
            <Image
              source={{ uri: current.media.url }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={120}
            />
          </View>
        ) : null}

        {current.type === 'video' ? (
          <StatusVideo
            key={current.id}
            url={current.media.url}
            isPaused={isPaused || isViewerSheetOpen}
            onDuration={setVideoDuration}
          />
        ) : null}

        {current.type === 'text' ? (
          <Gradient
            colors={gradientFor(current.background)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1 items-center justify-center px-8"
          >
            <Text className="text-center text-[26px] font-semibold leading-9 text-white">
              {current.text}
            </Text>
          </Gradient>
        ) : null}

        {/*
          Tap the left third to go back, the right two thirds to skip, hold
          anywhere to pause. The zones are invisible on purpose — everyone
          already knows them, and drawing them would cover the story.
        */}
        <View className="absolute inset-0 flex-row" pointerEvents="box-none">
          <Pressable
            onPress={goBackOne}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
            delayLongPress={180}
            accessibilityRole="button"
            accessibilityLabel="Previous status"
            style={{ width: width / 3 }}
          />
          <Pressable
            onPress={advance}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
            delayLongPress={180}
            accessibilityRole="button"
            accessibilityLabel="Next status"
            className="flex-1"
          />
        </View>
      </View>

      <View className="absolute left-0 right-0" style={{ top: insets.top + 6 }} pointerEvents="box-none">
        <ProgressBars count={items.length} index={index} progress={progress} />

        <View className="flex-row items-center gap-3 px-4 pt-3">
          <Avatar
            uri={current.author?.avatarUrl}
            name={current.author?.nickname}
            gender={current.author?.gender}
            emoji={current.author?.avatarEmoji}
            color={current.author?.avatarColor}
            size={36}
          />

          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-white">
              {isOwn ? 'Your status' : current.author?.nickname}
            </Text>
            <Text className="text-[11px] text-white/70">{formatRelativeTime(current.createdAt)}</Text>
          </View>

          {isOwn ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete this status"
              className="px-2"
            >
              <Text className="text-lg">🗑️</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            className="px-2 py-1"
          >
            <Text className="text-xl text-white">✕</Text>
          </Pressable>
        </View>
      </View>

      {/* A caption sits over the media; a text status is already all caption. */}
      {current.type !== 'text' && current.text ? (
        <View
          className="absolute left-0 right-0 px-6"
          style={{ bottom: insets.bottom + (isOwn ? 76 : 24) }}
          pointerEvents="none"
        >
          <Text className="text-center text-[15px] leading-6 text-white">{current.text}</Text>
        </View>
      ) : null}

      {/* Footer: the author's view count on the left, the heart on the right.
          Everyone gets the heart; only the author gets the count. */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-6 py-4"
        style={{ bottom: insets.bottom }}
        pointerEvents="box-none"
      >
        {isOwn ? (
          <Pressable
            onPress={() => setIsViewerSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Seen by ${current.viewCount ?? 0}`}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="eye-outline" size={17} color="rgba(255,255,255,0.9)" />
            <Text className="text-[14px] font-medium text-white">
              {current.viewCount ?? 0} {current.viewCount === 1 ? 'view' : 'views'}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}

        <Pressable
          onPress={() => like.mutate({ id: current.id, next: !current.hasLiked })}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={current.hasLiked ? 'Remove like' : 'Like this status'}
          accessibilityState={{ selected: Boolean(current.hasLiked) }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
        >
          <Ionicons
            name={current.hasLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={current.hasLiked ? (colors.primary || '#FFFFFF') : '#FFFFFF'}
          />
          {current.likeCount > 0 ? (
            <Text className="text-[14px] font-medium text-white">{current.likeCount}</Text>
          ) : null}
        </Pressable>
      </View>

      {isViewerSheetOpen ? (
        <ViewerSheet statusId={current.id} onClose={() => setIsViewerSheetOpen(false)} />
      ) : null}
    </View>
  );
}
