import { ScrollView, Text, View } from 'react-native';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Card } from '../src/components/ui.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

export default function RefundPolicy() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title="Refund & Cancellation" fallback="/(tabs)/profile" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>
          Last Updated: September 2026
        </Text>

        <Card className="mb-4">
          <Text className="text-sm font-medium leading-5" style={{ color: colors.textPrimary }}>
            Thank you for purchasing coin packs on <Text className="font-bold" style={{ color: colors.primary }}>Vibe Chat</Text>. We strive to provide transparent billing and prompt resolution for any payment issues.
          </Text>
        </Card>

        {/* Section 1 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            1. Failed Payments with Bank Deductions (Auto-Refund)
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Automatic Bank Reversal:</Text> If money is debited from your bank account or UPI app but the payment was marked failed due to network timeout, the payment gateway (Cashfree, Razorpay, or NPCI for UPI) automatically reverses the full amount back to your original payment method.
            {'\n'}• <Text className="font-semibold text-ink-900">Timeline:</Text> Auto-refunds typically reflect within 2 to 24 hours (maximum 2–3 business days per banking guidelines). No manual request is required.
          </Text>
        </Card>

        {/* Section 2 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            2. Network Drops & Webhook Auto-Recovery
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • If you completed a payment successfully but your app closed or lost internet before confirmation, our backend webhook automatically captures the payment and credits the purchased coins directly to your wallet within minutes.
          </Text>
        </Card>

        {/* Section 3 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            3. Duplicate Payments & Accidental Purchases
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • <Text className="font-semibold text-ink-900">Duplicate Orders:</Text> If a technical glitch causes duplicate charges for the same coin pack, we will promptly refund the duplicate transaction in full.
            {'\n'}• <Text className="font-semibold text-ink-900">Unused Coins:</Text> If you made an accidental purchase and have not spent any of the coins from it, you may request a full refund within 7 days of purchase. Coins are spent in the order they were bought, so sending even one message after a purchase may mean the pack no longer qualifies.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            4. Non-Refundable Items
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Coins that have already been spent or consumed for chat messages, free talk extensions, or virtual room features cannot be refunded.
            {'\n'}• Daily bonus coins, promotional tokens, and gift balances are granted at no cost and cannot be refunded.
            {'\n'}• <Text className="font-semibold text-ink-900">Suspended or terminated accounts:</Text> If an account is terminated for breaking the conduct rules in the Terms of Use, any remaining coin balance is forfeited and is not refundable.
            {'\n'}• <Text className="font-semibold text-ink-900">Deleted accounts:</Text> Deleting your account is voluntary and does not entitle you to a refund of unspent coins. Spend or withdraw your balance before you delete.
          </Text>
        </Card>

        {/* Section 5 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            5. Manual UPI Verification & Rejection
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • For Manual UPI transfers, an administrator manually verifies bank records.
            {'\n'}• If a transfer reference cannot be verified or an incorrect amount was sent, the order is rejected with an explanatory note, and funds sent in error will be reversed to your UPI ID.
          </Text>
        </Card>

        {/* Section 6 — withdrawals. Not a refund, but it is the first place
            people look for one, so it belongs on this page. */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            6. Withdrawals & Earnings (Not a Refund)
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            Converting earned coins to rupees is a payout, not a refund, and follows different rules:
            {'\n'}• <Text className="font-semibold text-ink-900">Who can withdraw:</Text> Coin-to-rupee conversion is available to female accounts only. It is paid from your coin balance, which is built mainly from chat earnings.
            {'\n'}• <Text className="font-semibold text-ink-900">Limits:</Text> Withdrawals are subject to a minimum amount and a daily cap, both set by the admin and shown on the Earnings screen before you confirm.
            {'\n'}• <Text className="font-semibold text-ink-900">Processing:</Text> Coins are deducted when you submit the request and held while it is reviewed. Approved payouts are credited within 5–7 working days.
            {'\n'}• <Text className="font-semibold text-ink-900">If rejected:</Text> Coins are returned to your wallet in full, with a note explaining why. Common reasons are an incorrect UPI ID or bank details that do not match your account.
          </Text>
        </Card>

        {/* Section 7 */}
        <Card>
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            7. How to Request a Refund or Assistance
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            Raise a support ticket — it reaches the team directly and keeps your order details attached to the conversation:
            {'\n'}• <Text className="font-semibold text-ink-900">In-App (fastest):</Text> Profile → Help & Customer Support → {'"Coins & Payment Issue"'}. You can attach a screenshot of the payment.
            {'\n'}• <Text className="font-semibold text-ink-900">Email:</Text>{' '}
            <Text className="font-bold" style={{ color: colors.primary }}>
              support@vibechat.app
            </Text>
            {'\n'}
            {'\n'}<Text className="font-semibold text-ink-900">Please include:</Text> your registered email, the Order ID or UPI UTR reference, the amount, and the date. Without a reference we cannot match the payment to your account.
            {'\n'}
            {'\n'}<Text className="font-semibold text-ink-900">Response time:</Text> We aim to reply within 48 hours. Approved refunds are returned to the original payment method — we cannot refund to a different account, card, or UPI ID.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
