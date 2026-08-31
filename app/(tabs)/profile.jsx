import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, Badge, Button, Card, CoinIcon, Field, Input, Loading } from '../../src/components/ui.jsx';
import { feedbackApi, usersApi } from '../../src/api/endpoints.js';
import { formatCoins } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const FEEDBACK_CATEGORIES = [
  { label: '💡 Suggestion', value: 'suggestion' },
  { label: '🐛 Bug Issue', value: 'bug' },
  { label: '❤️ Love App', value: 'compliment' },
  { label: '❓ Other', value: 'other' },
];

const AGE_GROUPS = [
  { label: '18–21', value: '18-21', emoji: '🎓' },
  { label: '22–25', value: '22-25', emoji: '🚀' },
  { label: '26–29', value: '26-29', emoji: '🌟' },
  { label: '30+', value: '30+', emoji: '👑' },
];

const ZODIAC_SIGNS = [
  { label: 'Aries', symbol: '♈', value: 'Aries ♈' },
  { label: 'Taurus', symbol: '♉', value: 'Taurus ♉' },
  { label: 'Gemini', symbol: '♊', value: 'Gemini ♊' },
  { label: 'Cancer', symbol: '♋', value: 'Cancer ♋' },
  { label: 'Leo', symbol: '♌', value: 'Leo ♌' },
  { label: 'Virgo', symbol: '♍', value: 'Virgo ♍' },
  { label: 'Libra', symbol: '♎', value: 'Libra ♎' },
  { label: 'Scorpio', symbol: '♏', value: 'Scorpio ♏' },
  { label: 'Sagittarius', symbol: '♐', value: 'Sagittarius ♐' },
  { label: 'Capricorn', symbol: '♑', value: 'Capricorn ♑' },
  { label: 'Aquarius', symbol: '♒', value: 'Aquarius ♒' },
  { label: 'Pisces', symbol: '♓', value: 'Pisces ♓' },
];

