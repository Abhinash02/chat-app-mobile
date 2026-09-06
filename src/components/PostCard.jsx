import { memo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from './ui.jsx';
import { formatRelativeTime } from '../lib/format.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * One photo post in the feed.
 *
 * The picture is the point, so it gets the full card width and a fixed 4:5
 * frame. Letting each post size itself to its own image makes the feed jump
 * around as pictures load, and a portrait shot next to a landscape one turns
 * scrolling into a series of surprises.
 */
function PostCardComponent({
  post,
  onToggleLike,
  onOpenComments,
  onMenu,
  isLikePending,
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const [page, setPage] = useState(0);

  if (!post) return null;

  const images = Array.isArray(post.images) ? post.images : [];
  const author = post.author;
  const displayName = author?.nickname || 'User';

  // Full-bleed inside the card's own horizontal padding.
  const frameWidth = Math.max(0, width - 32);
  const frameHeight = Math.round(frameWidth * 1.25);

  function handleScroll(event) {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, frameWidth));
    if (next !== page) setPage(next);
  }

  function openAuthor() {
    if (author?.userId) router.push(`/user/${author.userId}`);
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#0F0817',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {/* ── Author row ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <Pressable onPress={openAuthor} accessibilityRole="button" accessibilityLabel={`${displayName}'s profile`}>
          <Avatar
            uri={author?.avatarUrl}
            name={displayName}
            gender={author?.gender}
            emoji={author?.avatarEmoji}
            color={author?.avatarColor}
            size={38}
            isOnline={author?.isOnline}
            showPresence
          />
        </Pressable>

        <Pressable onPress={openAuthor} style={{ flex: 1, minWidth: 0 }} accessibilityRole="button">
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 1 }}>
            {formatRelativeTime(post.createdAt)}
            {post.editedAt ? ' · edited' : ''}
          </Text>
        </Pressable>

        {/* The menu is the author's own — edit and delete belong to them alone. */}
        {post.isOwn && onMenu ? (
          <Pressable
            onPress={() => onMenu(post)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Post options"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Images ── */}
      <View style={{ width: frameWidth, height: frameHeight, alignSelf: 'center', backgroundColor: colors.surfaceAlt }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          // A single photo has nowhere to go; locking it stops a rubber-band
          // drag that looks like a broken carousel.
          scrollEnabled={images.length > 1}
        >
          {images.map((image, index) => (
            <Image
              key={image.url ?? index}
              source={{ uri: image.url }}
              style={{ width: frameWidth, height: frameHeight }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={image.url}
            />
          ))}
        </ScrollView>

        {/* Counter, so it is obvious there is more than one before swiping. */}
        {images.length > 1 ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: 'rgba(27,16,36,0.72)',
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
              {page + 1}/{images.length}
            </Text>
          </View>
        ) : null}

        {images.length > 1 ? (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {images.map((image, index) => (
              <View
                key={image.url ?? index}
                style={{
                  width: index === page ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: index === page ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* ── Actions ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10 }}>
        <Pressable
          onPress={() => onToggleLike?.(post)}
          disabled={isLikePending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={post.hasLiked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: Boolean(post.hasLiked) }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: post.hasLiked ? `${colors.danger || '#F5325B'}14` : 'transparent',
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons
            name={post.hasLiked ? 'heart' : 'heart-outline'}
            size={19}
            color={post.hasLiked ? (colors.danger || '#F5325B') : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: post.hasLiked ? (colors.danger || '#F5325B') : colors.textSecondary,
            }}
          >
            {post.likeCount ?? 0}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onOpenComments?.(post)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comments"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary }}>
            {post.commentCount ?? 0}
          </Text>
        </Pressable>
      </View>

      {/* ── Caption ── */}
      {post.caption ? (
        <Pressable onPress={() => onOpenComments?.(post)} style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.textPrimary }} numberOfLines={3}>
            <Text style={{ fontWeight: '800' }}>{displayName} </Text>
            {post.caption}
          </Text>
        </Pressable>
      ) : (
        <View style={{ height: 12 }} />
      )}

      {post.commentCount > 0 ? (
        <Pressable onPress={() => onOpenComments?.(post)} style={{ paddingHorizontal: 14, paddingBottom: 12, marginTop: -6 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
            View {post.commentCount === 1 ? '1 comment' : `all ${post.commentCount} comments`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Memoised: liking one post must not re-render every image view in the feed. */
export const PostCard = memo(PostCardComponent);

export default PostCard;
