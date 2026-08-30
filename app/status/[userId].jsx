import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Gradient } from '../../src/components/Gradient.jsx';
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

  const advance = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    durationRef.current = STILL_DURATION_MS;

    setIndex((current_) => {
      // Past the last one, the ring is over and the screen closes. Falling
      // back to the first would trap someone in a loop with no way out but
      // the back gesture.
      if (current_ + 1 >= (items?.length ?? 0)) {
        goBack();
        return current_;
      }
      return current_ + 1;
    });
  }, [items?.length]);

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
    if (!current || isPaused || isViewerSheetOpen) return undefined;

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
    setIndex((current_) => Math.max(0, current_ - 1));
  }

  function confirmDelete() {
    Alert.alert('Delete this status?', 'It disappears for everyone straight away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(current.id) },
    ]);
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

          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Close" className="px-2">
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

      {isOwn ? (
        <Pressable
          onPress={() => setIsViewerSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Seen by ${current.viewCount ?? 0}`}
          className="absolute left-0 right-0 flex-row items-center justify-center gap-2 py-4"
          style={{ bottom: insets.bottom }}
        >
          <Text className="text-base">👁️</Text>
          <Text className="text-[14px] font-medium text-white">
            {current.viewCount ?? 0} {current.viewCount === 1 ? 'view' : 'views'}
          </Text>
        </Pressable>
      ) : null}

      {isViewerSheetOpen ? (
        <ViewerSheet statusId={current.id} onClose={() => setIsViewerSheetOpen(false)} />
      ) : null}
    </View>
  );
}
