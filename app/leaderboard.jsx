import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar, Card, EmptyState, Loading } from '../src/components/ui.jsx';
import { gamesApi } from '../src/api/endpoints.js';
import { formatCoins } from '../src/lib/format.js';
import { useTheme } from '../src/theme/ThemeProvider.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardRow({ entry }) {
  const { colors, radius } = useTheme();
  const medal = MEDALS[entry.rank - 1];

  return (
    <View
      className="mb-2 flex-row items-center gap-3 px-4 py-3"
      style={{
        backgroundColor: entry.isMe ? `${colors.primary}0F` : colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: entry.isMe ? colors.primary : colors.border,
      }}
    >
      <View className="w-8 items-center">
        {medal ? (
          <Text className="text-xl">{medal}</Text>
        ) : (
          <Text className="text-sm font-bold" style={{ color: colors.textMuted }}>
            {entry.rank}
          </Text>
        )}
      </View>

      <Avatar
        uri={entry.avatarUrl}
        name={entry.nickname}
        gender={entry.gender}
        emoji={entry.avatarEmoji}
        color={entry.avatarColor}
        size={40}
      />

      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold" style={{ color: colors.textPrimary }}>
          {entry.nickname}
          {entry.isMe ? (
            <Text style={{ color: colors.primary }}> · you</Text>
          ) : null}
        </Text>
      </View>

      <Text className="text-base font-bold" style={{ color: colors.primary }}>
        {formatCoins(entry.totalPoints)}
      </Text>
    </View>
  );
}

export default function Leaderboard() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => gamesApi.leaderboard({ limit: 50 }),
    // Everyone sees the same board, so it should not go stale while it is open.
    refetchInterval: 30_000,
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>
        <View>
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Leaderboard
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            Everyone in the app
          </Text>
        </View>
      </View>

      {isLoading ? (
        <Loading label="Loading the board…" />
      ) : error ? (
        <EmptyState emoji="🏆" title="Could not load the leaderboard" description={error.message} />
      ) : (
        <>
          {/* The viewer's own standing is pinned, so they never have to scroll
              to find themselves — and unranked players still see where they are. */}
          {data?.me ? (
            <Card className="mx-4 mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  Your position
                </Text>
                <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                  {data.me.isRanked ? `#${data.me.rank}` : 'Not ranked yet'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  Points
                </Text>
                <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                  {formatCoins(data.me.totalPoints)}
                </Text>
              </View>
            </Card>
          ) : null}

          <FlatList
            data={data?.entries ?? []}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => <LeaderboardRow entry={item} />}
            ListEmptyComponent={
              <EmptyState
                emoji="🎮"
                title="Nobody has played yet"
                description="Be the first on the board — play a game and your name appears here."
              />
            }
          />
        </>
      )}
    </View>
  );
}