export default function Profile() {
  const { colors, radius } = useTheme();
  const { refreshUser } = useAuth();
  const { wallet } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [nickname, setNickname] = useState('');
  const [ageGroup, setAgeGroup] = useState('18-21');
  const [zodiacSign, setZodiacSign] = useState('Leo ♌');
  const [isUploading, setIsUploading] = useState(false);

  // Feedback form state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState('new'); // 'new' | 'history'
  const [feedbackCategory, setFeedbackCategory] = useState('suggestion');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const { data: myFeedback = [], refetch: refetchMyFeedback } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: feedbackApi.my,
    enabled: isFeedbackOpen,
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      feedbackApi.submit({
        category: feedbackCategory,
        rating: feedbackRating,
        message: feedbackMessage.trim(),
      }),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setFeedbackMessage('');
      setFeedbackRating(5);
      refetchMyFeedback();
      setFeedbackTab('history');
    },
    onError: (err) => toast.error(err.message ?? 'Could not submit feedback'),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.me,
  });

  const save = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        nickname: nickname.trim(),
        bio: bio.trim(),
        ageGroup,
        zodiacSign,
      }),
    onSuccess: async () => {
      toast.success('Profile updated successfully! ✨');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    },
    onError: (error) => toast.error(error.message ?? 'Could not save your profile'),
  });

  function startEditing() {
    setNickname(profile?.nickname ?? '');
    setBio(profile?.bio ?? '');
    setAgeGroup(profile?.ageGroup ?? '18-21');
    setZodiacSign(profile?.zodiacSign ?? 'Leo ♌');
    setIsEditing(true);
  }

  /**
   * Photo upload. Permission is requested at the moment it is needed, not on
   * launch — a prompt with obvious context is far more likely to be granted.
   */
  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        toast.info('Allow photo access in Settings to change your picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        // The server re-derives the extension from the MIME type, so a wrong
        // filename here cannot smuggle anything past it.
        name: `avatar.${asset.uri.split('.').pop() ?? 'jpg'}`,
        type: asset.mimeType ?? 'image/jpeg',
      });

      await usersApi.uploadAvatar(formData);
      toast.success('Photo updated');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    } catch (uploadError) {
      toast.error(uploadError.message ?? 'Could not upload that photo');
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          You
        </Text>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" className="p-2">
          <Text className="text-xl">⚙️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center">
          <Pressable onPress={pickPhoto} disabled={isUploading} accessibilityRole="button" accessibilityLabel="Change your photo">
            <Avatar
              uri={profile?.avatarUrl}
              name={profile?.nickname}
              gender={profile?.gender}
              emoji={profile?.avatarEmoji}
              color={profile?.avatarColor}
              size={96}
            />
            <View
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.background }}
            >
              <Text style={{ fontSize: 13 }}>{isUploading ? '⏳' : '📷'}</Text>
            </View>
          </Pressable>

          <Text className="mt-3 text-xl font-bold" style={{ color: colors.textPrimary }}>
            {profile?.nickname}
          </Text>
          <Text className="text-sm" style={{ color: colors.textMuted }}>
            {profile?.email}
          </Text>

          <View className="mt-2.5 flex-row flex-wrap justify-center gap-2">
            <Badge
              label={profile?.gender === 'female' ? '👧 Girl' : '👦 Boy'}
              tone={profile?.gender === 'female' ? 'brand' : 'neutral'}
            />
            {profile?.ageGroup ? (
              <Badge label={`🎂 ${profile.ageGroup}`} tone="neutral" />
            ) : null}
            {profile?.zodiacSign ? (
              <Badge label={profile.zodiacSign} tone="brand" />
            ) : null}
            {profile?.location?.city ? (
              <Badge label={`🏙️ ${profile.location.city}`} tone="neutral" />
            ) : null}
            {wallet?.isUnlimited ? <Badge label="Unlimited chat" tone="success" /> : null}
          </View>

          {profile?.bio && !isEditing ? (
            <Text className="mt-3 px-6 text-center text-sm leading-5" style={{ color: colors.textSecondary }}>
              {profile.bio}
            </Text>
          ) : null}
        </View>

        <View className="mt-6 flex-row gap-2.5">
          <Pressable
            onPress={() => router.push('/follows?tab=followers')}
            className="flex-1 items-center py-3"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              {profile?.followersCount ?? 0}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              Followers
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/follows?tab=following')}
            className="flex-1 items-center py-3"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              {profile?.followingCount ?? 0}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              Following
            </Text>
          </Pressable>

          <View
            className="flex-1 items-center py-3"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <View className="flex-row items-center gap-1">
              <CoinIcon size={14} />
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                {wallet?.isUnlimited ? '∞' : formatCoins(wallet?.coinBalance ?? 0)}
              </Text>
            </View>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              Coins
            </Text>
          </View>

          <View
            className="flex-1 items-center py-3"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
          >
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              {formatCoins(profile?.gamePoints ?? 0)}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              Points
            </Text>
          </View>
        </View>

        {isEditing ? (
          <Card className="mt-5" style={{ borderWidth: 1.5, borderColor: colors.primary }}>
            <View className="flex-row items-center justify-between pb-2.5 mb-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                ✏️ Edit Profile
              </Text>
              <View className="flex-row items-center gap-2">
                <Button
                  title="Save"
                  size="sm"
                  variant="primary"
                  isLoading={save.isPending}
                  onPress={() => save.mutate()}
                />
                <Pressable onPress={() => setIsEditing(false)} className="p-1">
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
                </Pressable>
              </View>
            </View>

            <Field label="Nickname" hint="This is what everyone sees in chats and discovery.">
              <Input
                value={nickname}
                onChangeText={setNickname}
                maxLength={24}
                autoCapitalize="none"
                style={{ backgroundColor: colors.surfaceAlt }}
              />
            </Field>

            <Field label="About you" hint="A line or two. Profiles with a bio get more replies.">
              <Input
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={240}
                placeholder="Write something interesting about yourself…"
                placeholderTextColor={colors.textMuted}
                style={{ height: 75, textAlignVertical: 'top', backgroundColor: colors.surfaceAlt }}
              />
            </Field>

            <Field label="Age Bracket">
              <View className="flex-row flex-wrap gap-2">
                {AGE_GROUPS.map((ag) => {
                  const isSelected = ageGroup === ag.value;
                  return (
                    <Pressable
                      key={ag.value}
                      onPress={() => setAgeGroup(ag.value)}
                      className="flex-1 min-w-[45%] py-2 px-3 items-center flex-row justify-center gap-1.5"
                      style={{
                        backgroundColor: isSelected ? `${colors.primary}18` : colors.surfaceAlt,
                        borderRadius: radius,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{ag.emoji}</Text>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: isSelected ? colors.primary : colors.textPrimary }}
                      >
                        {ag.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Zodiac Sign (Optional)">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 py-0.5">
                <View className="flex-row gap-1.5 px-1">
                  <Pressable
                    onPress={() => setZodiacSign(null)}
                    className="py-1.5 px-2.5 items-center flex-row gap-1"
                    style={{
                      backgroundColor: !zodiacSign ? colors.primary : colors.surfaceAlt,
                      borderRadius: radius,
                      borderWidth: 1,
                      borderColor: !zodiacSign ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>✨</Text>
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: !zodiacSign ? colors.onPrimary : colors.textPrimary }}
                    >
                      None
                    </Text>
                  </Pressable>

                  {ZODIAC_SIGNS.map((z) => {
                    const isSelected = zodiacSign === z.value;
                    return (
                      <Pressable
                        key={z.value}
                        onPress={() => setZodiacSign(isSelected ? null : z.value)}
                        className="py-1.5 px-2.5 items-center flex-row gap-1"
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderRadius: radius,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{z.symbol}</Text>
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}
                        >
                          {z.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </Field>

            <View className="gap-3 pt-3">
              <Pressable
                onPress={() => save.mutate()}
                disabled={save.isPending}
                className="items-center justify-center py-3.5 px-4 flex-row gap-2"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: radius,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                  opacity: save.isPending ? 0.7 : 1,
                }}
              >
                {save.isPending ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>💾</Text>
                    <Text className="text-base font-bold" style={{ color: colors.onPrimary }}>
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setIsEditing(false)}
                className="items-center justify-center py-3 px-4 flex-row gap-2"
                style={{
                  backgroundColor: '#ef444415',
                  borderWidth: 1,
                  borderColor: '#ef444440',
                  borderRadius: radius,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                  ✕ Cancel
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Button
            title="✏️ Edit Profile"
            variant="outline"
            className="mt-5"
            onPress={startEditing}
          />
        )}

        <Card className="mt-4">
          <Pressable
            onPress={() => router.push('/coins')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <CoinIcon size={20} />
            <Text className="flex-1 text-base font-medium" style={{ color: colors.textPrimary }}>
              Get coins
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/transactions')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">📜</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Transaction History
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/blocked')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">🛡️</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Blocked Accounts
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/leaderboard')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">🏆</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Leaderboard
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => setIsFeedbackOpen(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">💬</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Send Feedback & Ideas
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">⚙️</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Settings
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/terms')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">📜</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Terms of Use
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/privacy')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">🔒</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Privacy Policy
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/refund')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1"
          >
            <Text className="text-xl">💳</Text>
            <Text className="flex-1 text-base" style={{ color: colors.textPrimary }}>
              Refund Policy
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        </Card>
      </ScrollView>

      {/* 2-3 Click Feedback Modal */}
      <Modal
        visible={isFeedbackOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFeedbackOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/60 px-4"
          onPress={() => setIsFeedbackOpen(false)}
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
                💬 User Feedback & Ideas
              </Text>
              <Pressable onPress={() => setIsFeedbackOpen(false)} className="p-1">
                <Text style={{ fontSize: 16, color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {/* Segmented Tab Bar */}
            <View className="flex-row rounded-xl p-1 mb-4" style={{ backgroundColor: colors.surfaceAlt }}>
              <Pressable
                onPress={() => setFeedbackTab('new')}
                className="flex-1 py-1.5 items-center rounded-lg"
                style={{
                  backgroundColor: feedbackTab === 'new' ? colors.surface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: feedbackTab === 'new' ? colors.primary : colors.textMuted }}
                >
                  ✍️ Submit New
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFeedbackTab('history')}
                className="flex-1 py-1.5 items-center rounded-lg"
                style={{
                  backgroundColor: feedbackTab === 'history' ? colors.surface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: feedbackTab === 'history' ? colors.primary : colors.textMuted }}
                >
                  📋 My Status ({myFeedback.length})
                </Text>
              </Pressable>
            </View>

            {feedbackTab === 'new' ? (
              <>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  1. What is this about?
                </Text>

                <View className="flex-row flex-wrap gap-2 mb-4">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = feedbackCategory === cat.value;
                    return (
                      <Pressable
                        key={cat.value}
                        onPress={() => setFeedbackCategory(cat.value)}
                        className="px-3 py-1.5"
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderRadius: radius,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  2. How is your experience?
                </Text>

                <View className="flex-row gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setFeedbackRating(star)}
                      className="p-1"
                    >
                      <Text style={{ fontSize: 26, opacity: star <= feedbackRating ? 1 : 0.25 }}>
                        ⭐
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  3. Message / Details
                </Text>

                <TextInput
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  placeholder="Tell us what you like or what we should improve…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={1000}
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    color: colors.textPrimary,
                    borderRadius: radius,
                    height: 80,
                    padding: 12,
                    textAlignVertical: 'top',
                    fontSize: 14,
                  }}
                />

                <View className="flex-row gap-3 mt-5">
                  <Pressable
                    onPress={() => setIsFeedbackOpen(false)}
                    className="flex-1 items-center justify-center py-3 px-4 flex-row gap-1.5"
                    style={{
                      backgroundColor: '#ef444415',
                      borderWidth: 1,
                      borderColor: '#ef444440',
                      borderRadius: radius,
                    }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                      ✕ Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => feedbackMutation.mutate()}
                    disabled={!feedbackMessage.trim() || feedbackMutation.isPending}
                    className="flex-1 items-center justify-center py-3 px-4 flex-row gap-1.5"
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: radius,
                      opacity: !feedbackMessage.trim() || feedbackMutation.isPending ? 0.6 : 1,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    {feedbackMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Text style={{ fontSize: 15 }}>🚀</Text>
                        <Text className="text-sm font-bold" style={{ color: colors.onPrimary }}>
                          Submit
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {myFeedback.length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <Text className="text-3xl mb-2">📬</Text>
                    <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      No feedback submitted yet
                    </Text>
                    <Text className="text-xs text-center mt-1" style={{ color: colors.textMuted }}>
                      Submit your first feedback or suggestion above.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-3 py-1">
                    {myFeedback.map((item) => (
                      <View
                        key={item.id}
                        className="p-3.5"
                        style={{
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: radius,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Badge
                            label={item.category?.toUpperCase()}
                            tone={item.category === 'bug' ? 'danger' : 'brand'}
                          />
                          <Badge
                            label={
                              item.status === 'resolved'
                                ? '🟢 Resolved ✓'
                                : item.status === 'reviewed'
                                  ? '🔵 Under Review'
                                  : '🟡 New'
                            }
                            tone={
                              item.status === 'resolved'
                                ? 'success'
                                : item.status === 'reviewed'
                                  ? 'brand'
                                  : 'warning'
                            }
                          />
                        </View>
                        <Text className="text-sm leading-5 mt-1" style={{ color: colors.textPrimary }}>
                          {item.message}
                        </Text>
                        {item.adminNote ? (
                          <View
                            className="mt-2.5 p-2.5 rounded-lg"
                            style={{ backgroundColor: `${colors.success}18` }}
                          >
                            <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                              Admin Response:
                            </Text>
                            <Text className="text-xs mt-0.5" style={{ color: colors.textPrimary }}>
                              {item.adminNote}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
