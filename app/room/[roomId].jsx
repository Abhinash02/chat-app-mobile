import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ImageBubble, VideoBubble } from '../../src/components/MediaBubble.jsx';
import { RoomComposer } from '../../src/components/RoomComposer.jsx';
import { VoiceNote } from '../../src/components/VoiceNote.jsx';
import { Avatar, Badge, Loading } from '../../src/components/ui.jsx';
import { roomsApi } from '../../src/api/endpoints.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { formatMessageTime } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';
import { useScreenCaptureProtection } from '../../src/hooks/useScreenCaptureProtection.js';

/**
 * What actually sits inside a bubble, chosen by message type.
 */
function MessageBody({ message, isMine }) {
  const { colors } = useTheme();

  if (message.type === 'voice' && message.media?.url) {
    return (
      <VoiceNote url={message.media.url} durationSeconds={message.media.durationSeconds} isMine={isMine} />
    );
  }

  if (message.type === 'image' && message.media?.url) {
    return <ImageBubble url={message.media.url} caption={message.text} isMine={isMine} />;
  }

  if (message.type === 'video' && message.media?.url) {
    return (
      <VideoBubble
        url={message.media.url}
        caption={message.text}
        durationSeconds={message.media.durationSeconds}
        isMine={isMine}
      />
    );
  }

  return (
    <Text
      className={message.type === 'emoji' ? 'text-3xl' : 'text-[15px] leading-5'}
      style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}
    >
      {message.text}
    </Text>
  );
}

