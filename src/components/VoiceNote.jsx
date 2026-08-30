import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { formatDuration } from '../lib/media.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/** Enough bars to read as a waveform, few enough to stay legible in a bubble. */
const BAR_COUNT = 27;

/**
 * A stable pseudo-waveform for a URL.
 *
 * Real amplitude data would mean downloading and decoding the file before the
 * bubble could be drawn. The bars exist to show progress, not to describe the
 * audio — but they are derived from the URL rather than random so a given note
 * looks the same on every render and on every device, which is what stops it
 * reading as noise.
 */
function barsFor(url) {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) | 0;
  }

  return Array.from({ length: BAR_COUNT }, (_unused, index) => {
    const value = Math.sin(hash * 0.0001 + index * 1.7) * Math.cos(index * 0.6);
    return 0.35 + Math.abs(value) * 0.65;
  });
}

/**
 * A voice note with play/pause and a progress waveform.
 *
 * The player is created per bubble by `useAudioPlayer`, which releases it on
 * unmount — a room with fifty voice notes must not hold fifty live decoders.
 */
export function VoiceNote({ url, durationSeconds, isMine }) {
  const { colors } = useTheme();
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);

  const bars = useMemo(() => barsFor(url ?? ''), [url]);

  const foreground = isMine ? colors.onPrimary : colors.textPrimary;
  const muted = isMine ? `${colors.onPrimary}66` : colors.textMuted;

  /*
   * The server's duration is authoritative and available immediately; the
   * player's is only known once enough of the file has loaded. Preferring the
   * server's stops the label flicking from 0:00 to the real length on open.
   */
  const total = durationSeconds ?? (status.duration || 0);
  const elapsed = status.currentTime ?? 0;
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }

    // Replaying a finished note has to rewind first, or play() is a no-op at
    // the end of the file and the button looks dead.
    if (status.didJustFinish || (total > 0 && elapsed >= total - 0.15)) {
      player.seekTo(0);
    }

    player.play();
  }

  return (
    <View className="flex-row items-center gap-3" style={{ minWidth: 190 }}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isMine ? `${colors.onPrimary}2A` : colors.surfaceAlt }}
      >
        <Text style={{ color: foreground, fontSize: 14 }}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>

      <View className="flex-1">
        <View className="h-7 flex-row items-center gap-[2px]">
          {bars.map((height, index) => (
            <View
              key={index}
              className="flex-1 rounded-full"
              style={{
                height: `${height * 100}%`,
                minHeight: 3,
                backgroundColor: index / BAR_COUNT <= progress ? foreground : muted,
              }}
            />
          ))}
        </View>

        <Text className="mt-0.5 text-[10px]" style={{ color: muted }}>
          {status.playing || elapsed > 0 ? formatDuration(elapsed) : formatDuration(total)}
        </Text>
      </View>
    </View>
  );
}
