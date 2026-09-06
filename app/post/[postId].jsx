import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, EmptyState, Loading } from '../../src/components/ui.jsx';
import { PostCard } from '../../src/components/PostCard.jsx';
import { ScreenHeader } from '../../src/components/ScreenHeader.jsx';
import { postsApi } from '../../src/api/endpoints.js';
import { formatRelativeTime } from '../../src/lib/format.js';
import { useActionSheet } from '../../src/components/ActionSheet.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const MAX_COMMENT = 300;

function CommentRow({ comment, onMenu }) {
  const { colors } = useTheme();
  const author = comment.author;
  const displayName = author?.nickname || 'User';

  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
      <Pressable
        onPress={() => author?.userId && router.push(`/user/${author.userId}`)}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}'s profile`}
      >
        <Avatar
          uri={author?.avatarUrl}
          name={displayName}
          gender={author?.gender}
          emoji={author?.avatarEmoji}
          color={author?.avatarColor}
          size={32}
        />
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.textMuted }}>
            {formatRelativeTime(comment.createdAt)}
            {comment.editedAt ? ' · edited' : ''}
          </Text>
        </View>
        <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.textSecondary, marginTop: 2 }}>
          {comment.text}
        </Text>
      </View>

      {comment.canDelete ? (
        <Pressable
          onPress={() => onMenu(comment)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Comment options"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 2 })}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One post, with its comments underneath.
 *
 * The post itself is the list header rather than a fixed block above a
 * scroller, so a long comment thread scrolls the photo out of the way instead
 * of fighting it for the screen.
 */
export default function PostDetail() {
  const { postId } = useLocalSearchParams();

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const actionSheet = useActionSheet();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.get(postId),
  });

  const { data: commentPage, isLoading: isLoadingComments } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => postsApi.comments(postId, { limit: 50 }),
  });

  const comments = Array.isArray(commentPage?.items) ? commentPage.items : [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
    queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }

  const like = useMutation({
    mutationFn: (next) => postsApi.setLike(postId, next),
    onSuccess: () => refresh(),
    onError: () => toast.error('Could not update that like'),
  });

  const send = useMutation({
    mutationFn: (text) =>
      editingId ? postsApi.updateComment(editingId, text) : postsApi.addComment(postId, text),
    onSuccess: () => {
      setDraft('');
      setEditingId(null);
      refresh();
    },
    onError: (mutationError) => toast.error(mutationError.message ?? 'Could not post that comment'),
  });

  const removeComment = useMutation({
    mutationFn: (commentId) => postsApi.removeComment(commentId),
    onSuccess: () => {
      refresh();
      toast.success('Comment deleted');
    },
    onError: (mutationError) => toast.error(mutationError.message ?? 'Could not delete that comment'),
  });

  const removePost = useMutation({
    mutationFn: () => postsApi.remove(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted');
      router.back();
    },
    onError: (mutationError) => toast.error(mutationError.message ?? 'Could not delete that post'),
  });

  function handleCommentMenu(comment) {
    actionSheet.show({
      title: 'Comment',
      options: [
        // Only the author of a comment can rewrite it; the post's owner can
        // remove it but never put different words in someone's mouth.
        ...(comment.isOwn
          ? [{
              label: 'Edit',
              onPress: () => {
                setEditingId(comment.id);
                setDraft(comment.text);
              },
            }]
          : []),
        { label: 'Delete', destructive: true, onPress: () => removeComment.mutate(comment.id) },
      ],
    });
  }

  function handlePostMenu() {
    actionSheet.show({
      title: 'Your post',
      options: [
        { label: 'Edit caption', onPress: () => router.push(`/posts/new?postId=${postId}`) },
        { label: 'Delete post', destructive: true, onPress: () => removePost.mutate() },
      ],
    });
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Post" />
        <Loading label="Opening…" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Post" />
        <EmptyState
          emoji="🕊️"
          title="This post is gone"
          description="It may have been deleted by whoever shared it."
        />
      </View>
    );
  }

  const isEditing = Boolean(editingId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Post" subtitle={`${post.commentCount ?? 0} comments`} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => String(item?.id ?? `comment-${index}`)}
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <PostCard
                post={post}
                onToggleLike={() => like.mutate(!post.hasLiked)}
                onOpenComments={() => undefined}
                onMenu={post.isOwn ? handlePostMenu : undefined}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: colors.textPrimary,
                  marginTop: 4,
                  marginBottom: 4,
                }}
              >
                Comments
              </Text>
            </View>
          }
          renderItem={({ item }) => <CommentRow comment={item} onMenu={handleCommentMenu} />}
          ListEmptyComponent={
            isLoadingComments ? null : (
              <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  No comments yet — say the first thing.
                </Text>
              </View>
            )
          }
        />

        {/* ── Composer ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: (insets.bottom || 8) + 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flex: 1 }}>
            {isEditing ? (
              <Pressable
                onPress={() => {
                  setEditingId(null);
                  setDraft('');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}
              >
                <Ionicons name="close-circle" size={13} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                  Editing a comment — tap to cancel
                </Text>
              </Pressable>
            ) : null}

            <TextInput
              value={draft}
              onChangeText={(value) => setDraft(value.slice(0, MAX_COMMENT))}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                maxHeight: 110,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.inputBorder || colors.border,
                backgroundColor: colors.inputBackground || colors.background,
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                color: colors.textPrimary,
              }}
            />
          </View>

          <Pressable
            onPress={() => send.mutate(draft.trim())}
            disabled={!draft.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save comment' : 'Send comment'}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? colors.primary : colors.surfaceAlt,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name={isEditing ? 'checkmark' : 'send'}
              size={17}
              color={draft.trim() ? (colors.onPrimary || '#FFFFFF') : colors.textMuted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
