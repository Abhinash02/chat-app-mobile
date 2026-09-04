import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../theme/ThemeProvider.jsx';

// Live Ad Unit ID provided by Google AdMob
const LIVE_BANNER_AD_UNIT_ID = 'ca-app-pub-1028685120327829/9588291921';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  adBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

/**
 * AdBanner Component
 * 
 * Configured according to Google Mobile Ads SDK Banner Implementation Guide:
 * - Ad Type: Banner
 * - Ad Unit ID: ca-app-pub-1028685120327829/9588291921 (live) / TestIds.BANNER (dev)
 * - Size: ANCHORED_ADAPTIVE_BANNER (standard adaptive sizing)
 * - Placement: Reusable container with proper margin and safe centering
 */
export function AdBanner({
  size,
  style,
  testMode = false,
  showLabel = false,
}) {
  const { colors } = useTheme();
  const [adFailed, setAdFailed] = useState(false);

  // In development, use TestIds.BANNER to protect AdMob account from policy violations.
  // In production builds, use the real unit ID.
  const adUnitId = (__DEV__ || testMode) && TestIds?.BANNER
    ? TestIds.BANNER
    : LIVE_BANNER_AD_UNIT_ID;

  const bannerSize = size || BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

  if (adFailed) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {showLabel && (
        <View style={styles.adBadge}>
          <Text style={[styles.adBadgeText, { color: colors.textMuted }]}>ADVERTISEMENT</Text>
        </View>
      )}

      <BannerAd
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[AdBanner] Ad failed to load:', error?.message || error);
          setAdFailed(true);
        }}
      />
    </View>
  );
}

export default AdBanner;
