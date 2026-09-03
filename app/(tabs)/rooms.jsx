import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Badge, Button, Card, EmptyState, Field, GradientButton, Loading } from '../../src/components/ui.jsx';
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
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: room.isJoined ? `${colors.primary}66` : colors.border,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        opacity: isJoining ? 0.6 : pressed ? 0.88 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 22 }}>{room.isVoiceEnabled ? '🎙️' : '💬'}</Text>
        </View>

        {/* Room Details Column */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: '800', color: colors.textPrimary }}>
              {room.name}
            </Text>
            {room.isPrivate ? <Text style={{ fontSize: 12 }}>🔒</Text> : null}
          </View>

          {room.topic ? (
            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11.5, fontWeight: '500', color: colors.textSecondary }}>
              {room.topic}
            </Text>
          ) : null}

          {/* Bottom Badges Row */}
          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Badge
              label={`👥 ${room.participantCount || 0}/${room.maxParticipants || 20}`}
              tone={isFull ? 'warning' : 'brand'}
              size="sm"
            />
            {room.isVoiceEnabled ? (
              <Badge label="Voice" tone="neutral" size="sm" />
            ) : (
              <Badge label="Text" tone="neutral" size="sm" />
            )}
            {room.isJoined ? <Badge label="You are in" tone="success" size="sm" /> : null}
            {room.distanceKm !== null && room.distanceKm !== undefined ? (
              <Badge label={`📍 ${room.distanceKm} km`} tone="neutral" size="sm" />
            ) : null}
            {room.host?.nickname ? (
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '500', color: colors.textMuted }}>
                👑 {room.host.nickname}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Enter / Join Pill */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: `${colors.primary}18`,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
            {room.isJoined ? 'Open' : 'Join'}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const QUICK_ROOM_NAMES = [
  '🎵 Music Hangout',
  '🎮 Gaming & Chill',
  '☕ Casual Vibe',
  '🗣️ Late Night Talk',
  '💡 Tech & Ideas',
];

function CreateRoomSheet({ onClose }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isVoice, setIsVoice] = useState(true);
  const [focusedField, setFocusedField] = useState('name');

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
        roomsApi
          .list({ limit: 50 })
          .then((res) => {
            const myRoom = res?.items?.find((r) => r.isHost);
            if (myRoom?.id) {
              onClose();
              router.push(`/room/${myRoom.id}`);
            } else {
              toast.error(error.message);
            }
          })
          .catch(() => toast.error(error.message));
      } else {
        toast.error(error.message ?? 'Could not create the room');
      }
    },
  });

  const isNameValid = name.trim().length >= 2;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: `${colors.primary}30`,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      {/* Header Banner */}
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
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>🎙️</Text>
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 }}>
                Start a Live Room
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 1 }}>
                Free to host · Public voice & chat
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Body Container */}
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 }}>
        {/* Info Pill */}
        <View
          style={{
            backgroundColor: `${colors.primary}10`,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: `${colors.primary}25`,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
            Rooms are discoverable by everyone in the app. Nearby users can join and talk freely!
          </Text>
        </View>

        {/* Room Name Input */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: focusedField === 'name' ? colors.primary : colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Room Name *
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {name.length}/60
            </Text>
          </View>

          <View
            style={{
              backgroundColor: focusedField === 'name' ? `${colors.primary}08` : (colors.surfaceAlt || '#F8F9FA'),
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: focusedField === 'name' ? colors.primary : isNameValid ? `${colors.primary}66` : colors.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              shadowColor: focusedField === 'name' ? colors.primary : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: focusedField === 'name' ? 2 : 0,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: focusedField === 'name' ? `${colors.primary}20` : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>🎙️</Text>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField('')}
              placeholder="e.g. Chill & Music Hangout"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
              autoFocus
              returnKeyType="next"
              style={{
                flex: 1,
                fontSize: 14.5,
                fontWeight: '600',
                color: colors.textPrimary,
                paddingVertical: Platform.OS === 'ios' ? 6 : 4,
                paddingHorizontal: 0,
              }}
            />

            {name.length > 0 && (
              <Pressable
                onPress={() => setName('')}
                hitSlop={8}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Quick Name Suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {QUICK_ROOM_NAMES.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => setName(sug)}
                style={({ pressed }) => ({
                  backgroundColor: name === sug ? `${colors.primary}22` : (colors.surfaceAlt || '#F3F4F6'),
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: name === sug ? colors.primary : colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: name === sug ? '700' : '500',
                    color: name === sug ? colors.primary : colors.textSecondary,
                  }}
                >
                  {sug}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Topic Input */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: focusedField === 'topic' ? colors.primary : colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Topic / Description
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {topic.length}/140
            </Text>
          </View>

          <View
            style={{
              backgroundColor: focusedField === 'topic' ? `${colors.primary}08` : (colors.surfaceAlt || '#F8F9FA'),
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: focusedField === 'topic' ? colors.primary : topic.trim() ? `${colors.primary}66` : colors.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              shadowColor: focusedField === 'topic' ? colors.primary : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: focusedField === 'topic' ? 2 : 0,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: focusedField === 'topic' ? `${colors.primary}20` : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>💬</Text>
            </View>

            <TextInput
              value={topic}
              onChangeText={setTopic}
              onFocus={() => setFocusedField('topic')}
              onBlur={() => setFocusedField('')}
              placeholder="e.g. Casual voice chat, jokes, fun"
              placeholderTextColor={colors.textMuted}
              maxLength={140}
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.textPrimary,
                paddingVertical: Platform.OS === 'ios' ? 6 : 4,
                paddingHorizontal: 0,
              }}
            />

            {topic.length > 0 && (
              <Pressable
                onPress={() => setTopic('')}
                hitSlop={8}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Room Mode Toggle */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 11.5,
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
              height: 48,
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
            disabled={!isNameValid || create.isPending}
            style={({ pressed }) => ({
              flex: 2,
              height: 48,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: !isNameValid ? `${colors.primary}55` : colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: !isNameValid ? 0 : 5,
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

      {isCreating ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: (insets.bottom || 16) + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CreateRoomSheet onClose={handleCloseCreate} />
        </ScrollView>
      ) : (
        <>
          {/* Room Info & Host Hero Box (100% APK & Web compatible) */}
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: `${colors.primary}30`,
              padding: 14,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${colors.primary}18`,
                    borderWidth: 1,
                    borderColor: `${colors.primary}33`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🎙️</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    Live Voice & Audio Rooms
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                    Talk 1-on-1 or group chat · Free to host & join
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsCreating(true)}
                style={({ pressed }) => ({
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: '#FFF', fontSize: 12.5, fontWeight: '700' }}>
                  + Host Room
                </Text>
              </Pressable>
            </View>

            {/* Feature tags */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.primary }}>⚡ Low-Latency Audio</Text>
              </View>
              <View style={{ backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.primary }}>👥 Up to 20 People</Text>
              </View>
              <View style={{ backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.primary }}>📍 Nearby Discovery</Text>
              </View>
            </View>
          </View>

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
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (insets.bottom || 16) + 85, flexGrow: 1 }}
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
        </>
      )}
    </View>
  );
}
