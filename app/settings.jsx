import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Button, Card, Loading } from '../src/components/ui.jsx';
import { usersApi } from '../src/api/endpoints.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useSounds } from '../src/hooks/useSounds.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

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
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

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

  const deleteAccountMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: async () => {
      toast.info('Account deleted successfully.');
      await signOut();
      router.replace('/(auth)/welcome');
    },
    onError: (error) => toast.error(error.message ?? 'Could not delete account'),
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
        <Loading />
      </View>
    );
  }

  const preferences = profile?.preferences ?? {};

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          Notifications
        </Text>

        <Card className="mb-5">
          <SettingRow
            label="Push notifications"
            description="Get told when someone messages you while the app is closed."
            value={preferences.pushEnabled !== false}
            onChange={(value) => setPreference('pushEnabled', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label="Sounds"
            description="Play a chime for new messages and coins."
            value={preferences.soundEnabled !== false}
            onChange={(value) => setPreference('soundEnabled', value)}
            onPreview={playMessage}
          />
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          Privacy
        </Text>

        <Card className="mb-5">
          <SettingRow
            label="Show when I am online"
            description="Turn this off and others will not see your green dot."
            value={preferences.showOnlineStatus !== false}
            onChange={(value) => setPreference('showOnlineStatus', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label="Share my location"
            description="Lets people nearby find you. Your exact position is never shown — only a distance."
            value={preferences.shareLocation !== false}
            onChange={(value) => setPreference('shareLocation', value)}
          />

          <View className="h-px" style={{ backgroundColor: colors.border }} />

          <SettingRow
            label="Offers and news by email"
            description="Account emails like sign-in codes always come through, whatever you choose here."
            value={preferences.marketingEmails !== false}
            onChange={(value) => setPreference('marketingEmails', value)}
          />
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          Legal & Policies
        </Text>

        <Card className="mb-5">
          <Pressable
            onPress={() => router.push('/terms')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-1.5"
          >
            <Text className="text-lg">📜</Text>
            <Text className="flex-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
              Terms of Use
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
              Privacy Policy
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
              Refund Policy
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        </Card>

        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>
          Account
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
            title="Sign out"
            variant="outline"
            onPress={() => setIsSignOutModalOpen(true)}
          />

          <Button
            title="Permanently delete account"
            variant="ghost"
            tone="danger"
            isLoading={deleteAccountMutation.isPending}
            onPress={() => setIsDeleteModalOpen(true)}
          />
        </View>

        <Text className="mt-6 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
          Account deletion deactivates your profile, clears active sessions, and stops messaging immediately.
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
              Sign Out of Vibe Chat?
            </Text>

            <Text
              className="text-sm text-center mt-2.5 leading-5"
              style={{ color: colors.textSecondary }}
            >
              Are you sure you want to sign out? You will need your email and password to log back in.
            </Text>

            <View className="w-full gap-2.5 mt-6">
              <Pressable
                onPress={async () => {
                  setIsSignOutModalOpen(false);
                  await signOut();
                  router.replace('/(auth)/welcome');
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
                  Yes, Sign Out
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
                  Cancel
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
              Permanently Delete Account?
            </Text>

            <Text
              className="text-sm text-center mt-2.5 leading-5"
              style={{ color: colors.textSecondary }}
            >
              This will deactivate your profile, clear all your active sessions, and disable messaging. This action cannot be reversed.
            </Text>

            <View className="w-full gap-2.5 mt-6">
              <Pressable
                onPress={() => {
                  setIsDeleteModalOpen(false);
                  deleteAccountMutation.mutate();
                }}
                disabled={deleteAccountMutation.isPending}
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
                {deleteAccountMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                    <Text className="text-base font-bold text-white">
                      Yes, Delete My Account
                    </Text>
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
