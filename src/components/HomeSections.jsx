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

/** A live room, with who is in it. Fixed dimensions for 100% APK & Web compatibility. */
function RoomCard({ room, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name}`}
      style={({ pressed }) => ({
        width: 220,
        height: 132,
        marginRight: 12,
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: 12,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
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
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 2.5,
            borderRadius: 10,
            backgroundColor: `${colors.success || '#10B981'}18`,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.success || '#10B981',
            }}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: colors.success || '#10B981',
              textTransform: 'uppercase',
              letterSpacing: 0.2,
            }}
          >
            {room.isVoiceEnabled ? '🎙️ Voice' : '💬 Live'}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={{ fontSize: 10.5, fontWeight: '700', color: colors.textMuted }}
        >
          {room.distanceKm !== null && room.distanceKm !== undefined
            ? `📍 ${room.distanceKm} km · `
            : ''}
          👥 {room.participantCount || 0}/{room.maxParticipants || 20}
        </Text>
      </View>

      <View style={{ marginVertical: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13.5, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.1 }}
        >
          {room.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 2 }}
        >
          {room.topic || (room.host?.nickname ? `Hosted by ${room.host.nickname}` : 'Open to everyone')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(room.participants ?? []).slice(0, 3).map((participant, index) => (
            <View
              key={participant.userId || index}
              style={{
                marginLeft: index === 0 ? 0 : -8,
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
                size={24}
              />
            </View>
          ))}
          {(!room.participants || room.participants.length === 0) && (
            <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
              Be first to join
            </Text>
          )}
        </View>

        <View
          style={{
            paddingHorizontal: 11,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: `${colors.primary}18`,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
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
        width: 145,
        height: 132,
        marginRight: 12,
        backgroundColor: colors.surface,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: `${colors.primary}40`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 2,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
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
          fontSize: 12.5,
          fontWeight: '800',
          color: colors.primary,
          textAlign: 'center',
          letterSpacing: 0.1,
        }}
      >
        Start a Room
      </Text>
      <View
        style={{
          marginTop: 5,
          backgroundColor: `${colors.primary}18`,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 2.5,
        }}
      >
        <Text style={{ fontSize: 9.5, fontWeight: '800', color: colors.primary }}>
          Free to host
        </Text>
      </View>
    </Pressable>
  );
}

export function LiveRoomsRow({ rooms, isLoading }) {
  if (isLoading) return <RowSkeleton width={220} height={132} />;

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
