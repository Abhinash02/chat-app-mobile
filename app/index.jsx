import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { Loading } from '../src/components/ui.jsx';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

/**
 * The launch gate. Rendering anything before the stored session is checked
 * would either flash the app at a signed-out user or flash the welcome screen
 * at a signed-in one.
 */
export default function Index() {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { colors } = useTheme();

  if (isRestoring) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  // Verified elsewhere too, but sending an unverified account straight to the
  // code screen saves them hitting a wall on the first tap.
  if (user?.status === 'pending_verification') {
    return <Redirect href={{ pathname: '/(auth)/verify', params: { email: user.email } }} />;
  }

  return <Redirect href="/(tabs)" />;
}
