import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  const { colors } = useTheme();
  const { user, signOut, refreshUser } = useAuth();
  const { playMessage, setEnabled } = useSounds();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

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
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
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

        <Button
          title="Sign out"
          variant="outline"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          }}
        />

        <Text className="mt-6 text-center text-xs leading-4" style={{ color: colors.textMuted }}>
          Need help or want your account deleted? Contact support from the app store listing.
        </Text>
      </ScrollView>
    </View>
  );
}
