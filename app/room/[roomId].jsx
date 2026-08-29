import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, Badge, Loading } from '../../src/components/ui.jsx';
import { roomsApi } from '../../src/api/endpoints.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { formatMessageTime } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

function RoomMessage({ message, isMine }) {
  const { colors, radius } = useTheme();

  return (
    <View className={`mb-2 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
      {!isMine ? (
        <Text className="mb-0.5 px-1 text-[11px] font-medium" style={{ color: colors.textMuted }}>
          {message.sender?.nickname ?? 'Someone'}
        </Text>
      ) : null}

      <View
        className="max-w-[82%] px-3.5 py-2.5"
        style={{
          backgroundColor: isMine ? colors.primary : colors.surface,
          borderRadius: radius,
          borderWidth: isMine ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          className={message.type === 'emoji' ? 'text-3xl' : 'text-[15px] leading-5'}
          style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}
        >
          {message.text}
        </Text>
      </View>

      <Text className="mt-0.5 px-1 text-[10px]" style={{ color: colors.textMuted }}>
        {formatMessageTime(message.createdAt)}
      </Text>
    </View>
  );
}

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams();
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [draft, setDraft] = useState('');
  const [isMuted, setIsMuted] = useState(true);

  const listRef = useRef(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.get(roomId),
  });

  const { data: history } = useQuery({
    queryKey: ['room-messages', roomId],
    queryFn: () => roomsApi.messages(roomId, { limit: 50 }),
  });

  // Both lists start from the server and are then kept live by socket events,
  // so they are adjusted during render rather than synced in an effect.
  const [syncedHistory, setSyncedHistory] = useState(null);
  const [syncedRoom, setSyncedRoom] = useState(null);

  if (history && history !== syncedHistory) {
    setSyncedHistory(history);
    setMessages(history.items);
  }

  if (room && room !== syncedRoom) {
    setSyncedRoom(room);
    setParticipants(room.participants ?? []);
  }

  useEffect(() => {
    if (!roomId) return undefined;

    emit(SOCKET_EVENT.ROOM_JOIN, { roomId });

    const offMessage = on(SOCKET_EVENT.ROOM_MESSAGE_NEW, (message) => {
      if (String(message.roomId) !== String(roomId)) return;
      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message],
      );
    });

    const offParticipants = on(SOCKET_EVENT.ROOM_PARTICIPANTS, (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      setParticipants(payload.participants);
    });

    const offClosed = on(SOCKET_EVENT.ROOM_CLOSED, (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      toast.info('The host ended this room.');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      router.back();
    });

    return () => {
      emit(SOCKET_EVENT.ROOM_LEAVE, { roomId });
      offMessage?.();
      offParticipants?.();
      offClosed?.();
    };
  }, [roomId, emit, on, toast, queryClient]);

  async function send() {
    const text = draft.trim();
    if (!text) return;

    setDraft('');

    try {
      // Rooms are free, so there is no billing round trip here at all.
      await roomsApi.send(roomId, { text });
    } catch (sendError) {
      setDraft(text);
      toast.error(sendError.message ?? 'Could not send that');
    }
  }

  async function leave() {
    try {
      await roomsApi.leave(roomId);
    } catch {
      // Leaving locally is what matters; the server also drops a participant
      // whose socket disconnects.
    }
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    router.back();
  }

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label="Joining the room…" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <View
        className="px-4 pb-3"
        style={{
          paddingTop: insets.top + 6,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Leave the room" className="px-1">
            <Text className="text-2xl" style={{ color: colors.textPrimary }}>
              ‹
            </Text>
          </Pressable>

          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-semibold" style={{ color: colors.textPrimary }}>
              {room?.name}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              {participants.length} of {room?.maxParticipants} inside
              {room?.isHost ? ' · you are the host' : ''}
            </Text>
          </View>

          {room?.isVoiceEnabled ? (
            <Pressable
              onPress={() => {
                setIsMuted((muted) => !muted);
                emit(SOCKET_EVENT.ROOM_VOICE_STATE, { roomId, isMuted: !isMuted });
                // Voice needs a development build with a WebRTC module; the
                // server already relays the signalling for it.
                toast.info('Voice needs the full app build — chat works now.');
              }}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: isMuted ? colors.surfaceAlt : `${colors.success}22` }}
            >
              <Text className="text-lg">{isMuted ? '🔇' : '🎙️'}</Text>
            </Pressable>
          ) : null}
        </View>

        {participants.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={participants}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ gap: 10, paddingTop: 12 }}
            renderItem={({ item }) => (
              <View className="items-center" style={{ width: 52 }}>
                <Avatar
                  uri={item.avatarUrl}
                  name={item.nickname}
                  gender={item.gender}
                  emoji={item.avatarEmoji}
                  color={item.avatarColor}
                  size={42}
                />
                <Text numberOfLines={1} className="mt-1 text-[10px]" style={{ color: colors.textMuted }}>
                  {item.nickname ?? 'Guest'}
                </Text>
                {item.role === 'host' ? <Badge label="Host" tone="brand" /> : null}
              </View>
            )}
          />
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <RoomMessage message={item} isMine={String(item.sender?.id) === String(user?.id)} />
        )}
      />

      <View
        className="flex-row items-end gap-2 px-3 pt-2"
        style={{
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Say something…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          className="max-h-24 flex-1 px-4 py-2.5 text-[15px]"
          style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius, color: colors.textPrimary }}
        />

        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: draft.trim() ? colors.primary : colors.surfaceAlt }}
        >
          <Text style={{ color: draft.trim() ? colors.onPrimary : colors.textMuted, fontSize: 18 }}>
            ➤
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
