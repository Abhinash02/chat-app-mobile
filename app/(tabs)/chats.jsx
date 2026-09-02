import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, EmptyState, Loading } from '../../src/components/ui.jsx';
import { StatusRow } from '../../src/components/status/StatusRow.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi } from '../../src/api/endpoints.js';
import { formatRelativeTime } from '../../src/lib/format.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';

function ConversationRow({ conversation, presence, onPress }) {
  const { colors } = useTheme();

  const { partner, lastMessage, unreadCount } = conversation;
  const isOnline = presence?.[partner.id]?.isOnline ?? partner.isOnline;
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${partner.nickname}${hasUnread ? `, ${unreadCount} unread` : ''}`}
      className="flex-row items-center gap-3 px-4 py-3"
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })}
    >
      <Avatar
        uri={partner.avatarUrl}
        name={partner.nickname}
        gender={partner.gender}
        emoji={partner.avatarEmoji}
        color={partner.avatarColor}
        size={54}
        isOnline={isOnline}
        showPresence
      />

      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${hasUnread ? 'font-bold' : 'font-semibold'}`}
            style={{ color: colors.textPrimary }}
          >
            {partner.nickname}
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textMuted }}>
            {formatRelativeTime(conversation.lastMessageAt)}
          </Text>
        </View>

        <View className="mt-0.5 flex-row items-center gap-2">
          <Text
            numberOfLines={1}
            className="flex-1 text-sm"
            style={{
              color: hasUnread ? colors.textPrimary : colors.textMuted,
              fontWeight: hasUnread ? '600' : '400',
            }}
          >
            {/* Naming the sender stops "Hi" reading as if they wrote it. */}
            {lastMessage?.isMine ? 'You: ' : ''}
            {lastMessage?.text ?? 'Say hello'}
          </Text>

          {hasUnread ? (
            <View
              className="min-w-[20px] items-center justify-center rounded-full px-1.5"
              style={{ backgroundColor: colors.primary, height: 20 }}
            >
              <Text className="text-[11px] font-bold" style={{ color: colors.onPrimary }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Chats() {
  const { colors } = useTheme();
  const { presence, setUnreadCount, on } = useSocket();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations({ limit: 30 }),
  });

  useEffect(() => {
    if (!on) return undefined;
    const offMessage = on(SOCKET_EVENT.MESSAGE_NEW, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const offReceipt = on(SOCKET_EVENT.MESSAGE_READ_RECEIPT, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      offMessage?.();
      offReceipt?.();
    };
  }, [on, queryClient]);

  /**
   * Refetch on focus. Coming back from a chat means at least the unread count
   * and the last message have changed, and a stale list is immediately obvious
   * to the user.
   */
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      chatApi
        .unreadCount()
        .then((result) => setUnreadCount(result.unreadCount))
        .catch(() => undefined);
    }, [queryClient, setUnreadCount]),
  );

  const conversations = data?.items ?? [];

  /*
   * Split by who is actually online right now, using live presence rather than
   * the `isOnline` baked into the conversation payload — that value is only as
   * fresh as the last fetch, and this list is the one place a green dot going
   * out should be visible immediately.
   *
   * Order within each group is preserved, so the most recent conversation is
   * still first.
   */
  const sections = (() => {
    const active = [];
    const away = [];

    for (const conversation of conversations) {
      const partnerId = conversation.partner?.id;
      const isOnline = presence?.[partnerId]?.isOnline ?? conversation.partner?.isOnline;
      (isOnline ? active : away).push(conversation);
    }

    return [
      { title: 'Active now', isOnline: true, data: active },
      { title: 'Offline', isOnline: false, data: away },
    ];
  })();


  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          Chats
        </Text>
        <WalletHeader compact />
      </View>

      {isLoading ? (
        <Loading label="Loading your chats…" />
      ) : error ? (
        <EmptyState emoji="📡" title="Could not load your chats" description={error.message} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          // The rings sit above the conversations and stay put when there are
          // none, because posting a status is worth doing before you have any
          // chats — often it is what starts one.
          ListHeaderComponent={<StatusRow />}
          renderSectionHeader={({ section }) =>
            section.data.length > 0 ? (
              <View
                className="flex-row items-center gap-2 px-4 pb-2 pt-4"
                style={{ backgroundColor: colors.background }}
              >
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: section.isOnline ? colors.onlineDot : colors.offlineDot }}
                />
                <Text
                  className="text-xs font-bold uppercase"
                  style={{ color: colors.textSecondary, letterSpacing: 0.8 }}
                >
                  {section.title}
                </Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {section.data.length}
                </Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View className="ml-[74px] h-px" style={{ backgroundColor: colors.border }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              presence={presence}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="💬"
              title="No chats yet"
              description="Head to Discover and tap someone's profile — we will send the first hello for you."
            />
          }
        />
      )}
    </View>
  );
}
