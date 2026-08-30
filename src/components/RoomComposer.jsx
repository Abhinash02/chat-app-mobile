import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { EmojiPicker } from './EmojiPicker.jsx';
import { SIZE_LIMITS, captureWithCamera, formatDuration, isWithinLimit, pickFromLibrary, toFormFile } from '../lib/media.js';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

/**
 * While recording, the composer is replaced rather than decorated.
 *
 * Half a UI that is live and half that is not invites taps on a text field
 * that will not accept them. Recording is a mode, so it looks like one.
 */
function RecordingBar({ seconds, maxSeconds, onCancel, onSend }) {
  const { colors, radius } = useTheme();

  return (
    <View
      className="flex-row items-center gap-3 px-4 py-3"
      style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius, margin: 8 }}
    >
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.danger }} />

      <Text className="text-[15px] font-semibold" style={{ color: colors.textPrimary }}>
        {formatDuration(seconds)}
      </Text>

      <Text className="flex-1 text-[12px]" style={{ color: colors.textMuted }}>
        {seconds >= maxSeconds - 10 ? `${maxSeconds - seconds}s left` : 'Recording…'}
      </Text>

      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel recording" className="px-2">
        <Text className="text-[13px] font-medium" style={{ color: colors.danger }}>
          Cancel
        </Text>
      </Pressable>

      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice note"
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary }}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 16 }}>➤</Text>
      </Pressable>
    </View>
  );
}

/**
 * The room input: text, emoji, photos, short video and voice notes.
 *
 * Sending is tap-to-start / tap-to-send rather than press-and-hold. Hold works
 * on a phone in one hand and nowhere else — a slipped finger loses the whole
 * recording, and there is no way to hold a button while reading the room.
 */
export function RoomComposer({ onSendText, onSendMedia, onNotice }) {
  const { colors, radius } = useTheme();

  const [draft, setDraft] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const recorder = useVoiceRecorder({ onError: onNotice });

  /*
   * A recording that hits the ceiling is sent rather than dropped: someone has
   * been talking for two minutes and losing it would be unforgivable. The ref
   * keeps this out of the effect's dependencies — `finishRecording` is rebuilt
   * every render, and depending on it would stop and send on every tick.
   */
  const finishRef = useRef(null);

  useEffect(() => {
    finishRef.current = finishRecording;
  });

  useEffect(() => {
    if (recorder.isRecording && recorder.seconds >= recorder.maxSeconds) {
      finishRef.current?.();
    }
  }, [recorder.isRecording, recorder.seconds, recorder.maxSeconds]);

  async function startRecording() {
    if (isUploading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    await recorder.start();
  }

  async function finishRecording() {
    const recording = await recorder.stop();
    if (!recording) return;

    await upload({ uri: recording.uri, kind: 'audio' });
  }

  async function chooseAttachment() {
    if (isUploading || recorder.isRecording) return;

    Alert.alert('Share something', 'Choose where it comes from', [
      { text: 'Camera', onPress: () => pick(captureWithCamera) },
      { text: 'Gallery', onPress: () => pick(pickFromLibrary) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pick(source) {
    const result = await source({ allowVideo: true });

    if (result.error) return onNotice?.(result.error);
    if (result.cancelled || !result.asset) return undefined;

    const { asset } = result;

    /*
     * Checked before the upload starts. Discovering a file is too big after
     * waiting for it to transfer over a slow connection is the worst possible
     * moment to find out.
     */
    if (!isWithinLimit(asset.sizeBytes, asset.kind)) {
      return onNotice?.(`That ${asset.kind} is over ${SIZE_LIMITS[asset.kind]}MB. Try a shorter one.`);
    }

    return upload({ uri: asset.uri, mimeType: asset.mimeType, kind: asset.kind });
  }

  async function upload({ uri, mimeType, kind }) {
    setIsUploading(true);

    const caption = draft.trim();

    try {
      const formData = new FormData();
      toFormFile(formData, { uri, mimeType });
      // A caption rides along with the file, so a photo can be sent with a
      // line of text as one message rather than two.
      if (caption && kind !== 'audio') formData.append('caption', caption);

      await onSendMedia(formData);
      if (kind !== 'audio') setDraft('');
    } catch (error) {
      onNotice?.(error.message ?? 'Could not send that');
    } finally {
      setIsUploading(false);
    }
  }

  async function sendText() {
    const text = draft.trim();
    if (!text) return;

    setDraft('');

    try {
      await onSendText(text);
    } catch (error) {
      setDraft(text);
      onNotice?.(error.message ?? 'Could not send that');
    }
  }

  if (recorder.isRecording) {
    return (
      <RecordingBar
        seconds={recorder.seconds}
        maxSeconds={recorder.maxSeconds}
        onCancel={recorder.cancel}
        onSend={finishRecording}
      />
    );
  }

  const hasDraft = draft.trim().length > 0;

  return (
    <View>
      {isEmojiOpen ? (
        <EmojiPicker
          onSelect={(emoji) => setDraft((current) => current + emoji)}
          onClose={() => setIsEmojiOpen(false)}
        />
      ) : null}

      <View
        className="flex-row items-end gap-1.5 px-2 pt-2"
        style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <Pressable
          onPress={() => setIsEmojiOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={isEmojiOpen ? 'Hide emoji' : 'Show emoji'}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: isEmojiOpen ? colors.surfaceAlt : 'transparent' }}
        >
          <Text className="text-xl">😊</Text>
        </Pressable>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setIsEmojiOpen(false)}
          placeholder="Say something…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!isUploading}
          className="max-h-24 flex-1 px-4 py-2.5 text-[15px]"
          style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius, color: colors.textPrimary }}
        />

        <Pressable
          onPress={chooseAttachment}
          disabled={isUploading}
          accessibilityRole="button"
          accessibilityLabel="Send a photo or video"
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Text className="text-xl">📎</Text>
        </Pressable>

        {/* The send button becomes a microphone when there is nothing to send,
            so one slot serves both and neither needs explaining. */}
        <Pressable
          onPress={hasDraft ? sendText : startRecording}
          disabled={isUploading}
          accessibilityRole="button"
          accessibilityLabel={hasDraft ? 'Send' : 'Record a voice note'}
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: hasDraft ? colors.primary : colors.surfaceAlt }}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ color: hasDraft ? colors.onPrimary : colors.textPrimary, fontSize: hasDraft ? 18 : 20 }}>
              {hasDraft ? '➤' : '🎙️'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
