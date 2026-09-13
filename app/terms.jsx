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
          Last Updated: September 2026
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
            {'\n'}• <Text className="font-semibold text-ink-900">Virtual Goods:</Text> Coins purchased via Cashfree, Razorpay, or Manual UPI are virtual tokens with no real-world monetary value. Once spent they cannot be refunded. The limited cases where a refund is possible — failed payments, duplicate charges, and unspent coins — are set out in the Refund Policy.
            {'\n'}• <Text className="font-semibold text-ink-900">Earnings are not refunds:</Text> Female accounts may convert earned coins to rupees and request a payout. That is a separate process from refunds and is described in the Refund Policy.
          </Text>
        </Card>

        {/* Section 3 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            3. Language & Respectful Conduct
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            Vibe Chat is a place to meet people and talk. It is not an adult platform. The following
            are not allowed anywhere on the service — in one-to-one chats, voice rooms, photo posts,
            captions, status updates, or your profile:
            {'\n'}
            {'\n'}• <Text className="font-bold text-red-500">No abusive or vulgar language.</Text> Swearing, insults, and gaali directed at another person are prohibited, in every language. Writing abuse in Hindi, Punjabi, or Roman script is treated exactly the same as writing it in English.
            {'\n'}• <Text className="font-bold text-red-500">No sexual talk.</Text> Sexual conversation, propositions, explicit descriptions, and asking someone what they are wearing or to describe themselves sexually are prohibited — including where both people appear willing.
            {'\n'}• <Text className="font-bold text-red-500">No nudity or sexual media.</Text> Do not send, request, or post nude or sexual photos, videos, or voice notes. Requesting them is a violation on its own, whether or not anything is sent.
            {'\n'}• <Text className="font-bold text-red-500">No sexual solicitation.</Text> Offering or asking for paid sexual services, escort services, or sexual content in exchange for coins or money is prohibited and will be reported where the law requires it.
            {'\n'}• <Text className="font-bold text-red-500">No harassment.</Text> Do not continue messaging someone who has asked you to stop, and do not intimidate, stalk, threaten, or impersonate anyone.
            {'\n'}• <Text className="font-bold text-red-500">No hate speech.</Text> Attacks based on religion, caste, region, gender, sexuality, disability, or ethnicity are prohibited.
            {'\n'}• <Text className="font-bold text-red-500">Nothing involving minors.</Text> The service is 18+. Any sexual content involving a minor, or any attempt to contact a minor, is reported to the authorities and the account is permanently banned.
          </Text>
        </Card>

        {/* Section 3a */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            4. How These Rules Are Enforced
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Automatic word filtering:</Text> Messages, captions, and room chat are screened against a list of abusive and sexual terms in English, Hindi, and Punjabi. Matching words are masked before anyone sees them. The filter is a floor, not a guarantee — it cannot read intent, and it will not catch everything.
            {'\n'}• <Text className="font-semibold text-ink-900">Reporting:</Text> Anyone can report a conversation. A report captures a snapshot of recent messages for review, so deleting a message afterwards does not remove it from the report.
            {'\n'}• <Text className="font-semibold text-ink-900">Blocking:</Text> Blocking stops all messaging immediately and removes you both from each other{"'"}s discovery feed.
            {'\n'}• <Text className="font-semibold text-ink-900">Consequences:</Text> Depending on severity, a violation may lead to a warning, removal of the content, suspension, or permanent termination. Serious violations — sexual content involving minors, threats of violence, or non-consensual intimate images — result in immediate permanent termination without warning.
            {'\n'}• <Text className="font-semibold text-ink-900">No refunds on termination:</Text> Coins remaining on a terminated account are forfeited and are not refundable.
          </Text>
        </Card>

        {/* Section 3b */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            5. Safety: Contacts, OTPs & Money
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-bold text-red-500">Do not share contact details.</Text> Phone numbers, WhatsApp, social media handles, personal email, and home addresses should stay off the platform.
            {'\n'}• <Text className="font-bold text-red-500">Never share or ask for an OTP.</Text> Vibe Chat staff will never request your OTP, password, UPI PIN, or banking details. Anyone who asks is attempting fraud — report them.
            {'\n'}• <Text className="font-bold text-red-500">Do not send money to other users.</Text> Requests for money, gift cards, or payment links are the most common scam on apps like this one.
            {'\n'}• Fraud, commercial solicitation, and automated or bot traffic are prohibited.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            6. Live Rooms & Voice Interactions
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Audio and text rooms are community spaces for respectful live conversation.
            {'\n'}• Room hosts and administrators reserve the right to remove or moderate participants who disrupt community guidelines.
          </Text>
        </Card>

        {/* Section 5 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            7. Blocking, Reporting & Account Suspension
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
            8. Account Deletion & Termination
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • You may request permanent deletion of your account at any time through Settings. Requests are reviewed by our team, usually within 24 hours; once approved, your profile is deactivated and all active sessions are revoked.
            {'\n'}• Vibe Chat reserves the right to terminate accounts that violate safety guidelines or these terms.
          </Text>
        </Card>

        {/* Section 7 */}
        <Card>
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            9. Contact & Support
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
