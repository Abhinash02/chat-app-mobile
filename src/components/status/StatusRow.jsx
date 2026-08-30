import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '../ui.jsx';
import { SOCKET_EVENT } from '../../constants/events.js';
import { statusApi } from '../../api/endpoints.js';
import { useSocket } from '../../hooks/useSocket.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * One avatar with a ring around it.
 *
 * The ring is the whole affordance: a bright ring means there is something
 * unwatched, a grey one means you have already been through it. That is the
 * convention people arrive with, so it needs no label.
 */
function Ring({ author, hasUnseen, count, label, onPress, isOwn }) {
  const { colors } = useTheme();

  const ringColor = hasUnseen ? colors.primary : colors.border;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        isOwn ? (count ? 'Your status' : 'Add a status') : `${author?.nickname ?? 'Someone'}'s status`
      }
      className="items-center"
      style={{ width: 68 }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          borderWidth: 2.5,
          // An empty own-ring gets no border at all: a ring around nothing
          // promises something to watch that is not there.
          borderColor: isOwn && !count ? 'transparent' : ringColor,
        }}
      >
        <Avatar
          uri={author?.avatarUrl}
          name={author?.nickname}
          gender={author?.gender}
          emoji={author?.avatarEmoji}
          color={author?.avatarColor}
          size={54}
        />

        {isOwn ? (
          <View
            className="absolute bottom-0 right-0 h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{ backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: 13, lineHeight: 15 }}>+</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} className="mt-1.5 text-[11px]" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The row of status rings across the top of the chats screen.
 *
 * Your own ring is always first and always present, because it is also the
 * button that posts one — there is no separate "add status" affordance to find.
 */
export function StatusRow() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { on } = useSocket();

  const { data } = useQuery({
    queryKey: ['status-feed'],
    queryFn: statusApi.feed,
    staleTime: 30_000,
  });

  /*
   * The server says only that something was posted, not what. Refetching is
   * the right response: a story is a handful of rows, and merging a payload
   * into the grouped-and-sorted feed by hand would duplicate the server's
   * ordering rules in a second place.
   */
  useEffect(() => {
    const off = on(SOCKET_EVENT.STATUS_NEW, () => {
      queryClient.invalidateQueries({ queryKey: ['status-feed'] });
    });

    return () => off?.();
  }, [on, queryClient]);

  const own = data?.own;
  const rings = data?.rings ?? [];
  const ownCount = own?.items?.length ?? 0;

  return (
    <View className="pb-2 pt-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        data={rings}
        keyExtractor={(item) => item.author.userId}
        ListHeaderComponent={
          <Ring
            isOwn
            author={own?.author}
            count={ownCount}
            hasUnseen={false}
            label={ownCount ? 'Your status' : 'Add status'}
            onPress={() => router.push(ownCount ? `/status/${own.author.userId}` : '/status/new')}
          />
        }
        renderItem={({ item }) => (
          <Ring
            author={item.author}
            hasUnseen={item.hasUnseen}
            count={item.items.length}
            label={item.author.nickname}
            onPress={() => router.push(`/status/${item.author.userId}`)}
          />
        )}
      />
    </View>
  );
}
