import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../../src/components/ScreenHeader.jsx';
import { Avatar, Badge, Button, Card, Loading } from '../../src/components/ui.jsx';
import { chatApi, reportsApi, usersApi } from '../../src/api/endpoints.js';
import { formatCoins, formatDistance, formatRelativeTime } from '../../src/lib/format.js';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const REPORT_REASONS = [
  { label: '🚫 Harassment & Bullying', value: 'harassment' },
  { label: '🔞 Inappropriate / Sexual Content', value: 'sexual_content' },
  { label: '🚸 Underage Account', value: 'underage' },
  { label: '💳 Scam / Fraud / Impersonation', value: 'scam' },
  { label: '📢 Spam & Promotional Ads', value: 'spam' },
  { label: '🤖 Fake Profile / Bot', value: 'fake_profile' },
  { label: '❓ Other Policy Violation', value: 'other' },
];

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const { colors, radius } = useTheme();
  const { presence } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => usersApi.profile(userId),
    enabled: Boolean(userId),
  });

  const isOnline = presence?.[userId]?.isOnline ?? user?.isOnline;
  const isFollowing = Boolean(user?.isFollowing);

  const followMutation = useMutation({
    mutationFn: (targetState) => (targetState ? usersApi.follow(userId) : usersApi.unfollow(userId)),
    onMutate: async (targetState) => {
      await queryClient.cancelQueries({ queryKey: ['user-profile', userId] });
      const previous = queryClient.getQueryData(['user-profile', userId]);

      if (previous) {
        queryClient.setQueryData(['user-profile', userId], {
          ...previous,
          isFollowing: targetState,
          followersCount: Math.max(0, (previous.followersCount ?? 0) + (targetState ? 1 : -1)),
        });
      }
      return { previous, targetState };
    },
    onSuccess: (_, targetState) => {
      if (targetState) {
        toast.success(`Following ${user?.nickname}! ✨`);
      } else {
        toast.info(`Unfollowed ${user?.nickname}`);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-profile', userId], context.previous);
      }
      toast.error(err.message ?? 'Could not update follow status');
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => usersApi.block(userId),
    onSuccess: () => {
      toast.success(`Blocked ${user?.nickname ?? 'user'}`);
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      goBack();
    },
    onError: (err) => toast.error(err.message ?? 'Could not block user'),
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      reportsApi.create({
        reportedUserId: userId,
        reason: reportReason,
        details: reportDetails.trim(),
        alsoBlock: true,
      }),
    onSuccess: () => {
      toast.success('Report submitted. This user has also been blocked.');
      setIsReportOpen(false);
      setReportDetails('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      goBack();
    },
    onError: (err) => toast.error(err.message ?? 'Could not submit report'),
  });

  async function handleOpenChat() {
    if (!userId) return;
    setIsOpeningChat(true);
    try {
      const result = await chatApi.open(userId);
      if (result.greetingSkippedReason === 'INSUFFICIENT_COINS') {
        toast.info('You are out of coins — top up to send a message.');
        router.push('/coins');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${result.conversation.id}`);
    } catch (err) {
      toast.error(err.message ?? 'Could not open chat');
    } finally {
      setIsOpeningChat(false);
    }
  }

  function handleBlockPrompt() {
    setIsBlockConfirmOpen(true);
  }

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label="Loading profile…" />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <Text className="text-4xl mb-3">👤</Text>
        <Text className="text-lg font-bold text-center" style={{ color: colors.textPrimary }}>
          Profile Unavailable
        </Text>
        <Text className="text-sm text-center mt-1" style={{ color: colors.textMuted }}>
          {error?.message ?? 'This account is not available or has been blocked.'}
        </Text>
        <Button title="Go Back" variant="outline" className="mt-6" onPress={() => goBack()} />
      </View>
    );
  }

  const distance = formatDistance(user.distanceKm);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Top Header */}
      <View
        className="flex-row items-center justify-between px-4 pb-3 pt-2"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>
        <Text numberOfLines={1} className="text-lg font-bold flex-1 text-center px-2" style={{ color: colors.textPrimary }}>
          {user.nickname}
        </Text>
        <Pressable
          onPress={() => setIsReportOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Report"
          className="p-1"
        >
          <Text style={{ fontSize: 18 }}>🚩</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* User Hero */}
        <View className="items-center mt-2">
          <Avatar
            uri={user.avatarUrl}
            name={user.nickname}
            gender={user.gender}
            emoji={user.avatarEmoji}
            color={user.avatarColor}
            size={104}
            isOnline={isOnline}
            showPresence
          />

          <Text className="mt-3.5 text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {user.nickname}
          </Text>

          <Text className="text-xs mt-0.5" style={{ color: isOnline ? colors.onlineDot : colors.textMuted }}>
            {isOnline
              ? '● Online now'
              : user.lastSeenAt
                ? `Seen ${formatRelativeTime(user.lastSeenAt)} ago`
                : 'Offline'}
          </Text>

          <View className="mt-2.5 flex-row flex-wrap justify-center gap-2">
            <Badge
              label={user.gender === 'female' ? '👧 Girl' : '👦 Boy'}
              tone={user.gender === 'female' ? 'brand' : 'neutral'}
            />
            {user.ageGroup ? <Badge label={`🎂 ${user.ageGroup}`} tone="neutral" /> : null}
            {user.zodiacSign ? <Badge label={user.zodiacSign} tone="brand" /> : null}
            {user.city ? <Badge label={`🏙️ ${user.city}`} tone="neutral" /> : null}
            {distance ? <Badge label={`📍 ${distance}`} /> : null}
          </View>

          {user.bio ? (
            <Text className="mt-3 px-4 text-center text-sm leading-5" style={{ color: colors.textSecondary }}>
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Stats Row */}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => router.push(`/follows?userId=${userId}&tab=followers`)}
            className="flex-1 items-center py-3.5"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
              {user.followersCount ?? 0}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Followers
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/follows?userId=${userId}&tab=following`)}
            className="flex-1 items-center py-3.5"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
              {user.followingCount ?? 0}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Following
            </Text>
          </Pressable>

          <View
            className="flex-1 items-center py-3.5"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
              {formatCoins(user.gamePoints ?? 0)}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Game Points
            </Text>
          </View>
        </View>

        {/* Primary Action Buttons */}
        <View className="mt-6 gap-3">
          {/* Follow / Unfollow */}
          <Pressable
            onPress={() => followMutation.mutate(!isFollowing)}
            disabled={followMutation.isPending}
            className="items-center justify-center py-3.5 px-4 flex-row gap-2"
            style={{
              backgroundColor: isFollowing ? colors.surfaceAlt : colors.primary,
              borderRadius: radius,
              borderWidth: 1,
              borderColor: isFollowing ? colors.border : colors.primary,
              shadowColor: isFollowing ? 'transparent' : colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: isFollowing ? 0 : 4,
            }}
          >
            {followMutation.isPending ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.textPrimary : colors.onPrimary} />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>{isFollowing ? '✓' : '➕'}</Text>
                <Text
                  className="text-base font-bold"
                  style={{ color: isFollowing ? colors.textPrimary : colors.onPrimary }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Say Hi / Message */}
          <Pressable
            onPress={handleOpenChat}
            disabled={isOpeningChat}
            className="items-center justify-center py-3.5 px-4 flex-row gap-2"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius,
              borderWidth: 1.5,
              borderColor: colors.border,
            }}
          >
            {isOpeningChat ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>💬</Text>
                <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                  Send Message / Chat
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Safety & Moderation Card */}
        <Card className="mt-6">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
            Safety & Options
          </Text>

          <Pressable
            onPress={handleBlockPrompt}
            className="flex-row items-center gap-3 py-2"
          >
            <Text className="text-lg">🛡️</Text>
            <Text className="flex-1 text-sm font-semibold" style={{ color: colors.textPrimary }}>
              Block {user.nickname}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => setIsReportOpen(true)}
            className="flex-row items-center gap-3 py-2"
          >
            <Text className="text-lg">🚩</Text>
            <Text className="flex-1 text-sm font-semibold" style={{ color: colors.danger }}>
              Report {user.nickname}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        </Card>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={isReportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/60 px-4"
          onPress={() => setIsReportOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 4,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row items-center justify-between pb-3">
              <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                🚩 Report {user.nickname}
              </Text>
              <Pressable onPress={() => setIsReportOpen(false)} className="p-1">
                <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Select Reason
            </Text>

            <ScrollView style={{ maxHeight: 200 }} className="mb-4">
              <View className="gap-2">
                {REPORT_REASONS.map((r) => {
                  const isSelected = reportReason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      onPress={() => setReportReason(r.value)}
                      className="px-3.5 py-2.5 flex-row items-center justify-between"
                      style={{
                        backgroundColor: isSelected ? `${colors.danger}15` : colors.surfaceAlt,
                        borderRadius: radius,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.danger : colors.border,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: isSelected ? colors.danger : colors.textPrimary }}
                      >
                        {r.label}
                      </Text>
                      {isSelected ? <Text style={{ color: colors.danger, fontSize: 14 }}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              Additional Details (Optional)
            </Text>

            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Provide any additional context for administrators…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={{
                backgroundColor: colors.surfaceAlt,
                color: colors.textPrimary,
                borderRadius: radius,
                height: 70,
                padding: 12,
                textAlignVertical: 'top',
                fontSize: 13,
              }}
            />

            <Text className="mt-2 text-[11px] leading-4" style={{ color: colors.textMuted }}>
              Submitting a report will automatically block this user for your protection. Accounts with 3+ reports are reviewed for suspension.
            </Text>

            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => setIsReportOpen(false)}
                className="flex-1 items-center justify-center py-3 px-4 rounded-xl"
                style={{
                  backgroundColor: '#ef444415',
                  borderWidth: 1,
                  borderColor: '#ef444440',
                  borderRadius: radius,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={() => reportMutation.mutate()}
                disabled={reportMutation.isPending}
                className="flex-1 items-center justify-center py-3 px-4 rounded-xl"
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: radius,
                }}
              >
                {reportMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Submit Report
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SweetAlert Style Block Confirmation Dialog */}
      <Modal
        visible={isBlockConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBlockConfirmOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/65 px-5"
          onPress={() => setIsBlockConfirmOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 8,
              padding: 24,
              borderWidth: 1.5,
              borderColor: `${colors.danger}35`,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Warning Shield with soft glow */}
            <View
              className="items-center justify-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: `${colors.danger}18`,
                borderWidth: 2,
                borderColor: `${colors.danger}40`,
              }}
            >
              <Text style={{ fontSize: 32 }}>🛡️</Text>
            </View>

            <Text className="text-xl font-bold text-center" style={{ color: colors.textPrimary }}>
              Block {user.nickname}?
            </Text>

            <Text
              className="text-sm text-center mt-2.5 leading-5"
              style={{ color: colors.textSecondary }}
            >
              You and {user.nickname} will not be able to message each other, see online presence, or appear in discovery feeds.
            </Text>

            <Text className="text-xs text-center mt-1.5" style={{ color: colors.textMuted }}>
              You can unblock them anytime from Settings → Blocked Accounts.
            </Text>

            <View className="w-full gap-2.5 mt-6">
              <Pressable
                onPress={() => {
                  setIsBlockConfirmOpen(false);
                  blockMutation.mutate();
                }}
                disabled={blockMutation.isPending}
                className="w-full items-center justify-center py-3.5 px-4 flex-row gap-2"
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: radius,
                  shadowColor: colors.danger,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {blockMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🛡️</Text>
                    <Text className="text-base font-bold text-white">
                      Yes, Block {user.nickname}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setIsBlockConfirmOpen(false)}
                className="w-full items-center justify-center py-3 px-4"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
