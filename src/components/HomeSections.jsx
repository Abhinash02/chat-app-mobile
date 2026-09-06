import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from './ui.jsx';
import { Skeleton } from './Loader.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

const ROOM_CARD_WIDTH = 244;
const ROOM_CARD_HEIGHT = 148;

/**
 * A titled row with an optional action on the right.
 */
export function SectionHeader({ title, badge, action, onAction }) {
  const { colors, fonts } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {/* A short accent bar anchors the title — the cue that separates one
          section from the next once the page is dense with cards. */}
      <View
        style={{
          width: 3,
          height: 16,
          borderRadius: 2,
          backgroundColor: colors.primary,
        }}
      />

      <Text
        style={{
          fontSize: 17,
          fontWeight: '800',
          letterSpacing: -0.3,
          color: colors.textPrimary,
          fontFamily: fonts?.display,
        }}
      >
        {title}
      </Text>

      {badge ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderRadius: 999,
            backgroundColor: `${colors.success || '#10B981'}18`,
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
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 0.5,
              color: colors.success || '#10B981',
            }}
          >
            {badge}
          </Text>
        </View>
      ) : null}

      {action ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** A live room card in the horizontal discovery row. */
function RoomCard({ room, onPress }) {
  const { colors } = useTheme();

  if (!room) return null;

  const participantsList = Array.isArray(room.participants) ? room.participants : [];
  const participantCount = room.participantCount ?? participantsList.length;
  const maxParticipants = room.maxParticipants || 20;
  const isVoice = Boolean(room.isVoiceEnabled);
  const accent = isVoice ? (colors.secondary || '#7C4DFF') : colors.primary;
  // Text sitting on the accent fill follows the theme's on-primary ink, so a
  // pale brand colour set in the admin panel does not leave white on white.
  const onAccent = colors.onPrimary || '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name || 'room'}, ${participantCount} inside`}
      style={({ pressed }) => ({
        width: ROOM_CARD_WIDTH,
        height: ROOM_CARD_HEIGHT,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        shadowColor: '#0F0817',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
        elevation: 3,
        transform: [{ scale: pressed ? 0.975 : 1 }],
      })}
    >
      {/* Tinted header carries the room's mode, so voice and text rooms are
          told apart before any text is read. */}
      <LinearGradient
        colors={[`${accent}26`, `${accent}0A`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: accent,
            }}
          >
            <Ionicons name={isVoice ? 'mic' : 'chatbubbles'} size={9} color={onAccent} />
            <Text style={{ fontSize: 8.5, fontWeight: '900', color: onAccent, letterSpacing: 0.4 }}>
              {isVoice ? 'VOICE' : 'CHAT'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: colors.success || '#10B981',
              }}
            />
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }}>
              {participantCount}/{maxParticipants}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={1}
          style={{
            marginTop: 8,
            fontSize: 14.5,
            fontWeight: '800',
            letterSpacing: -0.2,
            color: colors.textPrimary,
          }}
        >
          {room.name || 'Untitled Room'}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 1 }}>
          {room.topic || (room.host?.nickname ? `Hosted by ${room.host.nickname}` : 'Open to everyone')}
        </Text>
      </LinearGradient>

      {/* Footer: who is inside, and the way in. */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {participantsList.length > 0 ? (
            <>
              {participantsList.slice(0, 3).map((participant, index) => (
                <View
                  key={String(participant?.userId || participant?.id || index)}
                  style={{
                    marginLeft: index === 0 ? 0 : -9,
                    zIndex: 3 - index,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <Avatar
                    uri={participant?.avatarUrl}
                    name={participant?.nickname || 'User'}
                    gender={participant?.gender}
                    emoji={participant?.avatarEmoji}
                    color={participant?.avatarColor}
                    size={26}
                  />
                </View>
              ))}
              {participantCount > 3 ? (
                <Text style={{ marginLeft: 6, fontSize: 10.5, fontWeight: '700', color: colors.textMuted }}>
                  +{participantCount - 3}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
              Be the first in
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: accent,
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: onAccent }}>Join</Text>
          <Ionicons name="arrow-forward" size={11} color={onAccent} />
        </View>
      </View>
    </Pressable>
  );
}

/** Compact tile for a game. */
function GameCard({ game, onPress }) {
  const { colors } = useTheme();

  if (!game) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.name || 'game'}`}
      style={({ pressed }) => ({
        width: 118,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#0F0817',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 9,
        elevation: 2,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${colors.primary}14`,
        }}
      >
        <Text style={{ fontSize: 26 }}>{game.emoji || '🎮'}</Text>
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: 8, fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
      >
        {game.name || 'Game'}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 1 }}>
        {game.personalBest > 0 ? `Best ${game.personalBest}` : 'Not played'}
      </Text>
    </Pressable>
  );
}

function RowSkeleton({ width, height }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 16 }}
    >
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} width={width} height={height} radius={20} />
      ))}
    </ScrollView>
  );
}

export function GamesRow({ games, isLoading }) {
  if (isLoading) return <RowSkeleton width={118} height={116} />;

  const safeGames = Array.isArray(games) ? games : [];
  if (safeGames.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 16, paddingVertical: 4 }}
    >
      {safeGames.map((game, index) => (
        <GameCard
          key={String(game?.key || game?.id || `game-${index}`)}
          game={game}
          onPress={() => router.push('/(tabs)/games')}
        />
      ))}
    </ScrollView>
  );
}

/**
 * The tile that starts a room. Always last in the row, so an empty room list
 * is still an invitation rather than a dead end.
 */
function CreateRoomCard() {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/rooms?create=true')}
      accessibilityRole="button"
      accessibilityLabel="Start a room"
      style={({ pressed }) => ({
        width: 152,
        height: ROOM_CARD_HEIGHT,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: `${colors.primary}55`,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: 9, fontSize: 13, fontWeight: '800', color: colors.textPrimary }}
      >
        Start a Room
      </Text>
      <Text style={{ marginTop: 2, fontSize: 10.5, fontWeight: '600', color: colors.textMuted }}>
        Free to host
      </Text>
    </Pressable>
  );
}

export function LiveRoomsRow({ rooms, isLoading }) {
  if (isLoading) return <RowSkeleton width={ROOM_CARD_WIDTH} height={ROOM_CARD_HEIGHT} />;

  const safeRooms = Array.isArray(rooms) ? rooms : [];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 16, paddingVertical: 4 }}
    >
      {safeRooms.map((room, index) => (
        <RoomCard
          key={String(room?.id ?? `room-${index}`)}
          room={room}
          onPress={() => {
            if (room?.id) router.push(`/room/${room.id}`);
          }}
        />
      ))}
      <CreateRoomCard />
    </ScrollView>
  );
}
