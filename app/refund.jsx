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
          Last Updated: August 2026
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
            • <Text className="font-semibold text-ink-900">Automatic Bank Reversal:</Text> If money is debited from your bank account or UPI app but the payment was marked failed due to network timeout, the payment gateway (Razorpay / NPCI) automatically reverses the full amount back to your original payment method.
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
            {'\n'}• <Text className="font-semibold text-ink-900">Unused Coins:</Text> If you made an accidental purchase and have not spent any of the purchased coins, you may request a full refund within 7 days of purchase.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card className="mb-3.5">
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            4. Non-Refundable Items
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            • Coins that have already been spent or consumed for chat messages, free talk extensions, or virtual room features cannot be refunded.
            {'\n'}• Daily bonus coins, promotional tokens, and gift balances have no cash value and cannot be redeemed for cash.
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

        {/* Section 6 */}
        <Card>
          <Text className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>
            6. How to Request a Refund or Assistance
          </Text>
          <Text className="text-xs leading-5" style={{ color: colors.textSecondary }}>
            If your coins were not credited or you need a refund for a duplicate purchase, contact us with your registered email and Order / UTR reference:
            {'\n'}• <Text className="font-semibold text-ink-900">In-App:</Text> Profile → Send Feedback & Ideas
            {'\n'}• <Text className="font-semibold text-ink-900">Email:</Text>{' '}
            <Text className="font-bold" style={{ color: colors.primary }}>
              refunds@vibechat.app
            </Text>
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
