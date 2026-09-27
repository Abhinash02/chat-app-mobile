import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LegalDocScreen } from '../src/components/LegalDocScreen.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

/**
 * The safety notice, kept in the app deliberately.
 *
 * Everything else on this screen is a document the admin panel publishes, but
 * this is not a policy clause — it is the warning that stops somebody handing
 * over an OTP, and it has to be on screen even when the document behind it
 * cannot be loaded. No shadow: nativewind compiles one into an Android
 * elevation whose lit silhouette shows through a translucent fill as a second
 * box, which is what it used to do here.
 */
function SafetyNotice() {
  const { colors } = useTheme();

  return (
    <View
      className="mb-4 p-4 rounded-3xl border"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
      }}
    >
      <View className="flex-row items-start gap-2">
        <View className="h-8 w-8 rounded-xl items-center justify-center bg-red-500/20">
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
        </View>
        <Text
          className="flex-1 text-sm font-black text-red-600 dark:text-red-400"
          style={{ lineHeight: 19 }}
        >
          STRICT SAFETY NOTICE: NEVER SHARE CONTACTS OR OTPS
        </Text>
      </View>

      <Text
        className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300 font-medium"
        style={{ color: colors.textSecondary }}
      >
        • Never share your phone number, WhatsApp, Instagram or Snapchat handle, personal email, or
        home address in chats or calls.
        {'\n'}• Vibe Chat staff will NEVER ask for your verification OTP, password, UPI PIN, or
        banking credentials. Anyone asking for an OTP is attempting fraud.
        {'\n'}• Soliciting contact details or sending external payment links breaches our Community
        Guidelines and results in immediate, permanent account termination.
      </Text>
    </View>
  );
}

/*
 * The policy wording itself lives on the server.
 *
 * It used to be several hundred lines of JSX here, which meant a legal
 * correction needed an app release — and the website, reading the same
 * document, would state something different until that release shipped.
 */
export default function PrivacyPolicy() {
  return (
    <LegalDocScreen
      slug="privacy"
      title="Privacy & Safety Policy"
      fallback="/(tabs)/profile"
      notice={<SafetyNotice />}
    />
  );
}
