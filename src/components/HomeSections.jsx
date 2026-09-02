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
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name}`}
      style={({ pressed }) => ({
        width: 215,
        height: 125,
        marginRight: 12,
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: 12,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 10,
            backgroundColor: `${colors.success || '#10B981'}15`,
          }}
        >
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: colors.success || '#10B981',
            }}
          />
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: '800',
              color: colors.success || '#10B981',
              textTransform: 'uppercase',
            }}
          >
            Live
          </Text>
        </View>

        <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.textMuted }}>
          {room.distanceKm !== null && room.distanceKm !== undefined
            ? `📍 ${room.distanceKm} km · `
            : ''}
          {room.participantCount}/{room.maxParticipants}
        </Text>
      </View>

      <View style={{ marginVertical: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}
        >
          {room.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 10.5, fontWeight: '500', color: colors.textMuted, marginTop: 1 }}
        >
          {room.topic || `Hosted by ${room.host?.nickname ?? 'someone'}`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(room.participants ?? []).slice(0, 3).map((participant, index) => (
            <View
              key={participant.userId || index}
              style={{
                marginLeft: index === 0 ? 0 : -7,
                zIndex: 3 - index,
                borderRadius: 13,
                borderWidth: 1.5,
                borderColor: colors.surface,
              }}
            >
              <Avatar
                name={participant.nickname}
                gender={participant.gender}
                emoji={participant.avatarEmoji}
                color={participant.avatarColor}
                size={22}
              />
            </View>
          ))}
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3.5,
            borderRadius: 12,
            backgroundColor: `${colors.primary}18`,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.primary }}>
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
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/rooms?create=true')}
      accessibilityRole="button"
      accessibilityLabel="Start a room"
      style={({ pressed }) => ({
        width: 140,
        height: 125,
        marginRight: 12,
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: `${colors.primary}35`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: colors.primary,
          textAlign: 'center',
        }}
      >
        Start a Room
      </Text>
      <View
        style={{
          marginTop: 4,
          backgroundColor: `${colors.primary}15`,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.primary }}>
          Free to host
        </Text>
      </View>
    </Pressable>
  );
}

export function LiveRoomsRow({ rooms, isLoading }) {
  if (isLoading) return <RowSkeleton width={210} height={125} />;

  return (
    <FlatList
      data={rooms ?? []}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingRight: 4, paddingVertical: 4 }}
      ListFooterComponent={<CreateRoomCard />}
      renderItem={({ item }) => (
        <RoomCard room={item} onPress={() => router.push(`/room/${item.id}`)} />
      )}
    />
  );
}
