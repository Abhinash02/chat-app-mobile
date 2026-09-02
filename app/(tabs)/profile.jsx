

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Badge, CoinIcon, Field, Input, Loading } from '../../src/components/ui.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { feedbackApi, supportApi, usersApi } from '../../src/api/endpoints.js';
import { formatCoins } from '../../src/lib/format.js';
import { appendFile } from '../../src/lib/media.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';
import { useLanguage } from '../../src/i18n/LanguageProvider.jsx';

const FEEDBACK_CATEGORIES = [
  { label: 'Suggestion', value: 'suggestion', icon: 'bulb-outline' },
  { label: 'Bug Issue', value: 'bug', icon: 'bug-outline' },
  { label: 'Love App', value: 'compliment', icon: 'heart-outline' },
  { label: 'Other', value: 'other', icon: 'help-circle-outline' },
];

const AGE_GROUPS = [
  { label: '18–21', value: '18-21', icon: 'school-outline' },
  { label: '22–25', value: '22-25', icon: 'rocket-outline' },
  { label: '26–29', value: '26-29', icon: 'star-outline' },
  { label: '30+', value: '30+', icon: 'ribbon-outline' },
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

// Grouped menu configuration — declarative and fully localized
function useMenuSections({ router, user, wallet, unreadSupportCount, onOpenFeedback, onLogout, t }) {
  const isGirl =
    String(user?.gender).toLowerCase() === 'female' ||
    String(user?.gender).toLowerCase() === 'girl' ||
    Boolean(wallet?.isUnlimited) ||
    Boolean(wallet?.earnings?.enabled);

  return [
    {
      title: isGirl ? t('profile.menu.earningsAndWallet') : t('profile.menu.account'),
      items: [
        {
          icon: isGirl ? 'cash-outline' : 'wallet-outline',
          tint: isGirl ? '#ec4899' : '#f59e0b',
          label: isGirl ? t('profile.menu.chatEarningsMenu') : t('profile.menu.getCoins'),
          badge: isGirl
            ? { text: `${wallet?.coinBalance || 0} ${t('common.coins')}`, tone: 'brand' }
            : undefined,
          onPress: () => router.push('/coins'),
        },
        { icon: 'time-outline', tint: '#3b82f6', label: t('profile.menu.transactionHistory'), onPress: () => router.push('/transactions') },
        { icon: 'shield-checkmark-outline', tint: '#ef4444', label: t('profile.menu.blockedAccounts'), onPress: () => router.push('/blocked') },
        { icon: 'trophy-outline', tint: '#eab308', label: t('profile.menu.leaderboard'), onPress: () => router.push('/leaderboard') },
      ],
    },
    {
      title: t('profile.menu.support'),
      items: [
        { icon: 'chatbubble-ellipses-outline', tint: '#8b5cf6', label: t('profile.menu.sendFeedback'), onPress: onOpenFeedback },
        {
          icon: 'headset-outline',
          tint: '#10b981',
          label: t('profile.menu.helpSupport'),
          onPress: () => router.push('/support'),
          badge: unreadSupportCount > 0 ? { text: `${unreadSupportCount} New`, tone: 'danger' } : { text: '24/7 Live', tone: 'brand' },
        },
        { icon: 'settings-outline', tint: '#6b7280', label: t('profile.menu.settings'), onPress: () => router.push('/settings') },
      ],
    },
    {
      title: t('profile.menu.legal'),
      items: [
        { icon: 'document-text-outline', tint: '#6b7280', label: t('profile.menu.terms'), onPress: () => router.push('/terms') },
        { icon: 'lock-closed-outline', tint: '#6b7280', label: t('profile.menu.privacy'), onPress: () => router.push('/privacy') },
        { icon: 'card-outline', tint: '#6b7280', label: t('profile.menu.refund'), onPress: () => router.push('/refund') },
        { icon: 'log-out-outline', tint: '#ef4444', label: t('profile.menu.logOut'), isDestructive: true, onPress: onLogout },
      ],
    },
  ];
}

export default function Profile() {
  const { colors, radius } = useTheme();
  const { user, refreshUser, signOut } = useAuth();
  const { wallet } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
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

  const { data: mySupportTickets = [] } = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: supportApi.myTickets,
  });
  const unreadSupportCount = (mySupportTickets ?? []).filter((t) => t.unreadByUser).length;

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
      await appendFile(formData, {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fieldName: 'avatar',
      });

      await usersApi.uploadAvatar(formData);
      toast.success('Photo updated successfully! ✨');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    } catch (uploadError) {
      toast.error(uploadError.message ?? 'Could not upload that photo');
    } finally {
      setIsUploading(false);
    }
  }

  const isGirl =
    String(profile?.gender || user?.gender).toLowerCase() === 'female' ||
    String(profile?.gender || user?.gender).toLowerCase() === 'girl' ||
    Boolean(wallet?.isUnlimited) ||
    Boolean(wallet?.earnings?.enabled);

  const { language, currentLanguage, availableLanguages, setLanguage, t } = useLanguage();

  const menuSections = useMenuSections({
    router,
    user: profile || user,
    wallet,
    unreadSupportCount,
    onOpenFeedback: () => setIsFeedbackOpen(true),
    onLogout: () => setIsLogoutModalOpen(true),
    t,
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center" style={{ backgroundColor: colors.background }}>
        <Loading label={t('common.loading')} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          {t('profile.title')}
        </Text>
        <WalletHeader compact />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }}>
        {/* ---------- Main profile card ---------- */}
        <View
          className="items-center p-6"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius + 8,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* Avatar with photo picker / camera action */}
          <View className="relative">
            <Avatar
              uri={profile?.avatarUrl}
              name={profile?.nickname}
              gender={profile?.gender}
              emoji={profile?.avatarEmoji}
              color={profile?.avatarColor}
              size={96}
            />

            <Pressable
              onPress={pickPhoto}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full active:scale-95"
              style={{
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: colors.surface,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="camera" size={15} color={colors.onPrimary} />
              )}
            </Pressable>
          </View>

          <Text className="mt-3.5 text-xl font-bold" style={{ color: colors.textPrimary }}>
            {profile?.name || profile?.nickname}
          </Text>

          <View className="mt-1 flex-row items-center gap-1.5">
            <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>
              @{profile?.nickname || 'user'}
            </Text>
            {profile?.ageGroup ? (
              <>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  ·
                </Text>
                <Badge label={profile.ageGroup} tone="muted" />
              </>
            ) : null}
            {profile?.zodiacSign ? (
              <>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  ·
                </Text>
                <Badge label={profile.zodiacSign} tone="muted" />
              </>
            ) : null}
          </View>

          {profile?.bio && !isEditing ? (
            <Text className="mt-4 px-4 text-center text-sm leading-5" style={{ color: colors.textSecondary }}>
              {profile.bio}
            </Text>
          ) : null}

          {!isEditing && (
            <Pressable
              onPress={startEditing}
              className="mt-5 flex-row items-center gap-1.5 px-5 py-2.5"
              style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="create-outline" size={15} color={colors.textPrimary} />
              <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {t('profile.editProfile')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ---------- Stats row ---------- */}
        <View className="mt-4 flex-row gap-2.5">
          <StatTile
            colors={colors}
            radius={radius}
            value={profile?.followersCount ?? 0}
            label="Followers"
            icon="people-outline"
            onPress={() => router.push('/follows?tab=followers')}
          />
          <StatTile
            colors={colors}
            radius={radius}
            value={profile?.followingCount ?? 0}
            label="Following"
            icon="person-add-outline"
            onPress={() => router.push('/follows?tab=following')}
          />
          <StatTile
            colors={colors}
            radius={radius}
            value={formatCoins(wallet?.coinBalance ?? 0)}
            label={isGirl ? t('profile.chatEarnings') : t('common.coins')}
            icon={<CoinIcon size={16} />}
            onPress={() => router.push('/coins')}
          />
          <StatTile
            colors={colors}
            radius={radius}
            value={formatCoins(profile?.gamePoints ?? 0)}
            label={t('common.points')}
            icon="game-controller-outline"
            onPress={() => router.push('/(tabs)/games')}
          />
        </View>

        {/* ---------- 1-Click App Language Switcher Card ---------- */}
        <View
          style={{
            marginTop: 16,
            backgroundColor: colors.surface,
            borderRadius: radius + 8,
            borderWidth: 1.5,
            borderColor: `${colors.primary}35`,
            padding: 16,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-8 h-8 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${colors.primary}18` }}
              >
                <Text style={{ fontSize: 16 }}>🌐</Text>
              </View>
              <View>
                <Text className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                  {t('profile.appLanguage')}
                </Text>
                <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                  {t('profile.languageSub')}
                </Text>
              </View>
            </View>
            <View
              className="px-2.5 py-1 rounded-full flex-row items-center gap-1"
              style={{ backgroundColor: `${colors.primary}15`, borderWidth: 1, borderColor: `${colors.primary}30` }}
            >
              <Text style={{ fontSize: 11 }}>{currentLanguage.flag}</Text>
              <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>
                {currentLanguage.nativeName}
              </Text>
            </View>
          </View>

          {/* Quick 1-Click Language Chips */}
          <View className="flex-row gap-2">
            {availableLanguages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    setLanguage(lang.code);
                    toast.success(`${lang.flag} ${lang.nativeName}`);
                  }}
                  className="flex-1 py-2 px-1 items-center justify-center rounded-xl active:scale-95 transition"
                  style={{
                    backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    shadowColor: isSelected ? colors.primary : 'transparent',
                    shadowOpacity: isSelected ? 0.3 : 0,
                    shadowRadius: 6,
                    elevation: isSelected ? 3 : 0,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{lang.flag}</Text>
                  <Text
                    className="text-[11px] font-bold mt-0.5 text-center"
                    style={{ color: isSelected ? colors.onPrimary || '#fff' : colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {lang.nativeName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---------- Girls Chat Earnings Premium Banner ---------- */}
        {isGirl && (
          <Pressable
            onPress={() => router.push('/coins')}
            style={({ pressed }) => ({
              marginTop: 16,
              borderRadius: radius + 8,
              overflow: 'hidden',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 16,
              elevation: 7,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.95 : 1,
            })}
          >
            {/* Header strip */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>💖</Text>
                </View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 }}>
                    {t('profile.chatEarnings')}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 1 }}>
                    {t('profile.chatEarningsSub')}
                  </Text>
                </View>
              </View>
              {/* Active badge */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>
                  ● {t('common.active')}
                </Text>
              </View>
            </View>

            {/* Body */}
            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1.5,
                borderTopWidth: 0,
                borderColor: `${colors.primary}30`,
                borderBottomLeftRadius: radius + 8,
                borderBottomRightRadius: radius + 8,
              }}
            >
              {/* Stats row */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {/* Coin balance */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: `${colors.primary}10`,
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: `${colors.primary}25`,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🪙</Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 16,
                      fontWeight: '900',
                      marginTop: 2,
                    }}
                  >
                    {wallet?.coinBalance || 0}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 }}>
                    {t('common.coins').toUpperCase()}
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ width: 1, backgroundColor: colors.border, borderRadius: 1 }} />

                {/* INR Value */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#10b98110',
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#10b98125',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>💵</Text>
                  <Text
                    style={{
                      color: '#10b981',
                      fontSize: 16,
                      fontWeight: '900',
                      marginTop: 2,
                    }}
                  >
                    ₹{((wallet?.coinBalance || 0) / (wallet?.earnings?.coinsPerRupee || 1)).toFixed(0)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 }}>
                    {t('profile.withdrawable')}
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ width: 1, backgroundColor: colors.border, borderRadius: 1 }} />

                {/* Msgs count */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#8b5cf610',
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#8b5cf625',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>💬</Text>
                  <Text
                    style={{
                      color: '#8b5cf6',
                      fontSize: 16,
                      fontWeight: '900',
                      marginTop: 2,
                    }}
                  >
                    {wallet?.earnings?.currentProgress || wallet?.girlChatMessagesCount || 0}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 }}>
                    {t('profile.msgsSent')}
                  </Text>
                </View>
              </View>

              {/* Withdraw CTA */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: `${colors.primary}0D`,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: `${colors.primary}20`,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1 }}>
                  {t('profile.withdrawPrompt')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ color: colors.onPrimary || '#fff', fontSize: 11, fontWeight: '800' }}>
                    {t('common.withdraw')}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.onPrimary || '#fff'} />
                </View>
              </View>
            </View>
          </Pressable>
        )}


        {/* ---------- Edit form ---------- */}
        {isEditing ? (
          <View
            className="mt-4 p-5"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 6,
              borderWidth: 1.5,
              borderColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between pb-3 mb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="create-outline" size={17} color={colors.primary} />
                <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                  Edit Profile
                </Text>
              </View>
              <Pressable onPress={() => setIsEditing(false)} className="h-7 w-7 items-center justify-center" style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14 }}>
                <Ionicons name="close" size={15} color={colors.textMuted} />
              </Pressable>
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
                      className="flex-1 min-w-[45%] py-2.5 px-3 items-center flex-row justify-center gap-1.5"
                      style={{
                        backgroundColor: isSelected ? `${colors.primary}18` : colors.surfaceAlt,
                        borderRadius: radius,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Ionicons name={ag.icon} size={14} color={isSelected ? colors.primary : colors.textMuted} />
                      <Text className="text-xs font-bold" style={{ color: isSelected ? colors.primary : colors.textPrimary }}>
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
                    className="py-1.5 px-3 items-center flex-row gap-1"
                    style={{
                      backgroundColor: !zodiacSign ? colors.primary : colors.surfaceAlt,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: !zodiacSign ? colors.primary : colors.border,
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={13} color={!zodiacSign ? colors.onPrimary : colors.textMuted} />
                    <Text className="text-xs font-semibold" style={{ color: !zodiacSign ? colors.onPrimary : colors.textPrimary }}>
                      None
                    </Text>
                  </Pressable>

                  {ZODIAC_SIGNS.map((z) => {
                    const isSelected = zodiacSign === z.value;
                    return (
                      <Pressable
                        key={z.value}
                        onPress={() => setZodiacSign(isSelected ? null : z.value)}
                        className="py-1.5 px-3 items-center flex-row gap-1"
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{z.symbol}</Text>
                        <Text className="text-xs font-semibold" style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}>
                          {z.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </Field>

            <View className="gap-2.5 pt-4">
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
                    <Ionicons name="checkmark-circle-outline" size={17} color={colors.onPrimary} />
                    <Text className="text-base font-bold" style={{ color: colors.onPrimary }}>
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setIsEditing(false)}
                className="items-center justify-center py-3 px-4"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ---------- Menu sections ---------- */}
        {menuSections.map((section) => (
          <View key={section.title} className="mt-6">
            <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              {section.title}
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius + 4,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <MenuRow colors={colors} item={item} />
                  {idx < section.items.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 58 }} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ---------- Feedback Modal ---------- */}
      <Modal visible={isFeedbackOpen} transparent animationType="fade" onRequestClose={() => setIsFeedbackOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/60 px-4" onPress={() => setIsFeedbackOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 6,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                  Feedback & Ideas
                </Text>
              </View>
              <Pressable
                onPress={() => setIsFeedbackOpen(false)}
                className="h-7 w-7 items-center justify-center"
                style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14 }}
              >
                <Ionicons name="close" size={15} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Segmented Tab Bar */}
            <View className="flex-row rounded-xl p-1 mb-4" style={{ backgroundColor: colors.surfaceAlt }}>
              <Pressable
                onPress={() => setFeedbackTab('new')}
                className="flex-1 py-2 items-center rounded-lg flex-row justify-center gap-1.5"
                style={{ backgroundColor: feedbackTab === 'new' ? colors.surface : 'transparent' }}
              >
                <Ionicons name="create-outline" size={13} color={feedbackTab === 'new' ? colors.primary : colors.textMuted} />
                <Text className="text-xs font-semibold" style={{ color: feedbackTab === 'new' ? colors.primary : colors.textMuted }}>
                  Submit New
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFeedbackTab('history')}
                className="flex-1 py-2 items-center rounded-lg flex-row justify-center gap-1.5"
                style={{ backgroundColor: feedbackTab === 'history' ? colors.surface : 'transparent' }}
              >
                <Ionicons name="list-outline" size={13} color={feedbackTab === 'history' ? colors.primary : colors.textMuted} />
                <Text className="text-xs font-semibold" style={{ color: feedbackTab === 'history' ? colors.primary : colors.textMuted }}>
                  My Status ({myFeedback.length})
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
                        className="flex-row items-center gap-1.5 px-3 py-1.5"
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Ionicons name={cat.icon} size={13} color={isSelected ? colors.onPrimary : colors.textMuted} />
                        <Text className="text-xs font-semibold" style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}>
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
                    <Pressable key={star} onPress={() => setFeedbackRating(star)} className="p-1">
                      <Ionicons
                        name={star <= feedbackRating ? 'star' : 'star-outline'}
                        size={26}
                        color={star <= feedbackRating ? '#f59e0b' : colors.textMuted}
                      />
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
                    className="flex-1 items-center justify-center py-3 px-4"
                    style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                      Cancel
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
                        <Ionicons name="send" size={14} color={colors.onPrimary} />
                        <Text className="text-sm font-bold" style={{ color: colors.onPrimary }}>
                          Submit
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {myFeedback.length === 0 ? (
                  <View className="py-10 items-center justify-center">
                    <View
                      className="h-14 w-14 items-center justify-center mb-3"
                      style={{ backgroundColor: colors.surfaceAlt, borderRadius: 28 }}
                    >
                      <Ionicons name="mail-open-outline" size={22} color={colors.textMuted} />
                    </View>
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
                          <Badge label={item.category?.toUpperCase()} tone={item.category === 'bug' ? 'danger' : 'brand'} />
                          <Badge
                            label={
                              item.status === 'resolved' ? 'Resolved' : item.status === 'reviewed' ? 'Under Review' : 'New'
                            }
                            tone={item.status === 'resolved' ? 'success' : item.status === 'reviewed' ? 'brand' : 'warning'}
                          />
                        </View>
                        <Text className="text-sm leading-5 mt-1" style={{ color: colors.textPrimary }}>
                          {item.message}
                        </Text>
                        {item.adminNote ? (
                          <View className="mt-2.5 p-2.5 rounded-lg" style={{ backgroundColor: `${colors.success}18` }}>
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

      {/* ---------- Logout Confirmation Modal ---------- */}
      <Modal visible={isLogoutModalOpen} transparent animationType="fade" onRequestClose={() => setIsLogoutModalOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/60 px-5" onPress={() => setIsLogoutModalOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 8,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            <View className="items-center mb-4">
              <View
                className="h-14 w-14 items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: 28 }}
              >
                <Ionicons name="log-out-outline" size={26} color="#ef4444" />
              </View>
              <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Log out of Vibe Chat?
              </Text>
              <Text className="text-xs text-center mt-1.5 leading-4" style={{ color: colors.textMuted }}>
                You can log back in anytime with your registered credentials.
              </Text>
            </View>

            <View className="flex-row gap-3 mt-3">
              <Pressable
                onPress={() => setIsLogoutModalOpen(false)}
                className="flex-1 items-center justify-center py-3 px-4 rounded-xl border"
                style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  setIsLogoutModalOpen(false);
                  try {
                    await signOut();
                    toast.success('Logged out successfully');
                    router.replace('/(auth)/login');
                  } catch {
                    toast.error('Could not log out');
                  }
                }}
                className="flex-1 items-center justify-center py-3 px-4 rounded-xl flex-row gap-1.5"
                style={{ backgroundColor: '#ef4444' }}
              >
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text className="text-sm font-bold text-white">
                  Log Out
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Single stat tile used in the profile header stats row. */
function StatTile({ colors, radius, value, label, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center py-3.5"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center gap-1">
        {typeof icon === 'string' ? <Ionicons name={icon} size={13} color={colors.textMuted} /> : icon}
        <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
          {value}
        </Text>
      </View>
      <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Single row inside a grouped menu card — icon chip, label, optional badge, chevron. */
function MenuRow({ colors, item }) {
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-75"
    >
      <View
        className="h-8 w-8 items-center justify-center"
        style={{
          backgroundColor: item.isDestructive ? 'rgba(239, 68, 68, 0.12)' : `${item.tint}18`,
          borderRadius: 10,
        }}
      >
        <Ionicons
          name={item.icon}
          size={16}
          color={item.isDestructive ? '#ef4444' : item.tint}
        />
      </View>
      <Text
        className="flex-1 text-[15px]"
        style={{
          color: item.isDestructive ? '#ef4444' : colors.textPrimary,
          fontWeight: item.isDestructive ? '700' : '500',
        }}
      >
        {item.label}
      </Text>
      {item.badge ? <Badge label={item.badge.text} tone={item.badge.tone} /> : null}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={item.isDestructive ? '#ef4444' : colors.textMuted}
      />
    </Pressable>
  );
}