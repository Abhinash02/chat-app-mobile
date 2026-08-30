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
  const { isAuthenticated, isRestoring } = useAuth();
  const { colors } = useTheme();

  if (isRestoring) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  /*
   * A signed-in user always lands in the app, verified or not.
   *
   * Routing unverified accounts to the code screen on every launch trapped
   * them there: signup issues a session immediately, so the status stays
   * pending until a code is entered, and anyone who never received one had no
   * way past it. It read as being asked to sign in again on every open.
   *
   * The prompt lives on as a dismissible banner inside the app instead, which
   * is the right weight for something that blocks nothing by default.
   */
  return <Redirect href="/(tabs)" />;
}