function RoomMessage({ message, isMine }) {
  const { colors } = useTheme();

  return (
    <View className={`mb-3 px-3 flex-row ${isMine ? 'justify-end' : 'justify-start items-end gap-2'}`}>
      {!isMine ? (
        <Pressable
          onPress={() => {
            if (message.sender?.id) {
              router.push(`/user/${message.sender.id}`);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`View ${message.sender?.nickname ?? 'user'}'s profile`}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Avatar
            uri={message.sender?.avatarUrl}
            name={message.sender?.nickname}
            gender={message.sender?.gender}
            emoji={message.sender?.avatarEmoji}
            color={message.sender?.avatarColor}
            size={32}
          />
        </Pressable>
      ) : null}

      <View style={{ maxWidth: '78%' }}>
        {!isMine ? (
          <Text className="mb-1 ml-1 text-xs font-semibold" style={{ color: colors.primary }}>
            {message.sender?.nickname ?? 'Anonymous'}
          </Text>
        ) : null}

        <View
          style={{
            backgroundColor: isMine ? colors.primary : colors.surface,
            borderRadius: 18,
            borderBottomRightRadius: isMine ? 4 : 18,
            borderBottomLeftRadius: !isMine ? 4 : 18,
            borderWidth: isMine ? 0 : 1,
            borderColor: colors.border,
            paddingHorizontal: 13,
            paddingVertical: 9,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isMine ? 0.15 : 0.04,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <MessageBody message={message} isMine={isMine} />
        </View>

        <Text
          className="mt-1 px-1 text-[10px]"
          style={{
            color: colors.textMuted,
            textAlign: isMine ? 'right' : 'left',
          }}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Compact mini box displaying room details: Icon, Room Name, Host, and Total Members count.
 */
function RoomDetailsBox({ room, participants }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginTop: 6,
        marginBottom: 2,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${colors.primary}18`,
            }}
          >
            <Text style={{ fontSize: 15 }}>{room?.isVoiceEnabled ? '🎙️' : '💬'}</Text>
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[13px] font-bold" style={{ color: colors.textPrimary }}>
              {room?.name || 'Live Room'}
            </Text>
            {room?.host?.nickname ? (
              <Text numberOfLines={1} className="text-[11px] font-medium" style={{ color: colors.primary }}>
                👑 Host: {room.host.nickname}
              </Text>
            ) : null}
          </View>
        </View>

        <Badge
          label={`👥 ${participants.length} / ${room?.maxParticipants || 20}`}
          tone="brand"
          size="sm"
        />
      </View>
    </View>
  );
}

export default function RoomScreen() {
  useScreenCaptureProtection();
  const { roomId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const listRef = useRef(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.get(roomId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: initialMessages } = useQuery({
    queryKey: ['room-messages', roomId],
    queryFn: () => roomsApi.messages(roomId, { limit: 50 }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (initialMessages?.items) {
      setMessages(initialMessages.items);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (room?.participants) {
      setParticipants(room.participants);
    }
  }, [room]);

  useEffect(() => {
    if (!roomId) return undefined;

    // Join room via API and socket
    roomsApi.join(roomId, {}).catch(() => undefined);
    emit(SOCKET_EVENT.ROOM_JOIN, { roomId });

    const offMessage = on(SOCKET_EVENT.ROOM_MESSAGE_NEW, (message) => {
      if (String(message.roomId) !== String(roomId)) return;
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(message.id))) return prev;
        return [...prev, message];
      });
      queryClient.setQueryData(['room-messages', roomId], (old) => {
        if (!old?.items) return { items: [message] };
        if (old.items.some((m) => String(m.id) === String(message.id))) return old;
        return { ...old, items: [...old.items, message] };
      });
    });

    const offParticipants = on(SOCKET_EVENT.ROOM_PARTICIPANTS, (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      setParticipants(payload.participants ?? []);
    });

    const offClosed = on(SOCKET_EVENT.ROOM_CLOSED, (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      toast.info('The host ended this room.');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      router.replace('/(tabs)/rooms');
    });

    return () => {
      offMessage?.();
      offParticipants?.();
      offClosed?.();
      emit(SOCKET_EVENT.ROOM_LEAVE, { roomId });
    };
  }, [roomId, emit, on, toast, queryClient]);

  // Rooms are free, so neither path has a billing round trip.
  async function sendText(text) {
    const sent = await roomsApi.send(roomId, { text });
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(sent.id))) return prev;
        return [...prev, sent];
      });
      queryClient.setQueryData(['room-messages', roomId], (old) => {
        if (!old?.items) return { items: [sent] };
        if (old.items.some((m) => String(m.id) === String(sent.id))) return old;
        return { ...old, items: [...old.items, sent] };
      });
    }
  }

  async function sendMedia(formData) {
    const sent = await roomsApi.sendMedia(roomId, formData);
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(sent.id))) return prev;
        return [...prev, sent];
      });
      queryClient.setQueryData(['room-messages', roomId], (old) => {
        if (!old?.items) return { items: [sent] };
        if (old.items.some((m) => String(m.id) === String(sent.id))) return old;
        return { ...old, items: [...old.items, sent] };
      });
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
    queryClient.invalidateQueries({ queryKey: ['room-messages', roomId] });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/rooms');
    }
  }

  async function endRoom() {
    try {
      await roomsApi.close(roomId);
      toast.info('Room closed successfully.');
    } catch (err) {
      toast.error(err.message ?? 'Could not end the room');
    }
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['room-messages', roomId] });
    router.replace('/(tabs)/rooms');
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
      {/* Navigation Top Bar */}
      <View
        className="px-4 pb-2.5 flex-row items-center justify-between"
        style={{
          paddingTop: insets.top + 6,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel="Back to rooms"
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceAlt || `${colors.primary}12`,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-bold" style={{ color: colors.textPrimary }}>
              {room?.name || 'Live Room'}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.onlineDot }} />
              <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                {participants.length} inside {room?.isHost ? '· Host' : ''}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {room?.isHost ? (
            <Pressable
              onPress={endRoom}
              accessibilityRole="button"
              accessibilityLabel="End Room"
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: '#EF444418',
                borderWidth: 1,
                borderColor: '#EF444433',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>End</Text>
            </Pressable>
          ) : null}

          {room?.isVoiceEnabled ? (
            <Pressable
              onPress={() => {
                setIsMuted((muted) => !muted);
                emit(SOCKET_EVENT.ROOM_VOICE_STATE, { roomId, isMuted: !isMuted });
                toast.info('Voice needs the full app build — chat works now.');
              }}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: isMuted ? colors.surfaceAlt : `${colors.success}22` }}
            >
              <Text className="text-base">{isMuted ? '🔇' : '🎙️'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Compact Room Details Mini Box */}
      <RoomDetailsBox room={room} participants={participants} />

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

      <RoomComposer
        onSendText={sendText}
        onSendMedia={sendMedia}
        onNotice={(notice) => toast.error(notice)}
      />
    </KeyboardAvoidingView>
  );
}
