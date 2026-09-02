import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Badge, Button, Card, EmptyState, Field, GradientButton, Input, Loading } from '../../src/components/ui.jsx';
import { roomsApi } from '../../src/api/endpoints.js';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

function RoomCard({ room, onJoin, isJoining }) {
  const { colors } = useTheme();
  const isFull = room.participantCount >= room.maxParticipants;

  return (
    <Pressable
      onPress={onJoin}
      disabled={isJoining || (isFull && !room.isJoined)}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name}, ${room.participantCount} people inside`}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: room.isJoined ? `${colors.primary}66` : colors.border,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        opacity: isJoining ? 0.6 : pressed ? 0.88 : 1,
      })}
    >
      <View className="flex-row items-center gap-3.5">
        {/* Room Icon Avatar Box */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: room.isVoiceEnabled ? '#8B5CF618' : `${colors.primary}18`,
            borderWidth: 1,
            borderColor: room.isVoiceEnabled ? '#8B5CF633' : `${colors.primary}33`,
          }}
        >
          <Text style={{ fontSize: 22 }}>{room.isVoiceEnabled ? '🎙️' : '💬'}</Text>
        </View>

        {/* Room Details Column */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="flex-1 text-base font-bold" style={{ color: colors.textPrimary }}>
              {room.name}
            </Text>
            {room.isPrivate ? <Text className="text-xs">🔒</Text> : null}
          </View>

          {room.topic ? (
            <Text numberOfLines={1} className="mt-0.5 text-xs font-medium" style={{ color: colors.textSecondary }}>
              {room.topic}
            </Text>
          ) : null}

          {/* Bottom Badges Row */}
          <View className="mt-2 flex-row items-center gap-2 flex-wrap">
            <Badge
              label={`👥 ${room.participantCount || 0}/${room.maxParticipants || 20}`}
              tone={isFull ? 'warning' : 'brand'}
              size="sm"
            />
            {room.isJoined ? <Badge label="You are in" tone="success" size="sm" /> : null}
            {room.host?.nickname ? (
              <Text className="text-[11px] font-medium" style={{ color: colors.textMuted }}>
                👑 by {room.host.nickname}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Enter Chevron */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

function CreateRoomSheet({ onClose }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isVoice, setIsVoice] = useState(true);

  const create = useMutation({
    mutationFn: () =>
      roomsApi.create({
        name: name.trim(),
        topic: topic.trim(),
        isVoiceEnabled: isVoice,
      }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
      router.push(`/room/${room.id}`);
    },
    onError: (error) => {
      if (error.code === 'ROOM_ALREADY_HOSTED') {
        toast.info('You already have a live room. Joining your room…');
        roomsApi.list({ limit: 50 }).then((res) => {
          const myRoom = res?.items?.find((r) => r.isHost);
          if (myRoom?.id) {
            onClose();
            router.push(`/room/${myRoom.id}`);
          } else {
            toast.error(error.message);
          }
        }).catch(() => toast.error(error.message));
      } else {
        toast.error(error.message ?? 'Could not create the room');
      }
    },
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      {/* Gradient-like header strip */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>🎙️</Text>
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                Start a Live Room
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                Free to host · Open to all
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Body */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>

        {/* Room Name Input */}
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Room Name *
          </Text>
          <View
            style={{
              backgroundColor: colors.surfaceAlt || '#F9F0F5',
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: name.trim().length >= 2 ? colors.primary : colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>✏️</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chill & Music Hangout"
              maxLength={60}
              autoFocus
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.textPrimary,
                padding: 0,
                margin: 0,
              }}
            />
          </View>
        </View>

        {/* Topic Input */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Topic / Description
          </Text>
          <View
            style={{
              backgroundColor: colors.surfaceAlt || '#F9F0F5',
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: topic.trim() ? `${colors.primary}66` : colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Input
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Casual voice chat, jokes, gaming"
              maxLength={140}
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.textPrimary,
                padding: 0,
                margin: 0,
              }}
            />
          </View>
        </View>

        {/* Room Mode Toggle */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Room Mode
          </Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surfaceAlt || '#F3F4F6',
              borderRadius: 16,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setIsVoice(true)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: isVoice ? colors.primary : 'transparent',
                shadowColor: isVoice ? colors.primary : 'transparent',
                shadowOpacity: isVoice ? 0.3 : 0,
                shadowRadius: 6,
                elevation: isVoice ? 3 : 0,
              }}
            >
              <Ionicons name="mic" size={15} color={isVoice ? '#FFF' : colors.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: isVoice ? '#FFF' : colors.textPrimary,
                }}
              >
                Voice & Chat
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsVoice(false)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: !isVoice ? colors.primary : 'transparent',
                shadowColor: !isVoice ? colors.primary : 'transparent',
                shadowOpacity: !isVoice ? 0.3 : 0,
                shadowRadius: 6,
                elevation: !isVoice ? 3 : 0,
              }}
            >
              <Ionicons name="chatbubbles" size={15} color={!isVoice ? '#FFF' : colors.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: !isVoice ? '#FFF' : colors.textPrimary,
                }}
              >
                Text Only
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              height: 50,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceAlt || '#F3F4F6',
              borderWidth: 1.5,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={() => create.mutate()}
            disabled={name.trim().length < 2 || create.isPending}
            style={({ pressed }) => ({
              flex: 2,
              height: 50,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: name.trim().length < 2 ? `${colors.primary}55` : colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: name.trim().length < 2 ? 0 : 5,
              opacity: pressed || create.isPending ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {create.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 16 }}>🚀</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                    Create Room
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function Rooms() {
  const { colors, radius } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { create } = useLocalSearchParams();
  const [isCreating, setIsCreating] = useState(create === 'true');
  const [joiningId, setJoiningId] = useState(null);
  const [useNearby, setUseNearby] = useState(false);

  useEffect(() => {
    if (create === 'true') {
      setIsCreating(true);
    }
  }, [create]);

  function handleCloseCreate() {
    setIsCreating(false);
    try {
      router.setParams({ create: undefined });
    } catch {}
  }

  const { coords, request: requestLocation, isRequesting, error: locationError } = useDeviceLocation();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['rooms', useNearby && coords ? coords : 'all'],
    queryFn: () =>
      roomsApi.list({
        limit: 30,
        ...(useNearby && coords ? { ...coords, radiusKm: 50 } : {}),
      }),
    refetchInterval: 20_000,
  });

  async function toggleNearby() {
    if (useNearby) {
      setUseNearby(false);
      return;
    }

    // Permission is asked for here, at the moment it is needed, so the prompt
    // arrives with a visible reason rather than out of nowhere.
    const next = coords ?? (await requestLocation());

    if (!next) {
      if (locationError) toast.info(locationError);
      return;
    }

    setUseNearby(true);
  }

  async function joinRoom(room) {
    setJoiningId(room.id);

    try {
      // Already inside means this is a re-entry, not a new join.
      if (!room.isJoined) await roomsApi.join(room.id, {});
      router.push(`/room/${room.id}`);
    } catch (joinError) {
      if (joinError.code === 'PASSCODE_REQUIRED' || joinError.code === 'PASSCODE_INVALID') {
        toast.info('That room needs a passcode from its host.');
      } else {
        toast.error(joinError.message ?? 'Could not join that room');
      }
    } finally {
      setJoiningId(null);
    }
  }

  const rooms = data?.items ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <View>
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Rooms
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            Group chat and voice — always free
          </Text>
        </View>

        <Button
          title={isCreating ? 'Close' : 'Start one'}
          size="sm"
          variant={isCreating ? 'ghost' : 'primary'}
          onPress={() => setIsCreating((open) => !open)}
        />
      </View>

      {isCreating ? <CreateRoomSheet onClose={handleCloseCreate} /> : null}

      <View className="flex-row gap-2 px-4 pb-3">
        <Pressable
          onPress={() => setUseNearby(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: !useNearby }}
          className="px-3.5 py-2"
          style={{
            backgroundColor: !useNearby ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: !useNearby ? colors.primary : colors.border,
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: !useNearby ? colors.onPrimary : colors.textSecondary }}
          >
            All rooms
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleNearby}
          disabled={isRequesting}
          accessibilityRole="button"
          accessibilityState={{ selected: useNearby }}
          className="px-3.5 py-2"
          style={{
            backgroundColor: useNearby ? colors.primary : colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: useNearby ? colors.primary : colors.border,
            opacity: isRequesting ? 0.6 : 1,
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: useNearby ? colors.onPrimary : colors.textSecondary }}
          >
            {isRequesting ? '📍 Locating…' : '📍 Near me'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Loading label="Finding live rooms…" />
      ) : error ? (
        <EmptyState emoji="🎙️" title="Rooms are unavailable" description={error.message} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <RoomCard room={item} isJoining={joiningId === item.id} onJoin={() => joinRoom(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              emoji="🎙️"
              title="No rooms are live"
              description="Start one and invite people in — rooms are free for everyone, boys and girls alike."
              action={<Button title="Start a room" onPress={() => setIsCreating(true)} />}
            />
          }
        />
      )}
    </View>
  );
}
