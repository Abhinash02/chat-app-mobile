import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from './ui.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * A titled row with an optional action on the right.
 */
export function SectionHeader({ title, badge, action, onAction }) {
  const { colors, radius } = useTheme();

  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Text className="text-lg font-black tracking-tight" style={{ color: colors.textPrimary }}>
        {title}
      </Text>

      {badge ? (
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${colors.success || '#10B981'}20` }}
        >
          <Text
            className="text-[10px] font-black uppercase tracking-wider"
            style={{ color: colors.success || '#10B981' }}
          >
            {badge}
          </Text>
        </View>
      ) : null}

      {action ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          className="ml-auto px-3 py-1 rounded-full border shadow-sm active:scale-95 transition"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <Text className="text-xs font-bold" style={{ color: colors.primary }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A live room, with who is in it. */
function RoomCard({ room, onPress }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name}`}
      className="mr-3 p-3.5 border shadow-sm active:scale-95 transition"
      style={{
        width: 220,
        backgroundColor: colors.surface,
        borderRadius: radius + 4,
        borderColor: colors.border,
      }}
    >
      <View className="mb-2 flex-row items-center gap-1.5">
        <View
          className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${colors.success || '#10B981'}15` }}
        >
          <View
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: colors.success || '#10B981' }}
          />
          <Text
            className="text-[10px] font-black uppercase"
            style={{ color: colors.success || '#10B981' }}
          >
            Live
          </Text>
        </View>

        <Text className="ml-auto text-[11px] font-semibold" style={{ color: colors.textMuted }}>
          {room.distanceKm !== null && room.distanceKm !== undefined
            ? `📍 ${room.distanceKm} km · `
            : ''}
          {room.participantCount}/{room.maxParticipants}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="text-sm font-extrabold"
        style={{ color: colors.textPrimary }}
      >
        {room.name}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-0.5 text-xs font-medium"
        style={{ color: colors.textMuted }}
      >
        {room.topic || `Hosted by ${room.host?.nickname ?? 'someone'}`}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {(room.participants ?? []).slice(0, 3).map((participant, index) => (
            <View
              key={participant.userId || index}
              style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 3 - index }}
              className="rounded-full border-2 border-white"
            >
              <Avatar
                name={participant.nickname}
                gender={participant.gender}
                emoji={participant.avatarEmoji}
                color={participant.avatarColor}
                size={24}
              />
            </View>
          ))}
        </View>

        <View
          className="px-2.5 py-1 rounded-full flex-row items-center gap-1"
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>
            Join →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Compact tile for a game. */
function GameCard({ game, onPress }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.name}`}
      className="mr-3 items-center justify-center px-4 py-4"
      style={{
        width: 116,
        backgroundColor: colors.surface,
        borderRadius: radius + 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 30 }}>{game.emoji}</Text>
      <Text
        numberOfLines={1}
        className="mt-2 text-xs font-bold"
        style={{ color: colors.textPrimary }}
      >
        {game.name}
      </Text>
      <Text className="text-[11px]" style={{ color: colors.textMuted }}>
        {game.personalBest > 0 ? `best ${game.personalBest}` : 'not played'}
      </Text>
    </Pressable>
  );
}

function RowSkeleton({ width, height }) {
  return (
    <View className="flex-row">
      {[0, 1, 2].map((index) => (
        <View key={index} className="mr-3">
          <Skeleton width={width} height={height} radius={18} />
        </View>
      ))}
    </View>
  );
}

/**
 * A horizontally scrolling row of cards.
 *
 * `horizontal` FlatLists get the same virtualisation as vertical ones, which
 * matters when a row can hold every live room.
 */
function CardRow({ data, isLoading, renderItem, keyExtractor, skeleton }) {
  if (isLoading) return <RowSkeleton {...skeleton} />;
  if (!data?.length) return null;

  return (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{ paddingRight: 4 }}
    />
  );
}

export function GamesRow({ games, isLoading }) {
  return (
    <CardRow
      data={games}
      isLoading={isLoading}
      skeleton={{ width: 116, height: 108 }}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => (
        <GameCard game={item} onPress={() => router.push('/(tabs)/games')} />
      )}
    />
  );
}

/**
 * The tile that starts a room.
 *
 * It sits at the end of the row rather than only in the header, because an
 * empty or short row is exactly when someone might want to open one — and a
 * list with nothing in it should not be a dead end.
 */
function CreateRoomCard() {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/rooms?create=true')}
      accessibilityRole="button"
      accessibilityLabel="Start a room"
      className="items-center justify-center px-4 py-4 mr-3 border shadow-sm active:scale-95 transition"
      style={{
        width: 150,
        backgroundColor: `${colors.primary}0F`,
        borderRadius: radius + 4,
        borderColor: `${colors.primary}35`,
      }}
    >
      <View
        className="mb-2 h-10 w-10 items-center justify-center rounded-2xl shadow-sm"
        style={{ backgroundColor: colors.primary }}
      >
        <Ionicons name="add" size={22} color={colors.onPrimary || '#FFFFFF'} />
      </View>
      <Text
        className="text-center text-xs font-black tracking-wide"
        style={{ color: colors.primary }}
      >
        Start a Room
      </Text>
      <View
        className="mt-1 px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${colors.primary}18` }}
      >
        <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>
          Free to host
        </Text>
      </View>
    </Pressable>
  );
}

export function LiveRoomsRow({ rooms, isLoading }) {
  if (isLoading) return <RowSkeleton width={210} height={118} />;

  return (
    <FlatList
      data={rooms ?? []}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingRight: 4 }}
      ListFooterComponent={<CreateRoomCard />}
      renderItem={({ item }) => (
        <RoomCard room={item} onPress={() => router.push(`/room/${item.id}`)} />
      )}
    />
  );
}
