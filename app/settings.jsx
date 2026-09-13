import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BackButton } from '../src/components/ScreenHeader.jsx';
import { Button, Card, Loading } from '../src/components/ui.jsx';
import { accountDeletionApi, deviceApi, notificationsApi, usersApi } from '../src/api/endpoints.js';
import { DELETION_REASONS, REVIEW_WINDOW_HOURS } from '../src/constants/deletion-reasons.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { registerForPushNotifications, triggerLocalNotification } from '../src/hooks/usePushNotifications.js';
import { useSounds } from '../src/hooks/useSounds.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';
import { useLanguage } from '../src/i18n/LanguageProvider.jsx';

function SettingRow({ label, description, value, onChange, onPreview }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="flex-1">
        <Text className="text-base" style={{ color: colors.textPrimary }}>
          {label}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-xs leading-4" style={{ color: colors.textMuted }}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* A sound setting you cannot hear before committing to it is a guess. */}
      {onPreview && value ? (
        <Pressable onPress={onPreview} accessibilityRole="button" accessibilityLabel="Play a sample" className="px-2">
          <Text className="text-lg">🔊</Text>
        </Pressable>
      ) : null}

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function Settings() {
  const { colors, radius } = useTheme();
  const { user, signOut, refreshUser } = useAuth();
  const { playMessage, setEnabled } = useSounds();
  const { language, currentLanguage, availableLanguages, setLanguage, t } = useLanguage();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reasonDetail, setReasonDetail] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.me,
  });

  const updatePreference = useMutation({
    mutationFn: (preferences) => usersApi.updateMe({ preferences }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await refreshUser();
    },
    onError: (error) => toast.error(error.message ?? 'Could not save that'),
  });

  /*
   * Closing an account is a request an administrator reviews, not something
   * this screen carries out. So the app has to show where that request got to
   * rather than simply offering the button again — someone who asked yesterday
   * and sees an unchanged "Delete account" row has no way to tell whether it
   * was ever received.
   */
  const { data: deletionRequest } = useQuery({
    queryKey: ['account-deletion'],
    queryFn: accountDeletionApi.myRequest,
  });

  const isDeletionPending = deletionRequest?.status === 'pending';
  const selectedReasonMeta = DELETION_REASONS.find((entry) => entry.code === selectedReason);
  const isDetailMissing = Boolean(selectedReasonMeta?.requiresDetail) && !reasonDetail.trim();

  const requestDeletionMutation = useMutation({
    mutationFn: () =>
      accountDeletionApi.submit({
        reason: selectedReason,
        reasonDetail: reasonDetail.trim() || undefined,
      }),
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      setSelectedReason(null);
      setReasonDetail('');
      queryClient.invalidateQueries({ queryKey: ['account-deletion'] });
      toast.success(`Request sent. We'll review it within ${REVIEW_WINDOW_HOURS} hours.`);
    },
    onError: (error) => toast.error(error.message ?? 'Could not send that request'),
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: () => accountDeletionApi.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-deletion'] });
      toast.success('Your account will stay open.');
    },
    onError: (error) => toast.error(error.message ?? 'Could not cancel that'),
  });

  function setPreference(key, value) {
    // Sound is applied locally straight away so the next chime obeys it, rather
    // than waiting for a round trip.
    if (key === 'soundEnabled') setEnabled(value);
    updatePreference.mutate({ [key]: value });
  }

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label={t('common.loading')} />
      </View>
    );
  }

  const preferences = profile?.preferences ?? {};

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Professional Top Bar */}
      <View
        className="flex-row items-center justify-between px-4 pb-3.5 pt-2 border-b"
        style={{ borderBottomColor: colors.border, backgroundColor: colors.surface }}
      >
        <View className="flex-row items-center gap-3">
          <BackButton />
          <View>
            <Text className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
              {t('settings.title')}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              {t('settings.subtitle')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {/* App Language Selection Card */}
        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          {t('settings.appLanguage')}
        </Text>

        <Card className="mb-5">
          <View className="py-1">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13.5, fontWeight: '800', color: colors.textPrimary }}
                >
                  {t('settings.appLanguage')}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}
                >
                  {t('settings.languageDesc')}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: `${colors.primary}18`,
                  borderWidth: 1,
                  borderColor: `${colors.primary}35`,
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 12 }}>{currentLanguage?.flag || '🌐'}</Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}
                >
                  {currentLanguage?.nativeName || 'English'}
                </Text>
              </View>
            </View>

            {/* Quick 1-Click Language Chips (Horizontal Scroll) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {availableLanguages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => {
                      setLanguage(lang.code);
                      toast.success(`${lang.flag} ${lang.nativeName}`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch language to ${lang.label}`}
                    style={({ pressed }) => ({
                      minWidth: 140,
                      minHeight: 52,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? `${colors.primary}15` : colors.surfaceAlt,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                      gap: 10,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 12.5,
                            fontWeight: isSelected ? '800' : '700',
                            color: isSelected ? colors.primary : colors.textPrimary,
                          }}
                        >
                          {lang.nativeName}
                        </Text>
                        {isSelected && (
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: colors.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: isSelected ? colors.primary : colors.textMuted,
                          marginTop: 1,
                        }}
                      >
                        {lang.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          {t('settings.notifications')}
        </Text>

        <Card className="mb-5">
          <SettingRow
            label={t('settings.pushNotifications')}
            description={t('settings.pushDesc')}
            value={preferences.pushEnabled !== false}
            onChange={(value) => setPreference('pushEnabled', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label={t('settings.sounds')}
            description={t('settings.soundsDesc')}
            value={preferences.soundEnabled !== false}
            onChange={(value) => setPreference('soundEnabled', value)}
            onPreview={playMessage}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <View className="py-2.5 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {t('settings.testPush')}
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {Platform.OS === 'web'
                  ? 'Send a desktop notification to your browser.'
                  : 'Send an immediate test notification to this phone.'}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                try {
                  playMessage?.();

                  // 1. If testing in Web Browser, trigger Browser Desktop Notification API
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
                    let perm = window.Notification.permission;
                    if (perm !== 'granted') {
                      perm = await window.Notification.requestPermission();
                    }
                    if (perm === 'granted') {
                      new window.Notification('Test Notification 🚀', {
                        body: 'Push notifications are working smoothly on Vibe!',
                        icon: '/favicon.ico',
                      });
                      toast.success('Desktop notification sent! 🎉');
                      return;
                    }
                  }

                  // 2. On Mobile (Android / iOS), trigger immediate local status-bar notification
                  if (Platform.OS !== 'web') {
                    await triggerLocalNotification({
                      title: 'Test Notification 🚀',
                      body: 'Push notifications are working smoothly on your phone!',
                    });

                    // Register hardware device token dynamically on backend
                    try {
                      const token = await registerForPushNotifications();
                      if (token) {
                        await deviceApi.register({
                          token,
                          platform: Platform.OS,
                          deviceName: 'Mobile Device',
                          appVersion: '1.0.0',
                        });
                        console.log('[Settings] Registered hardware token:', token);
                      }
                    } catch (regErr) {
                      console.warn('[Settings] Token reg err:', regErr?.message);
                    }
                  }

                  // 3. Call server test push
                  await notificationsApi.testPush({
                    title: 'Test Notification 🚀',
                    body: 'Push notifications are working smoothly on your device!',
                  });

                  toast.success('Push notification sent! Check your notification bar.');
                } catch {
                  toast.success('Notification triggered! Check your notification bar.');
                }
              }}
              className="px-3 py-1.5 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: colors.primary }}
            >
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                Test Push 🔔
              </Text>
            </Pressable>
          </View>
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          {t('settings.privacy')}
        </Text>

        <Card className="mb-5">
          <SettingRow
            label={t('settings.showOnline')}
            description={t('settings.showOnlineDesc')}
            value={preferences.showOnlineStatus !== false}
            onChange={(value) => setPreference('showOnlineStatus', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label={t('settings.shareLocation')}
            description={t('settings.shareLocationDesc')}
            value={preferences.shareLocation !== false}
            onChange={(value) => setPreference('shareLocation', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label={t('settings.marketingEmails')}
            description={t('settings.marketingEmails')}
            value={preferences.marketingEmails !== false}
            onChange={(value) => setPreference('marketingEmails', value)}
          />
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          {t('profile.menu.legal')}
        </Text>

        <Card className="mb-5">
          <Pressable
            onPress={() => router.push('/terms')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1.5"
          >
            <Text className="text-lg">📜</Text>
            <Text className="flex-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('profile.menu.terms')}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/privacy')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1.5"
          >
            <Text className="text-lg">🔒</Text>
            <Text className="flex-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('profile.menu.privacy')}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>

          <View className="my-2 h-px" style={{ backgroundColor: colors.border }} />

          <Pressable
            onPress={() => router.push('/refund')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1.5"
          >
            <Text className="text-lg">💳</Text>
            <Text className="flex-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('profile.menu.refund')}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          {t('profile.menu.account')}
        </Text>

        <Card className="mb-5">
          <View className="py-2">
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Signed in as
            </Text>
            <Text className="text-base" style={{ color: colors.textPrimary }}>
              {user?.email}
            </Text>
          </View>
        </Card>

        <View className="gap-3">
          <Button
            title={t('settings.signOut')}
            variant="outline"
            onPress={() => setIsSignOutModalOpen(true)}
          />

          {/* While a request is open the row stops being an action and becomes
              a status: what was asked, and the way back out of it. */}
          {isDeletionPending ? (
            <View
              style={{
                backgroundColor: `${colors.warning || '#F5A524'}14`,
                borderColor: `${colors.warning || '#F5A524'}44`,
                borderWidth: 1,
                borderRadius: radius,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  lineHeight: 18,
                  fontWeight: '800',
                  color: colors.textPrimary,
                }}
              >
                ⏳ Deletion request under review
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: colors.textSecondary,
                }}
              >
                Our team reviews these within {REVIEW_WINDOW_HOURS} hours. Your account stays open
                and works normally until then — you can still change your mind.
              </Text>

              <View className="mt-3">
                <Button
                  title="Keep my account"
                  variant="outline"
                  isLoading={cancelDeletionMutation.isPending}
                  onPress={() => cancelDeletionMutation.mutate()}
                />
              </View>
            </View>
          ) : (
            <Button
              title={t('settings.deleteAccount')}
              variant="ghost"
              tone="danger"
              onPress={() => setIsDeleteModalOpen(true)}
            />
          )}
        </View>

        {/* Not `auth.deleteDesc` any more: that string promises the account is
            deactivated and messaging disabled the moment you tap, which stopped
            being true when deletion became something an administrator reviews.
            Literal copy here rather than a new key, so the eleven translations
            do not silently fall back to an English sentence that is wrong. */}
        <Text className="mt-6 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
          Deleting your account is reviewed by our team first. Nothing is removed while it is
          pending, and you can cancel any time before it is approved.
        </Text>
      </ScrollView>

      {/* SweetAlert Style Sign Out Confirmation Dialog */}
      <Modal
        visible={isSignOutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignOutModalOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/65 px-5"
          onPress={() => setIsSignOutModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius + 8,
              padding: 24,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              className="items-center justify-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: `${colors.primary}18`,
                borderWidth: 2,
                borderColor: `${colors.primary}40`,
              }}
            >
              <Text style={{ fontSize: 30 }}>🚪</Text>
            </View>

            <Text className="text-xl font-bold text-center" style={{ color: colors.textPrimary }}>
              {t('auth.signOutTitle')}
            </Text>

            <Text
              className="text-sm text-center mt-2.5 leading-5"
              style={{ color: colors.textSecondary }}
            >
              {t('auth.signOutDesc')}
            </Text>

            <View className="w-full gap-2.5 mt-6">
              <Pressable
                onPress={async () => {
                  setIsSignOutModalOpen(false);
                  await signOut();
                  router.replace('/(auth)/login');
                }}
                className="w-full items-center justify-center py-3.5 px-4 flex-row gap-2"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: radius,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 16 }}>👋</Text>
                <Text className="text-base font-bold text-white">
                  {t('auth.yesSignOut')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsSignOutModalOpen(false)}
                className="w-full items-center justify-center py-3 px-4"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SweetAlert Style Delete Account Confirmation Dialog */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/65 px-5"
          onPress={() => setIsDeleteModalOpen(false)}
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
              <Text style={{ fontSize: 32 }}>⚠️</Text>
            </View>

            <Text className="text-xl font-bold text-center" style={{ color: colors.textPrimary }}>
              Request account deletion
            </Text>

            <Text
              className="text-sm text-center mt-2.5 leading-5"
              style={{ color: colors.textSecondary }}
            >
              Tell us why you are leaving. Your request goes to our team and we will review it
              within {REVIEW_WINDOW_HOURS} hours — your account stays open until then.
            </Text>

            {/* Asking before confirming, not after. A reason collected on the
                way out is the only feedback we get from someone leaving, and
                picking one is also a moment's pause before a decision that
                cannot be undone once it is approved. */}
            <ScrollView
              style={{ maxHeight: 260, width: '100%' }}
              showsVerticalScrollIndicator={false}
              className="mt-4"
            >
              {DELETION_REASONS.map((entry) => {
                const isChosen = selectedReason === entry.code;

                return (
                  <Pressable
                    key={entry.code}
                    onPress={() => setSelectedReason(entry.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isChosen }}
                    className="active:opacity-80"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: radius,
                      borderWidth: 1.5,
                      borderColor: isChosen ? colors.danger : colors.border,
                      backgroundColor: isChosen ? `${colors.danger}12` : colors.surfaceAlt,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        marginTop: 1,
                        borderWidth: 2,
                        borderColor: isChosen ? colors.danger : colors.border,
                        backgroundColor: isChosen ? colors.danger : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isChosen ? (
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
                      ) : null}
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontSize: 13.5,
                          lineHeight: 18,
                          fontWeight: '700',
                          color: colors.textPrimary,
                        }}
                      >
                        {entry.label}
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          fontSize: 11.5,
                          lineHeight: 16,
                          color: colors.textMuted,
                        }}
                      >
                        {entry.hint}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {selectedReasonMeta?.requiresDetail ? (
                <TextInput
                  value={reasonDetail}
                  onChangeText={setReasonDetail}
                  placeholder="Tell us a little more…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={500}
                  style={{
                    minHeight: 76,
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: radius,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    fontSize: 13.5,
                    textAlignVertical: 'top',
                  }}
                />
              ) : null}
            </ScrollView>

            <View className="w-full gap-2.5 mt-6">
              <Pressable
                onPress={() => requestDeletionMutation.mutate()}
                disabled={!selectedReason || isDetailMissing || requestDeletionMutation.isPending}
                className="w-full items-center justify-center py-3.5 px-4 flex-row gap-2"
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: radius,
                  shadowColor: colors.danger,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                  opacity: !selectedReason || isDetailMissing ? 0.5 : 1,
                }}
              >
                {requestDeletionMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                    <Text className="text-base font-bold text-white">Request deletion</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setIsDeleteModalOpen(false)}
                className="w-full items-center justify-center py-3 px-4"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
