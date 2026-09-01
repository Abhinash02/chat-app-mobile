import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader, goBack } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, EmptyState, Loading } from '../src/components/ui.jsx';
import { coinsApi, paymentsApi } from '../src/api/endpoints.js';
import { BASE_URL } from '../src/api/client.js';
import { storage } from '../src/lib/storage.js';
import { formatCoins, formatRelativeTime, formatRupees } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

const FILTER_TYPES = [
  { label: 'All', value: undefined },
  { label: '🪙 Purchases', value: 'purchase' },
  { label: '🎁 Bonuses', value: 'daily_bonus' },
  { label: '💬 Messages', value: 'message_charge' },
  { label: '🎮 Games', value: 'game_reward' },
];

function transactionIcon(type, amount) {
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
    purchase: 'Coins Purchase',
    daily_bonus: 'Daily Bonus Reward',
    message_charge: 'Message Sent',
    game_reward: 'Game Reward',
    admin_grant: 'Admin Grant',
    admin_deduct: 'Admin Adjustment',
    room_gift: 'Gift Sent',
  };
  return map[item.type] ?? item.type?.replace(/_/g, ' ') ?? 'Coin Transaction';
}

export default function Transactions() {
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'ledger'
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

  const orders = ordersData?.items ?? [];
  const transactions = ledgerData?.items ?? [];

  // Calculate quick stats
  const totalPaidInvoices = orders.filter((o) => o.status === 'paid').length;
  const totalCoinsBought = orders
    .filter((o) => o.status === 'paid')
    .reduce((acc, curr) => acc + (curr.totalCoins || curr.coins || 0), 0);

  const handleDownloadInvoice = async (order) => {
    try {
      setDownloadingId(order.id);
      toast.info('Generating official PDF invoice…');

      let targetUrl = order.invoiceUrl;

      // If not yet uploaded to Cloudinary, generate and fetch via authenticated API
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
      // Refetch orders list so the persistent Cloudinary URL is updated in local state
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Executive Attractive Screen Header */}
      <ScreenHeader
        title="Transaction History"
        subtitle="Official Cashfree tax invoices & coin balance records"
        fallback="/(tabs)/profile"
      />

      {/* Overview Stats Bar */}
      <View
        className="px-4 py-3 border-b flex-row items-center justify-between"
        style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center gap-2">
          <View
            className="h-8 w-8 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${colors.primary}18` }}
          >
            <Text className="text-sm">🧾</Text>
          </View>
          <View>
            <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
              Paid Invoices
            </Text>
            <Text className="text-sm font-black" style={{ color: colors.textPrimary }}>
              {totalPaidInvoices} Receipts
            </Text>
          </View>
        </View>

        <View className="h-6 w-px" style={{ backgroundColor: colors.border }} />

        <View className="flex-row items-center gap-2">
          <View
            className="h-8 w-8 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${colors.coinGold || '#F59E0B'}20` }}
          >
            <CoinIcon size={14} />
          </View>
          <View>
            <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.textMuted }}>
              Coins Purchased
            </Text>
            <Text className="text-sm font-black" style={{ color: colors.coinGold || '#F59E0B' }}>
              +{formatCoins(totalCoinsBought)}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Tab Switcher */}
      <View
        className="flex-row p-3 gap-2 border-b"
        style={{ borderBottomColor: colors.border, backgroundColor: colors.surfaceAlt }}
      >
        <Pressable
          onPress={() => setActiveTab('orders')}
          className="flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'orders' ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: activeTab === 'orders' ? colors.primary : colors.border,
            shadowColor: activeTab === 'orders' ? colors.primary : '#000',
            shadowOpacity: activeTab === 'orders' ? 0.2 : 0,
            shadowRadius: 4,
            elevation: activeTab === 'orders' ? 2 : 0,
          }}
        >
          <Text className="text-sm">🧾</Text>
          <Text
            className="text-xs font-bold"
            style={{ color: activeTab === 'orders' ? colors.onPrimary : colors.textPrimary }}
          >
            Tax Invoices & Bills ({orders.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('ledger')}
          className="flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'ledger' ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: activeTab === 'ledger' ? colors.primary : colors.border,
            shadowColor: activeTab === 'ledger' ? colors.primary : '#000',
            shadowOpacity: activeTab === 'ledger' ? 0.2 : 0,
            shadowRadius: 4,
            elevation: activeTab === 'ledger' ? 2 : 0,
          }}
        >
          <Text className="text-sm">🪙</Text>
          <Text
            className="text-xs font-bold"
            style={{ color: activeTab === 'ledger' ? colors.onPrimary : colors.textPrimary }}
          >
            Coin Ledger
          </Text>
        </Pressable>
      </View>

      {/* View: Orders & Bills */}
      {activeTab === 'orders' ? (
        isOrdersLoading ? (
          <View className="flex-1 items-center justify-center">
            <Loading label="Loading orders & invoices…" />
          </View>
        ) : orders.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="No invoices yet"
            description="When you purchase coin bundles via Cashfree, your official tax invoices will be generated and saved to the cloud here."
          />
        ) : (
          <FlatList
            data={orders}
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
              const isPaid = item.status === 'paid';
              const cashfreeRef = item.providerPaymentId || item.providerOrderId || item.id;
              const isDownloadingThis = downloadingId === item.id;

              return (
                <Card
                  className="p-4"
                  style={{
                    borderColor: isPaid ? `${colors.primary}30` : colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  {/* Top Row: Package + Badge */}
                  <View
                    className="flex-row items-center justify-between pb-3 border-b"
                    style={{ borderBottomColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                      <View
                        className="h-10 w-10 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: `${colors.primary}15` }}
                      >
                        <Text className="text-lg">⚡</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>
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
                          <Ionicons name="copy-outline" size={10} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </View>

                    <Badge
                      label={isPaid ? 'PAID' : item.status.toUpperCase()}
                      tone={isPaid ? 'success' : item.status === 'failed' ? 'danger' : 'warning'}
                    />
                  </View>

                  {/* Mid Row: Coins Credited & Amount Paid */}
                  <View
                    className="my-3 p-3 rounded-2xl flex-row items-center justify-between"
                    style={{ backgroundColor: colors.surfaceAlt }}
                  >
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                        Coins Credited
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <CoinIcon size={14} />
                        <Text className="text-sm font-black" style={{ color: colors.coinGold || '#F59E0B' }}>
                          +{formatCoins(item.totalCoins || item.coins || 0)} Coins
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                        Amount Paid
                      </Text>
                      <Text className="text-base font-black" style={{ color: colors.textPrimary }}>
                        {formatRupees(item.amountInRupees)}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Row: Timestamp + Cloudinary PDF Download Button */}
                  <View
                    className="flex-row items-center justify-between pt-2 border-t"
                    style={{ borderTopColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>

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
                            Download PDF
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </Card>
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
                          {formatRelativeTime(item.createdAt)}
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
