import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Safely enables screenshot & screen recording protection on Android/iOS native devices,
 * while safely no-oping on Web without throwing errors.
 */
export function useScreenCaptureProtection() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;
    import('expo-screen-capture')
      .then((ScreenCapture) => {
        if (isMounted && ScreenCapture?.preventScreenCaptureAsync) {
          ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
      if (Platform.OS !== 'web') {
        import('expo-screen-capture')
          .then((ScreenCapture) => {
            if (ScreenCapture?.allowScreenCaptureAsync) {
              ScreenCapture.allowScreenCaptureAsync().catch(() => undefined);
            }
          })
          .catch(() => undefined);
      }
    };
  }, []);
}
