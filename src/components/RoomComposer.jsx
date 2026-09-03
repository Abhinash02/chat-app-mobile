import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiPicker } from './EmojiPicker.jsx';
import { useActionSheet } from './ActionSheet.jsx';
import { SIZE_LIMITS, appendFile, captureWithCamera, formatDuration, isWithinLimit, pickFromLibrary } from '../lib/media.js';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

/**
 * While recording, the composer is replaced with a sleek recording indicator.
 */
function RecordingBar({ seconds, maxSeconds, onCancel, onSend }) {
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-center gap-3 px-4 py-3 mx-3 my-2"
      style={{
        backgroundColor: colors.surfaceAlt,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: `${colors.danger}33`,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.danger,
        }}
      />

      <Text className="text-sm font-bold tracking-wide" style={{ color: colors.textPrimary }}>
        {formatDuration(seconds)}
      </Text>

      <Text className="flex-1 text-xs" style={{ color: colors.textMuted }}>
        {seconds >= maxSeconds - 10 ? `${maxSeconds - seconds}s remaining` : 'Recording audio…'}
      </Text>

      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel recording"
        className="px-2 py-1 rounded-full"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text className="text-xs font-semibold" style={{ color: colors.danger }}>
          Cancel
        </Text>
      </Pressable>

      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice note"
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

/**
 * The live room message composer: text, emoji, photos, short video and voice notes.
 */
export function RoomComposer({ onSendText, onSendMedia, onNotice }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const actionSheet = useActionSheet();

  const [draft, setDraft] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const recorder = useVoiceRecorder({ onError: onNotice });
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

    actionSheet.show({
      title: 'Share media',
      message: 'Choose from Camera or Gallery',
      options: [
        { label: '📷  Take Photo / Video', onPress: () => pick(captureWithCamera) },
        { label: '🖼️  Photo Library', onPress: () => pick(pickFromLibrary) },
      ],
    });
  }

  async function pick(source) {
    const result = await source({ allowVideo: true });

    if (result.error) return onNotice?.(result.error);
    if (result.cancelled || !result.asset) return undefined;

    const { asset } = result;

    if (!isWithinLimit(asset.sizeBytes, asset.kind)) {
      return onNotice?.(`That ${asset.kind} is over ${SIZE_LIMITS[asset.kind]}MB. Try a smaller file.`);
    }

    return upload({ uri: asset.uri, mimeType: asset.mimeType, kind: asset.kind });
  }

  async function upload({ uri, mimeType, kind }) {
    setIsUploading(true);
    const caption = draft.trim();

    try {
      const formData = new FormData();
      await appendFile(formData, { uri, mimeType });
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
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : Math.max(insets.bottom, 8);

  return (
    <View style={{ backgroundColor: colors.surface }}>
      {isEmojiOpen ? (
        <EmojiPicker
          onSelect={(emoji) => setDraft((current) => current + emoji)}
          onClose={() => setIsEmojiOpen(false)}
        />
      ) : null}

      <View
        className="flex-row items-center px-3 pt-2.5"
        style={{
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {/* Unified Input Box Capsule: [Emoji] [TextInput] [Media Attachment] */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceAlt,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: colors.border,
            minHeight: 46,
            paddingLeft: 6,
            paddingRight: 8,
          }}
        >
          {/* Emoji Button inside box */}
          <Pressable
            onPress={() => setIsEmojiOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={isEmojiOpen ? 'Hide emoji' : 'Show emoji'}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isEmojiOpen ? `${colors.primary}20` : 'transparent',
              flexShrink: 0,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons
              name={isEmojiOpen ? 'keypad' : 'happy-outline'}
              size={22}
              color={isEmojiOpen ? colors.primary : colors.textSecondary}
            />
          </Pressable>

          {/* Text Input */}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setIsEmojiOpen(false)}
            placeholder="Say something…"
            placeholderTextColor={colors.textMuted}
            multiline={Platform.OS !== 'web'}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (draft.trim()) sendText();
            }}
            onKeyPress={(e) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault?.();
                if (draft.trim()) sendText();
              }
            }}
            maxLength={2000}
            editable={!isUploading}
            style={{
              flex: 1,
              minWidth: 0,
              maxHeight: 90,
              fontSize: 15,
              color: colors.textPrimary,
              paddingHorizontal: 8,
              paddingVertical: Platform.OS === 'ios' ? 8 : 6,
            }}
          />

          {/* Media / Attachment Button inside box */}
          <Pressable
            onPress={chooseAttachment}
            disabled={isUploading}
            accessibilityRole="button"
            accessibilityLabel="Attach media"
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="attach" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Send / Mic Action Button */}
        <Pressable
          onPress={hasDraft ? sendText : startRecording}
          disabled={isUploading}
          accessibilityRole="button"
          accessibilityLabel={hasDraft ? 'Send message' : 'Record voice message'}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
            backgroundColor: hasDraft ? colors.primary : colors.surfaceAlt,
            borderWidth: hasDraft ? 0 : 1,
            borderColor: colors.border,
            shadowColor: hasDraft ? colors.primary : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: hasDraft ? 0.3 : 0.05,
            shadowRadius: 4,
            elevation: 3,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={hasDraft ? '#FFFFFF' : colors.primary} />
          ) : hasDraft ? (
            <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          ) : (
            <Ionicons name="mic" size={21} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
