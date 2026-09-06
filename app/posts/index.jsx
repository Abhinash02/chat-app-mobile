import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../../src/components/ui.jsx';
import { PostCard } from '../../src/components/PostCard.jsx';
import { ScreenHeader } from '../../src/components/ScreenHeader.jsx';
import { Skeleton } from '../../src/components/Loader.jsx';
import { postsApi } from '../../src/api/endpoints.js';
import { useActionSheet } from '../../src/components/ActionSheet.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const SORTS = [
  { key: 'newest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
];

function FeedSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
      {[0, 1].map((index) => (
        <View
          key={index}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
            <Skeleton width={38} height={38} radius={19} />
            <View style={{ flex: 1 }}>
              <Skeleton width="45%" height={11} />
              <Skeleton width="25%" height={9} style={{ marginTop: 5 }} />
            </View>
          </View>
          <Skeleton width="100%" height={320} radius={0} />
          <View style={{ padding: 12 }}>
            <Skeleton width="70%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The photo feed.
 *
 * Likes are applied to the cache before the request finishes: a heart that
 * waits for a round trip before filling in feels broken on a phone, and the
 * server settles on the same answer either way because it takes the desired
 * state rather than a toggle.
 */
export default function PostsFeed() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const actionSheet = useActionSheet();
  const queryClient = useQueryClient();

  const [sort, setSort] = useState('newest');

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['posts', 'feed', sort],
    queryFn: () => postsApi.feed({ sort, limit: 20 }),
  });

  const posts = Array.isArray(data?.items) ? data.items : [];

  const like = useMutation({
    mutationFn: ({ postId, next }) => postsApi.setLike(postId, next),
    onMutate: async ({ postId, next }) => {
      await queryClient.cancelQueries({ queryKey: ['posts', 'feed', sort] });
      const previous = queryClient.getQueryData(['posts', 'feed', sort]);

      queryClient.setQueryData(['posts', 'feed', sort], (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  hasLiked: next,
                  likeCount: Math.max(0, (post.likeCount ?? 0) + (next ? 1 : -1)),
                }
              : post,
          ),
        };
      });

      return { previous };
    },
    // Put the old numbers back rather than leaving a heart that lied.
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['posts', 'feed', sort], context.previous);
      toast.error('Could not update that like');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const remove = useMutation({
    mutationFn: (postId) => postsApi.remove(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted');
    },
    onError: (mutationError) => toast.error(mutationError.message ?? 'Could not delete that post'),
  });

  const handleToggleLike = useCallback(
    (post) => like.mutate({ postId: post.id, next: !post.hasLiked }),
    [like],
  );

  const handleOpenComments = useCallback((post) => router.push(`/post/${post.id}`), []);

  const handleMenu = useCallback(
    (post) => {
      actionSheet.show({
        title: 'Your post',
        options: [
          { label: 'Edit caption', onPress: () => router.push(`/posts/new?postId=${post.id}`) },
          { label: 'Delete post', destructive: true, onPress: () => remove.mutate(post.id) },
        ],
      });
    },
    [actionSheet, remove],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Photo posts"
        subtitle="Share up to 5 photos"
        right={
          <Pressable
            onPress={() => router.push('/posts/new')}
            accessibilityRole="button"
            accessibilityLabel="New post"
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add" size={15} color={colors.onPrimary || '#FFFFFF'} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.onPrimary || '#FFFFFF' }}>
              Post
            </Text>
          </Pressable>
        }
      />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {SORTS.map((option) => {
          const isActive = sort === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setSort(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: isActive ? (colors.onPrimary || '#FFFFFF') : colors.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <EmptyState emoji="📡" title="Could not load posts" description={error.message} />
      ) : isLoading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item, index) => String(item?.id ?? `post-${index}`)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: (insets.bottom || 16) + 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={handleToggleLike}
              onOpenComments={handleOpenComments}
              onMenu={handleMenu}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="📷"
              title="No photo posts yet"
              description="Be the first — share up to five photos and see who likes them."
            />
          }
        />
      )}
    </View>
  );
}
