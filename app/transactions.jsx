import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Badge, Card, CoinIcon, EmptyState, Loading } from '../src/components/ui.jsx';
import { coinsApi, paymentsApi, withdrawalsApi } from '../src/api/endpoints.js';
import { formatCoins, formatDateTime, formatRelativeTime, formatRupees } from '../src/lib/format.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

const FILTER_TYPES = [
  { label: 'All', value: undefined },
  { label: '💸 Cashouts', value: 'withdrawal' },
  { label: '💖 Chat Earn', value: 'chat_earning' },
  { label: '🪙 Purchases', value: 'purchase' },
  { label: '↩️ Refunds', value: 'admin_deduct' },
  { label: '🎁 Bonuses', value: 'daily_bonus' },
  { label: '💬 Messages', value: 'message_charge' },
  { label: '🎮 Games', value: 'game_reward' },
];

const STATUS_THEME = {
  refunded: {
    tone: '#10B981',
    tint: '#10B98112',
    border: '#10B98135',
    icon: 'arrow-undo-circle',
    label: 'Refunded',
  },
  failed: {
    tone: '#EF4444',
    tint: '#EF444415',
    border: '#EF444435',
    icon: 'close-circle',
    label: 'Failed',
  },
  expired: {
    tone: '#D97706',
    tint: '#F59E0B12',
    border: '#F59E0B35',
    icon: 'hourglass',
    label: 'Expired',
  },
  rejected: {
    tone: '#EF4444',
    tint: '#EF444412',
    border: '#EF444435',
    icon: 'close-circle',
    label: 'Rejected',
  },
  paid: {
    tone: null,
    tint: null,
    border: null,
    icon: 'checkmark-circle',
    label: 'Paid',
  },
};

function orderStatusKey(item) {
  if (item.status === 'refunded') return 'refunded';
  if (item.status === 'rejected') return 'rejected';
  if (item.status === 'expired') return 'expired';
  if (item.status === 'failed') return 'failed';
  return 'paid';
}

function transactionIcon(type, amount) {
  if (type === 'admin_deduct' || type === 'refund') return '↩️';
  if (type === 'withdrawal') return '💸';
  if (type === 'withdrawal_refund') return '↩️';
  if (type === 'chat_earning') return '💖';
  if (amount > 0) {
    if (type === 'purchase') return '💳';
    if (type === 'daily_bonus') return '🎁';
    if (type === 'game_reward') return '🎮';
    if (type === 'admin_grant') return '⭐';
    return '➕';
  }
  if (type === 'message_charge') return '💬';
  if (type === 'room_gift') return '🎀';
  return '➖';
}

function transactionTitle(item) {
  if (item.description) return item.description;
  const map = {
    withdrawal: 'Rupee Cashout / Withdrawal',
    withdrawal_refund: 'Withdrawal Refunded',
    chat_earning: 'Chat-to-Earn Reward',
    purchase: 'Coins Purchase',
    daily_bonus: 'Daily Bonus Reward',
    message_charge: 'Message Sent',
    game_reward: 'Game Reward',
    admin_grant: 'Admin Grant',
    admin_deduct: 'Refund Coin Adjustment',
    refund: 'Coin Refund Reversal',
    room_gift: 'Gift Sent',
  };
  return map[item.type] ?? item.type?.replace(/_/g, ' ') ?? 'Coin Transaction';
}

