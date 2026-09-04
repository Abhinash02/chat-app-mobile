import mobileAds from 'react-native-google-mobile-ads';

export const ADMOB_CONFIG = {
  appId: 'ca-app-pub-1028685120327829~9779863612',
  bannerAdUnitId: 'ca-app-pub-1028685120327829/9588291921',
};

let isInitialized = false;

/**
 * Initializes Google Mobile Ads SDK according to the Google Mobile Ads Quick Start guide.
 */
export async function initializeMobileAds() {
  if (isInitialized) return;

  try {
    const adapterStatuses = await mobileAds().initialize();
    isInitialized = true;
    console.log('[AdMob] Google Mobile Ads SDK initialized successfully:', adapterStatuses);
  } catch (err) {
    console.warn('[AdMob] Google Mobile Ads initialization warning:', err?.message || err);
  }
}
