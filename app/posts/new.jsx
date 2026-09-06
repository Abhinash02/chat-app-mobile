import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { GradientButton, Loading } from '../../src/components/ui.jsx';
import { ScreenHeader } from '../../src/components/ScreenHeader.jsx';
import { postsApi } from '../../src/api/endpoints.js';
import { appendFile, pickMultipleImages } from '../../src/lib/media.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

/** Matches MAX_POST_IMAGES on the server. */
const MAX_IMAGES = 5;
const MAX_CAPTION = 500;

/**
 * Compose a photo post, or edit the caption of an existing one.
 *
 * Editing reuses this screen with `?postId=`, but only for the words. Swapping
 * the picture under a post that already has likes and comments would turn
 * other people's replies into a response to something they never saw, so
 * changing photos means deleting and posting again.
 */
export default function NewPost() {
  const { postId } = useLocalSearchParams();
  const isEditing = Boolean(postId);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [assets, setAssets] = useState([]);
  const [caption, setCaption] = useState('');
  const [isPicking, setIsPicking] = useState(false);
  const [captionLoaded, setCaptionLoaded] = useState(false);

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.get(postId),
    enabled: isEditing,
  });

  // Seeded once, during render rather than from an effect: re-seeding on every
  // refetch would wipe out whatever the person had started typing.
  if (isEditing && existing && !captionLoaded) {
    setCaptionLoaded(true);
    setCaption(existing.caption ?? '');
  }

  const remaining = MAX_IMAGES - assets.length;

  async function addPhotos() {
    if (remaining <= 0) return;

    setIsPicking(true);
    try {
      const result = await pickMultipleImages({ limit: remaining });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.cancelled || !result.assets?.length) return;

      setAssets((current) => [...current, ...result.assets].slice(0, MAX_IMAGES));
    } finally {
      setIsPicking(false);
    }
  }

  function removeAt(index) {
    setAssets((current) => current.filter((_, position) => position !== index));
  }

  const create = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('caption', caption.trim());

      // Sequential rather than parallel: FormData is not safe to append to
      // from several promises at once, and the files are already on disk.
      for (const asset of assets) {
        await appendFile(form, { uri: asset.uri, mimeType: asset.mimeType, fieldName: 'images' });
      }

      return postsApi.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Posted');
      router.back();
    },
    onError: (error) => toast.error(error.message ?? 'Could not share that post'),
  });

  const update = useMutation({
    mutationFn: () => postsApi.update(postId, { caption: caption.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Caption updated');
      router.back();
    },
    onError: (error) => toast.error(error.message ?? 'Could not update that post'),
  });

  const isBusy = create.isPending || update.isPending;
  const canSubmit = isEditing ? captionLoaded : assets.length > 0;

  if (isEditing && isLoadingExisting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Edit caption" />
        <Loading label="Loading your post…" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={isEditing ? 'Edit caption' : 'New post'}
        subtitle={isEditing ? 'Photos stay as they are' : `Up to ${MAX_IMAGES} photos`}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: (insets.bottom || 16) + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(existing?.images ?? []).map((image) => (
                <Image
                  key={image.url}
                  source={{ uri: image.url }}
                  style={{ width: 64, height: 80, borderRadius: 12 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ))}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                {assets.map((asset, index) => (
                  <View key={`${asset.uri}-${index}`}>
                    <Image
                      source={{ uri: asset.uri }}
                      style={{
                        width: 96,
                        height: 120,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <Pressable
                      onPress={() => removeAt(index)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.danger || '#F5325B',
                        borderWidth: 2,
                        borderColor: colors.background,
                      }}
                    >
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </Pressable>

                    {/* First photo is the one the feed shows first. */}
                    {index === 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 999,
                          backgroundColor: 'rgba(27,16,36,0.72)',
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>COVER</Text>
                      </View>
                    ) : null}
                  </View>
                ))}

                {remaining > 0 ? (
                  <Pressable
                    onPress={addPhotos}
                    disabled={isPicking}
                    accessibilityRole="button"
                    accessibilityLabel="Add photos"
                    style={({ pressed }) => ({
                      width: 96,
                      height: 120,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: `${colors.primary}66`,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      opacity: pressed || isPicking ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="add" size={26} color={colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      {isPicking ? 'Opening…' : 'Add photo'}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.textMuted }}>{remaining} left</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginBottom: 18 }}>
                Photos are shrunk on your phone before uploading, so posting stays quick on mobile data.
              </Text>
            </>
          )}

          {/* ── Caption ── */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
            Caption
          </Text>
          <TextInput
            value={caption}
            onChangeText={(value) => setCaption(value.slice(0, MAX_CAPTION))}
            placeholder="Say something about these photos…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              minHeight: 96,
              maxHeight: 200,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.inputBorder || colors.border,
              backgroundColor: colors.inputBackground || colors.surface,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 14,
              color: colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'right' }}>
            {caption.length}/{MAX_CAPTION}
          </Text>

          <View style={{ marginTop: 20 }}>
            <GradientButton
              title={isEditing ? 'Save caption' : `Share ${assets.length || ''} ${assets.length === 1 ? 'photo' : 'photos'}`.trim()}
              isLoading={isBusy}
              disabled={!canSubmit || isBusy}
              onPress={() => (isEditing ? update.mutate() : create.mutate())}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