function InfoRow({ label, value, tone, mono, colors }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-[11px]" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <Text
        className={mono ? 'text-[11px] font-mono' : 'text-[11px] font-bold'}
        style={{ color: tone ?? colors.textPrimary }}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

function RefundNotice({ item, colors }) {
  const theme = STATUS_THEME.refunded;
  return (
    <View className="mb-3 rounded-2xl border overflow-hidden" style={{ borderColor: theme.border }}>
      <View className="flex-row items-center gap-1.5 px-3 py-2" style={{ backgroundColor: theme.tint }}>
        <Ionicons name={theme.icon} size={15} color={theme.tone} />
        <Text className="text-xs font-extrabold" style={{ color: theme.tone }}>
          Refund Processed
        </Text>
        <View className="flex-1" />
        <Text className="text-[10px] font-semibold" style={{ color: theme.tone }}>
          {formatRelativeTime(item.refundedAt || item.updatedAt || item.createdAt)}
        </Text>
      </View>
      <View className="px-3 py-2.5" style={{ backgroundColor: colors.surface }}>
        <InfoRow label="Amount reversed" value={formatRupees(item.amountInRupees)} tone={theme.tone} colors={colors} />
        {item.refundReason ? <InfoRow label="Reason" value={item.refundReason} colors={colors} /> : null}
        {item.providerRefundId ? (
          <InfoRow label="Refund ID" value={item.providerRefundId} mono colors={colors} />
        ) : null}
        <Text className="text-[10.5px] leading-4 mt-1.5" style={{ color: colors.textMuted }}>
          Credited back to your original payment method — banks typically post this within 5–7 business days.
        </Text>
      </View>
    </View>
  );
}

function FailedNotice({ item, colors }) {
  const theme = item.status === 'expired' ? STATUS_THEME.expired : STATUS_THEME.failed;
  return (
    <View className="mb-3 rounded-2xl border overflow-hidden" style={{ borderColor: theme.border }}>
      <View className="flex-row items-center gap-1.5 px-3 py-2" style={{ backgroundColor: theme.tint }}>
        <Ionicons name="shield-checkmark" size={15} color={theme.tone} />
        <Text className="text-xs font-extrabold" style={{ color: theme.tone }}>
          Auto-Refund Protection
        </Text>
      </View>
      <View className="px-3 py-2.5" style={{ backgroundColor: colors.surface }}>
        {item.failureReason ? (
          <View className="mb-2 pb-2 border-b border-dashed" style={{ borderBottomColor: colors.border }}>
            <Text className="text-[11px] font-bold text-red-500">
              Reason: {item.failureReason}
            </Text>
          </View>
        ) : null}
        <Text className="text-[11.5px] leading-4" style={{ color: colors.textPrimary }}>
          {item.status === 'expired'
            ? 'This order window closed before payment was confirmed. If any amount was deducted, it was never captured and will not be charged.'
            : 'This payment did not go through on the gateway or was cancelled. If money was deducted from your bank or UPI app, it was not captured by us.'}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-2 self-start px-2.5 py-1 rounded-full" style={{ backgroundColor: `${theme.tone}15` }}>
          <Ionicons name="time-outline" size={12} color={theme.tone} />
          <Text className="text-[10.5px] font-bold" style={{ color: theme.tone }}>
            Auto-refunded in 2–24 hrs (max 2–3 business days)
          </Text>
        </View>
      </View>
    </View>
  );
}

function RejectedNotice({ item, colors }) {
  const theme = STATUS_THEME.rejected;
  return (
    <View className="mb-3 rounded-2xl border overflow-hidden" style={{ borderColor: theme.border }}>
      <View className="flex-row items-center gap-1.5 px-3 py-2" style={{ backgroundColor: theme.tint }}>
        <Ionicons name={theme.icon} size={15} color={theme.tone} />
        <Text className="text-xs font-extrabold" style={{ color: theme.tone }}>
          Order Rejected
        </Text>
      </View>
      <View className="px-3 py-2.5" style={{ backgroundColor: colors.surface }}>
        <Text className="text-[11.5px] leading-4" style={{ color: colors.textPrimary }}>
          {item.rejectionReason || 'The payment verification was rejected.'}
        </Text>
      </View>
    </View>
  );
}

export default function Transactions() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const isGirl =
    String(user?.gender).toLowerCase() === 'female' ||
    String(user?.gender).toLowerCase() === 'girl';

  // 4 dedicated tabs: 'cashouts' | 'invoices' | 'refunds' | 'ledger'
  const [activeTab, setActiveTab] = useState(isGirl ? 'cashouts' : 'invoices');
  const [selectedType, setSelectedType] = useState(undefined);
  const [downloadingId, setDownloadingId] = useState(null);

  // Orders Query (Cashfree purchases with Cloudinary PDF Invoice downloads)
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isRefetching: isOrdersRefetching,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => paymentsApi.orders({ limit: 50 }),
  });

  // Withdrawals Query (Cashouts for girls)
  const {
    data: withdrawalsData,
    isLoading: isWithdrawalsLoading,
    isRefetching: isWithdrawalsRefetching,
    refetch: refetchWithdrawals,
  } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => withdrawalsApi.getMyWithdrawals({ limit: 50 }),
  });

  // Coin Ledger Query
  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
    isRefetching: isLedgerRefetching,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ['transactions', { type: selectedType }],
    queryFn: () => coinsApi.transactions({ type: selectedType, limit: 50 }),
  });

  const extractItems = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.withdrawals)) return data.withdrawals;
    if (Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items.items)) return data.items.items;
    return [];
  };

  const orders = extractItems(ordersData);
  const withdrawals = extractItems(withdrawalsData);
  const transactions = extractItems(ledgerData);

  // Segment orders into Paid Invoices vs Refunds & Issues
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const issueOrders = orders.filter((o) => o.status === 'refunded' || o.status === 'failed' || o.status === 'expired' || o.status === 'rejected');
  const refundedOrders = orders.filter((o) => o.status === 'refunded');

  const successfulWithdrawals = withdrawals.filter((w) => w.status === 'success' || w.status === 'approved');
  const totalWithdrawnAmount = successfulWithdrawals.reduce((sum, w) => sum + (w.amountInRupees || 0), 0);
  const totalWithdrawnCoins = successfulWithdrawals.reduce((sum, w) => sum + (w.coins || 0), 0);

  const totalRefundAmount = refundedOrders.reduce(
    (acc, curr) => acc + (curr.amountInRupees || curr.amountInPaise / 100 || 0),
    0
  );
  const totalCoinsBought = paidOrders.reduce(
    (acc, curr) => acc + (curr.totalCoins || curr.coins || 0),
    0
  );

  const handleDownloadInvoice = async (order) => {
    try {
      setDownloadingId(order.id);
      toast.info('Generating official PDF invoice…');

      let targetUrl = order.invoiceUrl;

      if (!targetUrl || !targetUrl.startsWith('http')) {
        const res = await paymentsApi.getInvoice(order.id);
        targetUrl = res?.invoiceUrl;
      }

      if (!targetUrl) {
        throw new Error('Invoice URL could not be generated');
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(targetUrl, '_blank');
      } else {
        await Linking.openURL(targetUrl);
      }

      toast.success('Official PDF Invoice opened!');
      refetchOrders();
    } catch (err) {
      toast.error(err?.message || 'Could not download invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyRef = async (refId) => {
    if (!refId) return;
    await Clipboard.setStringAsync(String(refId));
    toast.success('Transaction reference copied!');
  };

  const currentOrdersList = activeTab === 'invoices' ? paidOrders : issueOrders;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Executive Attractive Screen Header */}
      <ScreenHeader
        title={isGirl ? 'Earnings & Cashout History' : 'Transaction History'}
        subtitle="Official payout invoices, refund records & coin ledger"
        fallback="/(tabs)/profile"
      />

      {/* Overview Stats Bar — responsive layout */}
      <View
        className="px-4 py-3 border-b flex-row items-center gap-2"
        style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
      >
        {isGirl ? (
          <>
            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="cash-outline" size={13} color="#10B981" />
                <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
                  Withdrawn
                </Text>
              </View>
              <Text className="text-sm font-black text-emerald-600">
                ₹{totalWithdrawnAmount.toFixed(2)}
              </Text>
            </View>

            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="checkmark-done-circle-outline" size={13} color={colors.primary} />
                <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
                  Completed
                </Text>
              </View>
              <Text className="text-sm font-black" style={{ color: colors.textPrimary }}>
                {successfulWithdrawals.length} Cashouts
              </Text>
            </View>

            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <CoinIcon size={12} />
                <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
                  Coins Conv.
                </Text>
              </View>
              <Text className="text-sm font-black" style={{ color: colors.coinGold || '#F59E0B' }}>
                {formatCoins(totalWithdrawnCoins)}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="receipt-outline" size={13} color={colors.primary} />
                <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
                  Paid
                </Text>
              </View>
              <Text className="text-sm font-black" style={{ color: colors.textPrimary }}>
                {paidOrders.length} Invoices
              </Text>
            </View>

            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{
                backgroundColor: refundedOrders.length > 0 ? '#10B9810C' : colors.surfaceAlt,
                borderColor: refundedOrders.length > 0 ? '#10B98130' : colors.border,
              }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Ionicons name="arrow-undo" size={13} color={refundedOrders.length > 0 ? '#10B981' : colors.textMuted} />
                <Text
                  className="text-[10px] uppercase font-bold tracking-wider"
                  style={{ color: refundedOrders.length > 0 ? '#10B981' : colors.textMuted }}
                >
                  Refunds
                </Text>
              </View>
              <Text
                className="text-sm font-black"
                style={{ color: refundedOrders.length > 0 ? '#10B981' : colors.textPrimary }}
              >
                {formatRupees(totalRefundAmount)}
              </Text>
            </View>

            <View
              className="flex-1 px-3 py-2.5 rounded-2xl border"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <CoinIcon size={12} />
                <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
                  Coins
                </Text>
              </View>
              <Text className="text-sm font-black" style={{ color: colors.coinGold || '#F59E0B' }}>
                +{formatCoins(totalCoinsBought)}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Segmented Tabs */}
      <View className="px-3 py-2.5 border-b" style={{ borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <View
          className="p-1 rounded-2xl flex-row items-center"
          style={{ backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}
        >
          {/* Tab 0: Cashouts (Only for girls) */}
          {isGirl && (
            <Pressable
              onPress={() => setActiveTab('cashouts')}
              className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1"
              style={{
                backgroundColor: activeTab === 'cashouts' ? colors.primary : 'transparent',
                shadowColor: activeTab === 'cashouts' ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeTab === 'cashouts' ? 0.3 : 0,
                shadowRadius: 4,
                elevation: activeTab === 'cashouts' ? 2 : 0,
              }}
            >
              <Ionicons
                name="cash"
                size={13}
                color={activeTab === 'cashouts' ? colors.onPrimary : colors.textMuted}
              />
              <Text
                className="text-[11px] font-bold"
                style={{ color: activeTab === 'cashouts' ? colors.onPrimary : colors.textPrimary }}
                numberOfLines={1}
              >
                Cashouts ({withdrawals.length})
              </Text>
            </Pressable>
          )}

          {/* Tab 1: Invoices */}
          {!isGirl && (
            <Pressable
              onPress={() => setActiveTab('invoices')}
              className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1"
              style={{
                backgroundColor: activeTab === 'invoices' ? colors.primary : 'transparent',
                shadowColor: activeTab === 'invoices' ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeTab === 'invoices' ? 0.3 : 0,
                shadowRadius: 4,
                elevation: activeTab === 'invoices' ? 2 : 0,
              }}
            >
              <Ionicons
                name="receipt"
                size={13}
                color={activeTab === 'invoices' ? colors.onPrimary : colors.textMuted}
              />
              <Text
                className="text-[11px] font-bold"
                style={{ color: activeTab === 'invoices' ? colors.onPrimary : colors.textPrimary }}
                numberOfLines={1}
              >
                Invoices ({paidOrders.length})
              </Text>
            </Pressable>
          )}

          {/* Tab 2: Failed & Refunds */}
          {!isGirl && (
            <Pressable
              onPress={() => setActiveTab('refunds')}
              className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1"
              style={{
                backgroundColor: activeTab === 'refunds' ? colors.primary : 'transparent',
                shadowColor: activeTab === 'refunds' ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeTab === 'refunds' ? 0.3 : 0,
                shadowRadius: 4,
                elevation: activeTab === 'refunds' ? 2 : 0,
              }}
            >
              <Ionicons
                name="alert-circle"
                size={13}
                color={activeTab === 'refunds' ? colors.onPrimary : colors.textMuted}
              />
              <Text
                className="text-[11px] font-bold"
                style={{ color: activeTab === 'refunds' ? colors.onPrimary : colors.textPrimary }}
                numberOfLines={1}
              >
                Failed & Refunds ({issueOrders.length})
              </Text>
            </Pressable>
          )}

          {/* Tab 3: Coin Ledger */}
          <Pressable
            onPress={() => setActiveTab('ledger')}
            className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1"
            style={{
              backgroundColor: activeTab === 'ledger' ? colors.primary : 'transparent',
              shadowColor: activeTab === 'ledger' ? colors.primary : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === 'ledger' ? 0.3 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'ledger' ? 2 : 0,
            }}
          >
            <Ionicons
              name="wallet"
              size={13}
              color={activeTab === 'ledger' ? colors.onPrimary : colors.textMuted}
            />
            <Text
              className="text-[11px] font-bold"
              style={{ color: activeTab === 'ledger' ? colors.onPrimary : colors.textPrimary }}
              numberOfLines={1}
            >
              Coin Ledger
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content Area */}
      {activeTab === 'cashouts' ? (
        isWithdrawalsLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loading label="Loading cashout invoices…" />
          </View>
        ) : withdrawals.length === 0 ? (
          <EmptyState
            emoji="💸"
            title="No cashout invoices yet"
            description="When you convert your chat earnings into rupees, all your withdrawal invoices, UTR records, and real-time approval status will appear here."
          />
        ) : (
          <FlatList
            data={withdrawals}
            keyExtractor={(item) => String(item._id || item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
            ListHeaderComponent={() => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: `${colors.primary}10`,
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: `${colors.primary}25`,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>⏱️</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1, lineHeight: 15 }}>
                  Withdrawals are verified and the amount will reflect in your account within <Text style={{ fontWeight: '700', color: colors.primary }}>5–7 working days</Text>.
                </Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isWithdrawalsRefetching}
                onRefresh={refetchWithdrawals}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => {
              const isPending = item.status === 'pending';
              const isSuccess = item.status === 'success' || item.status === 'approved';
              const isRejected = item.status === 'rejected';
              const isUpi = item.payoutMethod === 'upi';
              const refId = item.cashfreeUtr || item.cashfreeReferenceId || item.cashfreeTransferId || item._id;

              const statusTone = isPending ? '#D97706' : isSuccess ? '#10B981' : '#EF4444';
              const statusBg = isPending ? '#FEF3C7' : isSuccess ? '#D1FAE5' : '#FEE2E2';

              return (
                <View
                  className="rounded-3xl overflow-hidden flex-row"
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: `${statusTone}30`,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 4, backgroundColor: statusTone }} />

                  <View className="flex-1 p-4">
                    {/* Header */}
                    <View
                      className="flex-row items-center justify-between pb-3 border-b"
                      style={{ borderBottomColor: colors.border }}
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        <View
                          className="h-11 w-11 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: `${statusTone}15` }}
                        >
                          <Ionicons
                            name={isPending ? 'hourglass-outline' : isSuccess ? 'checkmark-circle' : 'close-circle'}
                            size={22}
                            color={statusTone}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                            Rupee Payout Invoice
                          </Text>
                          <Pressable
                            onPress={() => handleCopyRef(refId)}
                            className="flex-row items-center gap-1 mt-0.5"
                          >
                            <Text
                              className="text-[11px] font-mono"
                              style={{ color: colors.textMuted }}
                              numberOfLines={1}
                              ellipsizeMode="middle"
                            >
                              Ref: {refId}
                            </Text>
                            <Ionicons name="copy-outline" size={11} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      </View>

                      <View
                        className="px-2.5 py-1 rounded-full border flex-row items-center gap-1"
                        style={{ backgroundColor: statusBg, borderColor: `${statusTone}40` }}
                      >
                        <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: statusTone }}>
                          {isPending ? '⏳ Under Review' : isSuccess ? '✅ Transferred' : '❌ Rejected & Refunded'}
                        </Text>
                      </View>
                    </View>

                    {/* Mid Row: Coins Converted & INR Amount */}
                    <View
                      className="my-3 p-3 rounded-2xl flex-row items-center justify-between border"
                      style={{
                        backgroundColor: `${statusTone}0A`,
                        borderColor: `${statusTone}20`,
                      }}
                    >
                      <View>
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                          Coins Converted
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <CoinIcon size={14} />
                          <Text className="text-sm font-black text-rose-600">
                            -{formatCoins(item.coins)} Coins
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                          Payout Amount
                        </Text>
                        <Text className="text-base font-black text-emerald-600">
                          ₹{item.amountInRupees?.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Account Destination Details */}
                    <View className="py-2 border-t border-dashed" style={{ borderTopColor: colors.border }}>
                      <InfoRow
                        label="Destination"
                        value={isUpi ? `UPI: ${item.upiId}` : `A/C: ${item.bankDetails?.accountNumber} (${item.bankDetails?.ifsc})`}
                        colors={colors}
                      />
                      {item.cashfreeUtr ? (
                        <InfoRow label="Bank UTR" value={item.cashfreeUtr} mono colors={colors} />
                      ) : null}
                    </View>

                    {/* Rejection Alert */}
                    {isRejected && (
                      <View
                        className="p-2.5 rounded-xl border mt-1"
                        style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }}
                      >
                        <Text className="text-xs font-bold text-red-800">
                          Reason: {item.rejectionReason || 'Request declined by admin'}
                        </Text>
                        <Text className="text-[11px] text-red-700 mt-0.5">
                          🪙 {item.coins} coins have been automatically refunded back into your wallet balance.
                        </Text>
                      </View>
                    )}

                    {/* Footer Date */}
                    <View className="flex-row items-center justify-between pt-2 border-t" style={{ borderTopColor: colors.border }}>
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                        <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                          {formatDateTime(item.createdAt)}
                        </Text>
                      </View>
                      <Text className="text-[10px] font-mono" style={{ color: colors.textMuted }}>
                        Rate: {item.coinsPerRupeeRate || 1} Coin = ₹{(1 / (item.coinsPerRupeeRate || 1)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : activeTab === 'invoices' || activeTab === 'refunds' ? (
        isOrdersLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loading label="Loading orders & invoices…" />
          </View>
        ) : currentOrdersList.length === 0 ? (
          <EmptyState
            emoji={activeTab === 'invoices' ? '🧾' : '↩️'}
            title={activeTab === 'invoices' ? 'No paid invoices yet' : 'No refunds or failed orders'}
            description={
              activeTab === 'invoices'
                ? 'When you purchase coins, your official tax invoices will appear here for download.'
                : 'Any refunded, expired, or failed order protections will appear here.'
            }
          />
        ) : (
          <FlatList
            data={currentOrdersList}
            keyExtractor={(item, index) => String(item.id || item._id || index)}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isOrdersRefetching}
                onRefresh={refetchOrders}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => {
              const statusKey = orderStatusKey(item);
              const isPaid = statusKey === 'paid';
              const isRefunded = statusKey === 'refunded';
              const isFailed = statusKey === 'failed' || statusKey === 'expired';
              const isRejected = statusKey === 'rejected';
              const theme = STATUS_THEME[statusKey];
              const accentColor = theme.tone ?? colors.primary;
              const cashfreeRef = item.providerPaymentId || item.providerOrderId || item.id;
              const isDownloadingThis = downloadingId === item.id;

              return (
                <View
                  className="rounded-3xl overflow-hidden flex-row"
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: theme.border ?? colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  {/* Left status accent bar */}
                  <View style={{ width: 4, backgroundColor: accentColor }} />

                  <View className="flex-1 p-4">
                    {/* Top Row: Package + Badge */}
                    <View
                      className="flex-row items-center justify-between pb-3 border-b"
                      style={{ borderBottomColor: colors.border }}
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        <View
                          className="h-11 w-11 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: `${accentColor}15` }}
                        >
                          <Ionicons
                            name={isRefunded ? 'arrow-undo' : isFailed ? 'time-outline' : isRejected ? 'close' : 'flash'}
                            size={20}
                            color={accentColor}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                            {item.packageName || 'Coins Bundle'}
                          </Text>
                          <Pressable
                            onPress={() => handleCopyRef(cashfreeRef)}
                            className="flex-row items-center gap-1 mt-0.5"
                          >
                            <Text
                              className="text-[11px] font-mono"
                              style={{ color: colors.textMuted }}
                              numberOfLines={1}
                              ellipsizeMode="middle"
                            >
                              Ref: {cashfreeRef}
                            </Text>
                            <Ionicons name="copy-outline" size={11} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      </View>

                      <View
                        className="px-2.5 py-1 rounded-full border flex-row items-center gap-1"
                        style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}35` }}
                      >
                        <Ionicons name={theme.icon} size={11} color={accentColor} />
                        <Text
                          className="text-[10px] font-extrabold uppercase tracking-wider"
                          style={{ color: accentColor }}
                        >
                          {theme.label}
                        </Text>
                      </View>
                    </View>

                    {/* Mid Row: Coins Credited & Amount Paid / Refunded */}
                    <View
                      className="my-3 p-3 rounded-2xl flex-row items-center justify-between border"
                      style={{
                        backgroundColor: isRefunded || isFailed ? `${accentColor}0A` : colors.surfaceAlt,
                        borderColor: isRefunded || isFailed ? `${accentColor}25` : colors.border,
                      }}
                    >
                      <View>
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                          {isRefunded ? 'Coins Reversal' : isFailed ? 'Coins (Uncredited)' : 'Coins Credited'}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <CoinIcon size={14} />
                          <Text
                            className="text-sm font-black"
                            style={{
                              color: isRefunded ? accentColor : isFailed ? colors.textMuted : colors.coinGold || '#F59E0B',
                            }}
                          >
                            {isRefunded
                              ? `-${formatCoins(item.totalCoins || item.coins || 0)} Coins`
                              : isFailed
                              ? '0 Coins'
                              : `+${formatCoins(item.totalCoins || item.coins || 0)} Coins`}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                          {isRefunded ? 'Refund Amount' : isFailed ? 'Order Value' : 'Amount Paid'}
                        </Text>
                        <Text className="text-base font-black" style={{ color: isRefunded ? accentColor : colors.textPrimary }}>
                          {formatRupees(item.amountInRupees)}
                        </Text>
                      </View>
                    </View>

                    {/* Status-specific notice */}
                    {isRefunded ? <RefundNotice item={item} colors={colors} /> : null}
                    {isFailed ? <FailedNotice item={item} colors={colors} /> : null}
                    {isRejected && item.rejectionReason ? <RejectedNotice item={item} colors={colors} /> : null}

                    {/* Bottom Row: Timestamp + Cloudinary PDF Download Button */}
                    <View
                      className="flex-row items-center justify-between pt-2 border-t"
                      style={{ borderTopColor: colors.border }}
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                        <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                          {formatDateTime(item.creditedAt || item.createdAt)}
                        </Text>
                      </View>

                      {isPaid || isRefunded ? (
                        <Pressable
                          onPress={() => handleDownloadInvoice(item)}
                          disabled={isDownloadingThis}
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                          style={{
                            backgroundColor: `${colors.primary}12`,
                            borderColor: `${colors.primary}30`,
                          }}
                        >
                          {isDownloadingThis ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <Ionicons name="download-outline" size={14} color={colors.primary} />
                              <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                                {isRefunded ? 'Credit Note / PDF' : 'Download PDF'}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      ) : (
                        <Text className="text-[11px] font-semibold" style={{ color: isFailed ? '#EF4444' : colors.textMuted }}>
                          {item.status === 'expired' ? 'Expired / Unpaid' : 'Payment Failed / Cancelled'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* View: Coin Activity Ledger */
        <>
          <View className="py-2.5">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTER_TYPES}
              keyExtractor={(item) => item.label}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              renderItem={({ item }) => {
                const isSelected = selectedType === item.value;
                return (
                  <Pressable
                    onPress={() => setSelectedType(item.value)}
                    className="px-3.5 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: isSelected ? colors.onPrimary : colors.textSecondary }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {isLedgerLoading ? (
            <View className="flex-1 items-center justify-center">
              <Loading label="Loading coin transactions…" />
            </View>
          ) : transactions.length === 0 ? (
            <EmptyState
              emoji="🪙"
              title="No coin activity yet"
              description="Your coins spend, rewards, bonus drops, and purchases will be logged here."
            />
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item, index) => String(item.id || item._id || item.referenceId || index)}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
              refreshControl={
                <RefreshControl
                  refreshing={isLedgerRefetching}
                  onRefresh={refetchLedger}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              ItemSeparatorComponent={() => <View className="h-2.5" />}
              renderItem={({ item }) => {
                const isPositive = item.amount > 0;
                return (
                  <Card className="p-3.5 flex-row items-center justify-between" style={{ backgroundColor: colors.surface }}>
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View
                        className="h-10 w-10 rounded-2xl items-center justify-center"
                        style={{
                          backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                        }}
                      >
                        <Text className="text-base">{transactionIcon(item.type, item.amount)}</Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                          {transactionTitle(item)}
                        </Text>
                        <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                          {formatDateTime(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text
                        className="text-sm font-black"
                        style={{ color: isPositive ? '#16A34A' : colors.textPrimary }}
                      >
                        {isPositive ? `+${formatCoins(item.amount)}` : `-${formatCoins(Math.abs(item.amount))}`}
                      </Text>
                      <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                        Bal: {formatCoins(item.balanceAfter ?? 0)}
                      </Text>
                    </View>
                  </Card>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}