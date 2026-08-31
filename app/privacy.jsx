import { ScrollView, Text, View } from 'react-native';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Card } from '../src/components/ui.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

export default function PrivacyPolicy() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title="Privacy Policy" fallback="/(tabs)/profile" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>
          Last Updated: August 2026
        </Text>

        <Card className="mb-4">
          <Text className="text-sm font-medium leading-5" style={{ color: colors.textPrimary }}>
            Your privacy is fundamental to <Text className="font-bold" style={{ color: colors.primary }}>Vibe Chat</Text>. This Privacy Policy explains what data we collect, how your location and profile are protected, and the controls you have over your personal information.
          </Text>
        </Card>

        {/* Section 1 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            1. Information We Collect
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Account Credentials:</Text> Email address, hashed password, and one-time verification OTPs.
            {'\n'}• <Text className="font-semibold text-ink-900">Public Profile Data:</Text> Nickname, Gender, Bio, Age Bracket, optional Zodiac Sign, and Avatar selection. Your real name and email address are never displayed publicly.
            {'\n'}• <Text className="font-semibold text-ink-900">Messages & Media:</Text> Encrypted chat messages, emoji reactions, and photos shared within one-on-one threads.
          </Text>
        </Card>

        {/* Section 2 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            2. Location Privacy & City Detection
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">GPS Proximity:</Text> When location access is allowed, GPS coordinates are used exclusively to calculate straight-line distances (e.g. {'"2.4 km away"'}).
            {'\n'}• <Text className="font-semibold text-ink-900">Reverse Geocoded City:</Text> We look up the city name (e.g. {'"Mumbai"'}) to display on your profile.
            {'\n'}• <Text className="font-semibold text-ink-900">No Precise Tracking:</Text> Your exact coordinates, street address, or live movements are never shared or shown to other users. You can disable location sharing anytime in Settings.
          </Text>
        </Card>

        {/* Section 3 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            3. Communications & Real-Time Sockets
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Live connections use secure WebSockets to deliver messages, online presence dots, and typing indicators.
            {'\n'}• Message Deletion: You can {'"Delete for me"'} (local removal) or {'"Delete for everyone"'} (soft-deletes message content on both ends).
            {'\n'}• Push Notifications: Delivered when you are away from the app to alert you of new messages or feedback status changes.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            4. Payments & Financial Information
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Online transactions are securely processed via Razorpay. We do not store credit card numbers, debit cards, or banking credentials on our servers.
            {'\n'}• Manual UPI verification records UTR reference codes purely to confirm and credit coin orders.
          </Text>
        </Card>

        {/* Section 5 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            5. Safety, Reporting & Content Moderation
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Chat reports snapshot the most recent messages from the reported user for operator investigation.
            {'\n'}• Automated profanity filters run locally and on the server to block harmful or vulgar terms.
          </Text>
        </Card>

        {/* Section 6 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            6. Your Rights & Account Deletion
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • You have the right to view, update, or edit your nickname, bio, age bracket, and zodiac sign at any time.
            {'\n'}• <Text className="font-semibold text-ink-900">Permanent Deletion:</Text> You can request immediate permanent account deletion in Settings, which wipes active session tokens, deactivates your profile, and stops messaging.
          </Text>
        </Card>

        {/* Section 7 */}
        <Card>
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            7. Contact Privacy Team
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            For privacy inquiries or data requests, reach our team at:
            {'\n'}
            <Text className="font-bold" style={{ color: colors.primary }}>
              privacy@vibechat.app
            </Text>
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
