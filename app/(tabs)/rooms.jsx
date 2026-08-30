import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge, Button, Card, EmptyState, Field, GradientButton, Input, Loading } from '../../src/components/ui.jsx';
import { roomsApi } from '../../src/api/endpoints.js';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation.js';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

function RoomCard({ room, onJoin, isJoining }) {
  const { colors, radius } = useTheme();
  const isFull = room.participantCount >= room.maxParticipants;

  return (
    <Pressable
      onPress={onJoin}
      disabled={isJoining || (isFull && !room.isJoined)}
      accessibilityRole="button"
      accessibilityLabel={`Join ${room.name}, ${room.participantCount} people inside`}
      className="mb-3 p-4"
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: room.isJoined ? colors.primary : colors.border,
        opacity: isJoining ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${colors.secondary}18` }}
        >
          <Text className="text-2xl">{room.isVoiceEnabled ? '🎙️' : '💬'}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="flex-1 text-base font-semibold" style={{ color: colors.textPrimary }}>
              {room.name}
            </Text>
            {room.isPrivate ? <Text className="text-xs">🔒</Text> : null}
          </View>

          {room.topic ? (
            <Text numberOfLines={1} className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
              {room.topic}
            </Text>
          ) : null}

          <View className="mt-2 flex-row items-center gap-2">
            <Badge
              label={`👥 ${room.participantCount}/${room.maxParticipants}`}
              tone={isFull ? 'warning' : 'neutral'}
            />
            {room.isJoined ? <Badge label="You are in" tone="brand" /> : null}
            {room.host?.nickname ? (
              <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                by {room.host.nickname}
              </Text>
            ) : null}
          </View>
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

  const create = useMutation({
    mutationFn: () => roomsApi.create({ name: name.trim(), topic: topic.trim() }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
      router.push(`/room/${room.id}`);
    },
    onError: (error) => toast.error(error.message ?? 'Could not create the room'),
  });

  return (
    <Card className="mx-4 mb-4">
      <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
        Start a room
      </Text>

      <Field label="Room name">
        <Input value={name} onChangeText={setName} placeholder="e.g. Evening chill" maxLength={60} />
      </Field>

      <Field label="What is it about?" hint="Optional, but it helps people decide to join.">
        <Input value={topic} onChangeText={setTopic} placeholder="Music, chat, anything" maxLength={140} />
      </Field>

      <View className="flex-row gap-2">
        <Button title="Cancel" variant="ghost" className="flex-1" onPress={onClose} />
        <GradientButton
          title="Create"
          className="flex-1"
          isLoading={create.isPending}
          disabled={name.trim().length < 2}
          onPress={() => create.mutate()}
        />
      </View>
    </Card>
  );
}

export default function Rooms() {
  const { colors, radius } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  // Opening the sheet straight from a link, so "create a room" on the home
  // screen lands here ready to type rather than on a list to hunt through.
  const { create } = useLocalSearchParams();
  const [isCreating, setIsCreating] = useState(create === 'true');
  const [joiningId, setJoiningId] = useState(null);
  const [useNearby, setUseNearby] = useState(false);

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

      {isCreating ? <CreateRoomSheet onClose={() => setIsCreating(false)} /> : null}

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
