import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { goBack } from '../src/components/ScreenHeader.jsx';
import { Badge, EmptyState, Loading } from '../src/components/ui.jsx';
import { coinsApi } from '../src/api/endpoints.js';
import { formatCoins, formatRelativeTime } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

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
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState(undefined);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['transactions', { type: selectedType }],
    queryFn: () => coinsApi.transactions({ type: selectedType, limit: 50 }),
  });

  const transactions = data?.items ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-3 px-4 pb-3 pt-2"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Transaction History
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            All your coin purchases, message debits & rewards
          </Text>
        </View>
      </View>

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
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="px-3.5 py-1.5"
                style={{
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isSelected ? colors.onPrimary : colors.textSecondary }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading label="Loading transactions…" />
        </View>
      ) : transactions.length === 0 ? (
        <EmptyState
          emoji="🪙"
          title="No transactions yet"
          description="Your coin purchases, gifts, bonuses, and chats will show up here."
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id ?? item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          renderItem={({ item }) => {
            const isCredit = (item.amount ?? item.coins ?? 0) > 0;
            const amount = Math.abs(item.amount ?? item.coins ?? 0);
            const icon = transactionIcon(item.type, item.amount ?? item.coins ?? 0);

            return (
              <View
                className="flex-row items-center gap-3 p-3.5"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isCredit ? `${colors.success}18` : `${colors.danger}18`,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                    {transactionTitle(item)}
                  </Text>
                  <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
                    {formatRelativeTime(item.createdAt)}
                    {item.balanceAfter !== undefined
                      ? ` · Balance: ${formatCoins(item.balanceAfter)}`
                      : ''}
                  </Text>
                </View>

                <View className="items-end">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: isCredit ? colors.success : colors.danger }}
                  >
                    {isCredit ? `+${formatCoins(amount)}` : `-${formatCoins(amount)}`}
                  </Text>
                  <Badge
                    label={item.status ?? 'completed'}
                    tone={item.status === 'failed' ? 'danger' : isCredit ? 'success' : 'neutral'}
                  />
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
