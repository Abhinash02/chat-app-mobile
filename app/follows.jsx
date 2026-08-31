import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Avatar, Button, EmptyState, Loading } from '../src/components/ui.jsx';
import { chatApi, usersApi } from '../src/api/endpoints.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

export default function FollowsScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const targetUserId = params.userId || user?.id;
  const initialTab = params.tab === 'following' ? 'following' : 'followers';
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    data: followers,
    isLoading: isLoadingFollowers,
    isRefetching: isRefetchingFollowers,
    refetch: refetchFollowers,
  } = useQuery({
    queryKey: ['followers', targetUserId],
    queryFn: () => usersApi.followers(targetUserId),
    enabled: Boolean(targetUserId),
  });

  const {
    data: following,
    isLoading: isLoadingFollowing,
    isRefetching: isRefetchingFollowing,
    refetch: refetchFollowing,
  } = useQuery({
    queryKey: ['following', targetUserId],
    queryFn: () => usersApi.following(targetUserId),
    enabled: Boolean(targetUserId),
  });

  const followMutation = useMutation({
    mutationFn: (userId) => usersApi.follow(userId),
    onSuccess: () => {
      toast.success('Followed');
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (err) => toast.error(err.message ?? 'Could not follow'),
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId) => usersApi.unfollow(userId),
    onSuccess: () => {
      toast.info('Unfollowed');
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (err) => toast.error(err.message ?? 'Could not unfollow'),
  });

  async function openChat(personId) {
    try {
      const result = await chatApi.open(personId);
      if (result.greetingSkippedReason === 'INSUFFICIENT_COINS') {
        toast.info('You are out of coins — top up to say hi.');
        router.push('/coins');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${result.conversation.id}`);
    } catch (err) {
      toast.error(err.message ?? 'Could not open chat');
    }
  }

  const list = activeTab === 'followers' ? (followers ?? []) : (following ?? []);
  const isLoading = activeTab === 'followers' ? isLoadingFollowers : isLoadingFollowing;
  const isRefetching = activeTab === 'followers' ? isRefetchingFollowers : isRefetchingFollowing;
  const refetch = activeTab === 'followers' ? refetchFollowers : refetchFollowing;

  // Set of IDs currently followed by current user
  const followingIds = new Set((following ?? []).map((u) => u.id ?? u._id));

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-4 pb-3 pt-2"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Network
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {followers?.length ?? 0} followers · {following?.length ?? 0} following
          </Text>
        </View>
      </View>

      {/* Segmented Tab */}
      <View className="flex-row p-3 gap-2">
        <Pressable
          onPress={() => setActiveTab('followers')}
          className="flex-1 items-center py-2.5"
          style={{
            backgroundColor: activeTab === 'followers' ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: activeTab === 'followers' ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: activeTab === 'followers' ? colors.onPrimary : colors.textSecondary }}
          >
            Followers ({followers?.length ?? 0})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('following')}
          className="flex-1 items-center py-2.5"
          style={{
            backgroundColor: activeTab === 'following' ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: activeTab === 'following' ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: activeTab === 'following' ? colors.onPrimary : colors.textSecondary }}
          >
            Following ({following?.length ?? 0})
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading label="Loading users…" />
        </View>
      ) : list.length === 0 ? (
        <EmptyState
          emoji={activeTab === 'followers' ? '👥' : '✨'}
          title={activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          description={
            activeTab === 'followers'
              ? 'When people follow your profile, they will appear here.'
              : 'Browse people and follow profiles you like to stay connected.'
          }
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id ?? item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          renderItem={({ item }) => {
            const itemId = item.id ?? item._id;
            const isMe = String(itemId) === String(user?.id);
            const isFollowingUser = followingIds.has(itemId) || activeTab === 'following';

            return (
              <View
                className="flex-row items-center gap-3 p-3.5"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Pressable onPress={() => !isMe && router.push(`/user/${itemId}`)} className="relative">
                  <Avatar
                    uri={item.avatarUrl}
                    name={item.nickname}
                    gender={item.gender}
                    emoji={item.avatarEmoji}
                    color={item.avatarColor}
                    size={48}
                  />
                  {item.isOnline ? (
                    <View
                      className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
                      style={{ backgroundColor: '#22c55e', borderColor: colors.surface }}
                    />
                  ) : null}
                </Pressable>

                <Pressable onPress={() => !isMe && router.push(`/user/${itemId}`)} className="min-w-0 flex-1">
                  <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                    {item.nickname}
                  </Text>
                  <Text numberOfLines={1} className="text-xs" style={{ color: colors.textMuted }}>
                    {item.bio || (item.gender === 'female' ? '👧 Girl' : '👦 Boy')}
                  </Text>
                </Pressable>

                {!isMe ? (
                  <View className="flex-row items-center gap-2">
                    <Button
                      title="Chat"
                      variant="ghost"
                      size="sm"
                      onPress={() => openChat(itemId)}
                    />
                    <Button
                      title={isFollowingUser ? 'Following' : '+ Follow'}
                      variant={isFollowingUser ? 'outline' : 'solid'}
                      size="sm"
                      isLoading={
                        (followMutation.isPending && followMutation.variables === itemId) ||
                        (unfollowMutation.isPending && unfollowMutation.variables === itemId)
                      }
                      onPress={() => {
                        if (isFollowingUser) {
                          unfollowMutation.mutate(itemId);
                        } else {
                          followMutation.mutate(itemId);
                        }
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
