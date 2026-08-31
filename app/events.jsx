import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { Badge, Button, Card, CoinIcon, Loading } from '../src/components/ui.jsx';
import { eventsApi } from '../src/api/endpoints.js';
import { formatCountdown } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

function EventCard({ item }) {
  const { colors } = useTheme();

  const [msRemaining, setMsRemaining] = useState(() => {
    if (!item.endsAt) return null;
    return Math.max(0, new Date(item.endsAt).getTime() - new Date().getTime());
  });

  useEffect(() => {
    if (!item.endsAt) return undefined;
    const timer = setInterval(() => {
      setMsRemaining(Math.max(0, new Date(item.endsAt).getTime() - new Date().getTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, [item.endsAt]);

  const hasPerks = item.rewardCoins > 0 || item.discountPercent > 0 || item.rewardFreeMinutes > 0;

  function handleAction() {
    if (item.actionUrl === 'rooms') {
      router.push('/(tabs)/rooms');
    } else if (item.actionUrl === 'chats') {
      router.push('/(tabs)/chats');
    } else {
      router.push('/coins');
    }
  }

  return (
    <Card className="mb-4 overflow-hidden" style={{ borderColor: `${colors.primary}30` }}>
      <View className="flex-row items-center justify-between gap-2 mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            {item.title}
          </Text>
          {item.badgeText ? (
            <Badge label={item.badgeText} tone="brand" />
          ) : null}
        </View>

        {msRemaining !== null && (
          <View
            className="px-2.5 py-1 rounded-full flex-row items-center gap-1"
            style={{ backgroundColor: `${colors.warning}20` }}
          >
            <Text className="text-[11px] font-bold text-amber-700">
              ⏱️ {formatCountdown(msRemaining)}
            </Text>
          </View>
        )}
      </View>

      <Text className="text-sm leading-5 mb-3" style={{ color: colors.textSecondary }}>
        {item.description}
      </Text>

      {hasPerks && (
        <View
          className="p-3 rounded-xl mb-3 flex-row flex-wrap items-center gap-2"
          style={{ backgroundColor: colors.surfaceAlt }}
        >
          {item.rewardCoins > 0 && (
            <View className="flex-row items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg">
              <CoinIcon size={14} />
              <Text className="text-xs font-bold text-amber-600">+{item.rewardCoins} Bonus Coins</Text>
            </View>
          )}

          {item.discountPercent > 0 && (
            <View className="flex-row items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              <Text className="text-xs font-bold text-emerald-600">🏷️ {item.discountPercent}% OFF</Text>
            </View>
          )}

          {item.rewardFreeMinutes > 0 && (
            <View className="flex-row items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
              <Text className="text-xs font-bold text-indigo-600">⏱️ +{item.rewardFreeMinutes}m Free Chat</Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center justify-between pt-1">
        <Text className="text-xs font-medium" style={{ color: colors.textMuted }}>
          {item.targetGender === 'male'
            ? '👦 Exclusive for Boys'
            : item.targetGender === 'female'
            ? '👧 Exclusive for Girls'
            : '👥 Open to Everyone'}
        </Text>

        <Button
          title={item.actionUrl === 'rooms' ? 'Join Rooms' : 'Claim / View Offer'}
          size="sm"
          onPress={handleAction}
        />
      </View>
    </Card>
  );
}

export default function EventsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: events, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['public-events'],
    queryFn: eventsApi.list,
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenHeader title="Events & Special Offers" fallback="/(tabs)" />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading label="Loading live events & offers…" />
        </View>
      ) : (
        <FlatList
          data={events || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard item={item} />}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 32,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-4">
              <Text className="text-4xl mb-3">🎉</Text>
              <Text className="text-base font-bold mb-1" style={{ color: colors.textPrimary }}>
                No active events right now
              </Text>
              <Text className="text-xs text-center leading-4 max-w-xs" style={{ color: colors.textMuted }}>
                Check back soon for festival discounts, bonus coin drops, and free chat opportunities!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
