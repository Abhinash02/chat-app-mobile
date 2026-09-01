import { ScrollView, Text, View } from 'react-native';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Card } from '../src/components/ui.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

export default function TermsOfUse() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title="Terms of Use" fallback="/(tabs)/profile" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>
          Last Updated: August 2026
        </Text>

        <Card className="mb-4">
          <Text className="text-sm font-medium leading-5" style={{ color: colors.textPrimary }}>
            Welcome to <Text className="font-bold" style={{ color: colors.primary }}>Vibe Chat</Text>. By creating an account, accessing, or using our mobile application and associated services, you agree to be bound by these Terms of Use.
          </Text>
        </Card>

        {/* Section 1 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            1. Eligibility & Account Creation
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Age Requirement:</Text> You must be at least 18 years old to use Vibe Chat.
            {'\n'}• <Text className="font-semibold text-ink-900">Account Identity:</Text> You choose a public Nickname, Age Bracket, and optional Zodiac Sign. Your real name and verified email remain private.
            {'\n'}• <Text className="font-semibold text-ink-900">Opposite-Gender Pairing:</Text> The platform{"'"}s discovery feed connects opposite genders. Gender selected at registration cannot be modified.
          </Text>
        </Card>

        {/* Section 2 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            2. Virtual Coins, Free Talk & Billing
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Free Talk Allowance:</Text> Paying male accounts receive 30 minutes of introductory free chat. Female accounts enjoy free messaging.
            {'\n'}• <Text className="font-semibold text-ink-900">Message Billing:</Text> After the free allowance, messaging consumes 10 coins per 7-message prepaid block.
            {'\n'}• <Text className="font-semibold text-ink-900">Daily Bonus:</Text> Active accounts may claim daily bonus coins every 24 hours.
            {'\n'}• <Text className="font-semibold text-ink-900">Virtual Goods:</Text> Coins purchased via Razorpay or Manual UPI are non-refundable virtual tokens with no real-world monetary value.
          </Text>
        </Card>

        {/* Section 3 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            3. User Conduct & Strict Safety Rules
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            To maintain a safe and respectful community, you agree NOT to:
            {'\n'}• <Text className="font-bold text-red-500">Do Not Share Contact Details:</Text> You are strictly prohibited from sharing phone numbers, WhatsApp, social media handles, personal emails, or home addresses.
            {'\n'}• <Text className="font-bold text-red-500">Do Not Share or Solicit OTPs:</Text> Never ask for or share verification OTPs, passwords, or banking details. Vibe Chat staff will never request your OTP.
            {'\n'}• Harass, intimidate, stalk, impersonate, or abuse any user.
            {'\n'}• Transmit sexually explicit, obscene, or non-consensual media.
            {'\n'}• Engage in fraud, scamming, commercial solicitation, or unauthorized bot traffic.
            {'\n'}• Use hate speech or vulgarity. Automated profanity filters actively moderate chat texts.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            4. Live Rooms & Voice Interactions
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Audio and text rooms are community spaces for respectful live conversation.
            {'\n'}• Room hosts and administrators reserve the right to remove or moderate participants who disrupt community guidelines.
          </Text>
        </Card>

        {/* Section 5 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            5. Blocking, Reporting & Account Suspension
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Blocking:</Text> Blocking an account prevents all further messaging and removes mutual feed visibility immediately.
            {'\n'}• <Text className="font-semibold text-ink-900">Reporting:</Text> Filing a report captures recent chat snapshots for administrative review.
            {'\n'}• <Text className="font-semibold text-ink-900">Suspension:</Text> Accounts that accumulate 3 or more distinct user reports are subject to prompt administrative review and permanent suspension.
          </Text>
        </Card>

        {/* Section 6 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            6. Account Deletion & Termination
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • You may permanently delete your account at any time through Settings. Deletion deactivates your profile and revokes all active sessions instantly.
            {'\n'}• Vibe Chat reserves the right to terminate accounts that violate safety guidelines or these terms.
          </Text>
        </Card>

        {/* Section 7 */}
        <Card>
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            7. Contact & Support
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            If you have any questions regarding these Terms of Use or require assistance, please submit feedback via the Profile page or email us at:
            {'\n'}
            <Text className="font-bold" style={{ color: colors.primary }}>
              support@vibechat.app
            </Text>
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
