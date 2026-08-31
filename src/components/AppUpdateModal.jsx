import { useState } from 'react';
import { Linking, Modal, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';

import { settingsApi } from '../api/endpoints.js';
import { Button, GradientButton } from './ui.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function AppUpdateModal() {
  const { colors, radius } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: settingsApi.public,
    staleTime: 60_000,
  });

  const appVersionConfig = publicSettings?.appVersion;
  if (!appVersionConfig) return null;

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const minimumVersion = appVersionConfig.minimumVersion || '1.0.0';
  const latestVersion = appVersionConfig.latestVersion || '1.0.0';

  const isBelowMinimum = compareVersions(currentVersion, minimumVersion) < 0;
  const isBelowLatest = compareVersions(currentVersion, latestVersion) < 0;
  const isForceUpdate = isBelowMinimum || appVersionConfig.forceUpdate;

  const shouldShow = (isBelowMinimum || (isBelowLatest && !dismissed)) && (isForceUpdate || !dismissed);

  if (!shouldShow) return null;

  async function handleOpenStore() {
    const url = appVersionConfig.playStoreUrl || 'https://play.google.com/store/apps/details?id=app.vibechat.mobile';
    try {
      await Linking.openURL(url);
    } catch {
      // Fallback
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/75 px-6">
        <View
          className="w-full max-w-sm p-6 items-center"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius + 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ backgroundColor: `${colors.primary}18` }}
          >
            <Text className="text-3xl">🚀</Text>
          </View>

          <Text className="text-xl font-bold text-center mb-1.5" style={{ color: colors.textPrimary }}>
            {isForceUpdate ? 'Update Required' : 'New Version Available'}
          </Text>

          <Text className="text-xs font-semibold mb-3 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
            Version {latestVersion}
          </Text>

          <Text className="text-sm text-center leading-5 mb-5" style={{ color: colors.textSecondary }}>
            {appVersionConfig.updateMessage ||
              'A new update is available on Google Play with new features, faster performance, and improvements!'}
          </Text>

          <View className="w-full gap-2.5">
            <GradientButton title="Update on Google Play" onPress={handleOpenStore} />

            {!isForceUpdate && (
              <Button
                title="Later"
                variant="ghost"
                onPress={() => setDismissed(true)}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
