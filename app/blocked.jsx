import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Avatar, Button, EmptyState, Loading } from '../src/components/ui.jsx';
import { usersApi } from '../src/api/endpoints.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

export default function BlockedAccounts() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('blockedByMe'); // 'blockedByMe' | 'blockedMe'

  const {
    data: blockedByMe,
    isLoading: isLoadingBlockedByMe,
    isRefetching: isRefetchingBlockedByMe,
    refetch: refetchBlockedByMe,
  } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: usersApi.blocked,
  });

  const {
    data: blockedMe,
    isLoading: isLoadingBlockedMe,
    isRefetching: isRefetchingBlockedMe,
    refetch: refetchBlockedMe,
  } = useQuery({
    queryKey: ['blocked-by-others'],
    queryFn: usersApi.blockedBy,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId) => usersApi.unblock(userId),
    onSuccess: () => {
      toast.success('User unblocked');
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
    onError: (err) => {
      toast.error(err.message ?? 'Could not unblock user');
    },
  });

  const blockedList = activeTab === 'blockedByMe' ? (blockedByMe ?? []) : (blockedMe ?? []);
  const isLoading = activeTab === 'blockedByMe' ? isLoadingBlockedByMe : isLoadingBlockedMe;
  const isRefetching = activeTab === 'blockedByMe' ? isRefetchingBlockedByMe : isRefetchingBlockedMe;
  const refetch = activeTab === 'blockedByMe' ? refetchBlockedByMe : refetchBlockedMe;

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
            Blocked Accounts
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            Manage blocked accounts & view restriction status
          </Text>
        </View>
      </View>

      {/* Segmented Tab */}
      <View className="flex-row p-3 gap-2">
        <Pressable
          onPress={() => setActiveTab('blockedByMe')}
          className="flex-1 items-center py-2.5"
          style={{
            backgroundColor: activeTab === 'blockedByMe' ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: activeTab === 'blockedByMe' ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: activeTab === 'blockedByMe' ? colors.onPrimary : colors.textSecondary }}
          >
            Blocked by You ({blockedByMe?.length ?? 0})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('blockedMe')}
          className="flex-1 items-center py-2.5"
          style={{
            backgroundColor: activeTab === 'blockedMe' ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: activeTab === 'blockedMe' ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: activeTab === 'blockedMe' ? colors.onPrimary : colors.textSecondary }}
          >
            Blocked You ({blockedMe?.length ?? 0})
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading label="Loading accounts…" />
        </View>
      ) : blockedList.length === 0 ? (
        <EmptyState
          emoji={activeTab === 'blockedByMe' ? '🛡️' : '✨'}
          title={activeTab === 'blockedByMe' ? 'No blocked accounts' : 'No one has blocked you'}
          description={
            activeTab === 'blockedByMe'
              ? 'Accounts you block will appear here. They won’t be able to chat with you or see your profile.'
              : 'You have good vibes! No accounts currently have you blocked.'
          }
        />
      ) : (
        <FlatList
          data={blockedList}
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
          renderItem={({ item }) => (
            <View
              className="flex-row items-center gap-3 p-3.5"
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Avatar
                uri={item.avatarUrl}
                name={item.nickname}
                gender={item.gender}
                emoji={item.avatarEmoji}
                color={item.avatarColor}
                size={48}
              />

              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                  {item.nickname}
                </Text>
                <Text numberOfLines={1} className="text-xs" style={{ color: colors.textMuted }}>
                  {item.bio || (activeTab === 'blockedByMe' ? 'Blocked from chatting' : 'Blocked this conversation')}
                </Text>
              </View>

              {activeTab === 'blockedByMe' ? (
                <Button
                  title="Unblock"
                  variant="outline"
                  size="sm"
                  isLoading={unblockMutation.isPending && unblockMutation.variables === (item.id ?? item._id)}
                  onPress={() => unblockMutation.mutate(item.id ?? item._id)}
                />
              ) : (
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${colors.danger}15` }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.danger }}>
                    Blocked you
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
