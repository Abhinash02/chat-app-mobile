import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.jsx';

const styles = StyleSheet.create({
  devContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignSelf: 'center',
    width: '94%',
  },
  devText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

/**
 * Web stub for AdBanner (native Mobile Ads are active in Android/iOS APK builds).
 */
export function AdBanner({ style }) {
  const { colors } = useTheme();

  if (__DEV__) {
    return (
      <View style={[styles.devContainer, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }, style]}>
        <Text style={[styles.devText, { color: colors.textMuted }]}>
          📢 AdMob Banner Space (Active on Android APK)
        </Text>
      </View>
    );
  }

  return null;
}

export default AdBanner;
