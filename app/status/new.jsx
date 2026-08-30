import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Gradient } from '../../src/components/Gradient.jsx';
import { goBack } from '../../src/components/ScreenHeader.jsx';
import { MAX_STATUS_TEXT_LENGTH, MAX_STATUS_VIDEO_SECONDS, STATUS_BACKGROUNDS } from '../../src/constants/status.js';
import { SIZE_LIMITS, captureWithCamera, isWithinLimit, pickFromLibrary, toFormFile } from '../../src/lib/media.js';
import { statusApi } from '../../src/api/endpoints.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

/**
 * Posting a status: type something, or pick a photo or a short video.
 *
 * One screen rather than a mode switch. Choosing a photo replaces the text
 * canvas with a preview and the same text field becomes its caption, so there
 * is nothing to learn between the two.
 */
export default function NewStatusScreen() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [background, setBackground] = useState(STATUS_BACKGROUNDS[0].id);
  const [asset, setAsset] = useState(null);

  const post = useMutation({
    mutationFn: async () => {
      if (asset) {
        const formData = new FormData();
        toFormFile(formData, { uri: asset.uri, mimeType: asset.mimeType });
        if (text.trim()) formData.append('caption', text.trim());
        return statusApi.postMedia(formData);
      }

      return statusApi.postText({ text: text.trim(), background });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-feed'] });
      toast.success('Posted — it disappears in 24 hours');
      goBack();
    },
    onError: (error) => toast.error(error.message ?? 'Could not post that'),
  });

  async function pick(source) {
    const result = await source({ allowVideo: true, videoMaxSeconds: MAX_STATUS_VIDEO_SECONDS });

    if (result.error) return toast.error(result.error);
    if (result.cancelled || !result.asset) return undefined;

    const chosen = result.asset;

    if (!isWithinLimit(chosen.sizeBytes, chosen.kind)) {
      return toast.error(`That ${chosen.kind} is over ${SIZE_LIMITS[chosen.kind]}MB. Try a shorter one.`);
    }

    /*
     * The picker trims to fifteen seconds where the platform supports it, but
     * a file chosen from the library can arrive longer. Saying so here beats
     * letting someone wait through an upload for a rejection.
     */
    if (chosen.kind === 'video' && chosen.durationSeconds > MAX_STATUS_VIDEO_SECONDS + 1) {
      return toast.error(`Videos can be ${MAX_STATUS_VIDEO_SECONDS} seconds. That one is ${chosen.durationSeconds}.`);
    }

    return setAsset(chosen);
  }

  const gradient =
    STATUS_BACKGROUNDS.find((entry) => entry.id === background)?.colors ?? STATUS_BACKGROUNDS[0].colors;

  const canPost = asset ? true : text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Cancel" className="px-1">
          <Text className="text-[15px]" style={{ color: colors.textSecondary }}>
            Cancel
          </Text>
        </Pressable>

        <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
          New status
        </Text>

        <Pressable
          onPress={() => post.mutate()}
          disabled={!canPost || post.isPending}
          accessibilityRole="button"
          accessibilityLabel="Post status"
          className="px-3 py-1.5"
          style={{ backgroundColor: canPost ? colors.primary : colors.surfaceAlt, borderRadius: radius }}
        >
          {post.isPending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text className="text-[14px] font-semibold" style={{ color: canPost ? colors.onPrimary : colors.textMuted }}>
              Post
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {asset ? (
          <View className="px-4 pt-2">
            <View style={{ borderRadius: radius, overflow: 'hidden', backgroundColor: '#000', height: 380 }}>
              {asset.kind === 'video' ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-5xl">🎬</Text>
                  <Text className="mt-2 text-[13px] text-white/80">
                    {asset.durationSeconds ? `${asset.durationSeconds}s video ready` : 'Video ready'}
                  </Text>
                </View>
              ) : (
                <Image source={{ uri: asset.uri }} style={{ flex: 1 }} contentFit="contain" />
              )}
            </View>

            <Pressable
              onPress={() => setAsset(null)}
              accessibilityRole="button"
              accessibilityLabel="Remove this photo"
              className="mt-2 self-center px-3 py-1.5"
            >
              <Text className="text-[13px]" style={{ color: colors.danger }}>
                Choose something else
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-4 pt-2">
            <Gradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="items-center justify-center px-6"
              style={{ height: 300, borderRadius: radius }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type something…"
                placeholderTextColor="#FFFFFFAA"
                multiline
                maxLength={MAX_STATUS_TEXT_LENGTH}
                textAlign="center"
                className="w-full text-[24px] font-semibold leading-8"
                style={{ color: '#FFFFFF' }}
              />
            </Gradient>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 14, paddingHorizontal: 2 }}
            >
              {STATUS_BACKGROUNDS.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => setBackground(entry.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.id} background`}
                  accessibilityState={{ selected: entry.id === background }}
                >
                  <Gradient
                    colors={entry.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      borderWidth: entry.id === background ? 3 : 0,
                      borderColor: colors.textPrimary,
                    }}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {asset ? (
          <View className="px-4 pt-3">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a caption…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_STATUS_TEXT_LENGTH}
              className="max-h-24 px-4 py-3 text-[15px]"
              style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius, color: colors.textPrimary }}
            />
          </View>
        ) : null}

        <View className="flex-row gap-3 px-4 pt-4">
          <Pressable
            onPress={() => pick(captureWithCamera)}
            accessibilityRole="button"
            accessibilityLabel="Take a photo or video"
            className="flex-1 items-center py-3.5"
            style={{ backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-xl">📷</Text>
            <Text className="mt-1 text-[13px] font-medium" style={{ color: colors.textPrimary }}>
              Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={() => pick(pickFromLibrary)}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            className="flex-1 items-center py-3.5"
            style={{ backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-xl">🖼️</Text>
            <Text className="mt-1 text-[13px] font-medium" style={{ color: colors.textPrimary }}>
              Gallery
            </Text>
          </Pressable>
        </View>

        <Text className="px-4 pt-4 text-center text-[12px]" style={{ color: colors.textMuted }}>
          Your status disappears after 24 hours. Videos can be up to {MAX_STATUS_VIDEO_SECONDS} seconds.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
