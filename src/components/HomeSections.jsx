import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from './ui.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * A titled row with an optional action on the right.
 *
 * Sections render nothing when empty rather than showing a placeholder: on a
 * new install several of these would be empty at once, and a screen of "nothing
 * here yet" cards reads as a broken app.
 */
export function SectionHeader({ title, badge, action, onAction }) {
  const { colors, radius } = useTheme();

  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Text className="text-xl font-extrabold" style={{ color: colors.textPrimary }}>
        {title}
      </Text>

      {badge ? (
        <View
          className="px-2 py-0.5"
          style={{ backgroundColor: `${colors.success}22`, borderRadius: radius }}
        >
          <Text className="text-[11px] font-bold" style={{ color: colors.success }}>
            {badge}
          </Text>
        </View>
      ) : null}

      {action ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          className="ml-auto px-3 py-1.5"
          style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Card for someone you can call. */
function CallCard({ person, onPress }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Call ${person.nickname}`}
      className="mr-3 overflow-hidden"
      style={{
        width: 146,
        backgroundColor: colors.surface,
        borderRadius: radius + 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="items-center px-3 pb-3 pt-4" style={{ backgroundColor: colors.surfaceAlt }}>
        <Avatar
          uri={person.avatarUrl}
          name={person.nickname}
          gender={person.gender}
          emoji={person.avatarEmoji}
          color={person.avatarColor}
          size={68}
          isOnline={person.isOnline}
          showPresence
        />
        <Text
          numberOfLines={1}
          className="mt-2 text-sm font-bold"
          style={{ color: colors.textPrimary }}
        >
          {person.nickname}
        </Text>
      </View>

      <View
        className="flex-row items-center justify-center gap-1.5 py-3"
        style={{ backgroundColor: colors.primary }}
      >
        <Text style={{ fontSize: 13 }}>📞</Text>
        <Text className="text-sm font-bold" style={{ color: colors.onPrimary }}>
          Say hi
        </Text>
      </View>
    </Pressable>
  );
}

/** Compact card for someone to start chatting with. */
function ChatCard({ person, onPress }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${person.nickname}`}
      className="mr-3 items-center px-3 py-3"
      style={{
        width: 108,
        backgroundColor: colors.surface,
        borderRadius: radius + 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Avatar
        uri={person.avatarUrl}
        name={person.nickname}
        gender={person.gender}
        emoji={person.avatarEmoji}
        color={person.avatarColor}
        size={60}
        isOnline={person.isOnline}
        showPresence
      />
      <Text
        numberOfLines={1}
        className="mt-2 text-xs font-bold"
        style={{ color: colors.textPrimary }}
      >
        {person.nickname}
      </Text>
      {person.city ? (
        <Text numberOfLines={1} className="text-[11px]" style={{ color: colors.textMuted }}>
          {person.city}
        </Text>
      ) : null}
    </Pressable>
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
      className="mr-3 p-3.5"
      style={{
        width: 210,
        backgroundColor: colors.surface,
        borderRadius: radius + 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: room.status === 'live' ? colors.onlineDot : colors.offlineDot }}
        />
        <Text className="text-[11px] font-bold uppercase" style={{ color: colors.success }}>
          Live
        </Text>
        <Text className="ml-auto text-[11px]" style={{ color: colors.textMuted }}>
          {room.participantCount}/{room.maxParticipants}
        </Text>
      </View>

      <Text numberOfLines={1} className="text-sm font-bold" style={{ color: colors.textPrimary }}>
        {room.name}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
        {room.topic || `Hosted by ${room.host?.nickname ?? 'someone'}`}
      </Text>

      <View className="mt-3 flex-row items-center">
        {(room.participants ?? []).slice(0, 4).map((participant, index) => (
          <View key={participant.userId} style={{ marginLeft: index === 0 ? 0 : -10 }}>
            <Avatar
              name={participant.nickname}
              gender={participant.gender}
              emoji={participant.avatarEmoji}
              color={participant.avatarColor}
              size={26}
            />
          </View>
        ))}
        <Text className="ml-auto text-xs font-bold" style={{ color: colors.primary }}>
          Join →
        </Text>
      </View>
    </Pressable>
  );
}

/** Compact tile for a game, used in the discover row. */
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
 * matters here because these rows can hold every online user.
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

export function CallableRow({ people, isLoading, onCall }) {
  return (
    <CardRow
      data={people}
      isLoading={isLoading}
      skeleton={{ width: 146, height: 150 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CallCard person={item} onPress={() => onCall(item)} />}
    />
  );
}

export function OnlineChatRow({ people, isLoading, onChat }) {
  return (
    <CardRow
      data={people}
      isLoading={isLoading}
      skeleton={{ width: 108, height: 116 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChatCard person={item} onPress={() => onChat(item)} />}
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

export function LiveRoomsRow({ rooms, isLoading }) {
  return (
    <CardRow
      data={rooms}
      isLoading={isLoading}
      skeleton={{ width: 210, height: 118 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RoomCard room={item} onPress={() => router.push(`/room/${item.id}`)} />
      )}
    />
  );
}
