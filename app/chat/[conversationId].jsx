import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { Avatar, Loading } from '../../src/components/ui.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi } from '../../src/api/endpoints.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { formatMessageTime, formatRelativeTime } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useSounds } from '../../src/hooks/useSounds.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const EMOJI_ROW = ['😊', '😂', '❤️', '😍', '👍', '🙌', '🔥', '😅', '🥰', '😎', '🤔', '👋'];

function MessageBubble({ message, isMine, showTime }) {
  const { colors, radius } = useTheme();

  // A message that is only emoji is rendered big and bare, the way every
  // messaging app people already use does it.
  const isEmojiOnly = message.type === 'emoji';

  if (isEmojiOnly) {
    return (
      <View className={`mb-1.5 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
        <Text className="text-5xl">{message.text}</Text>
        {showTime ? (
          <Text className="mt-1 text-[10px]" style={{ color: colors.textMuted }}>
            {formatMessageTime(message.createdAt)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={`mb-1.5 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
      <View
        className="max-w-[80%] px-3.5 py-2.5"
        style={{
          backgroundColor: isMine ? colors.primary : colors.surface,
          borderRadius: radius,
          borderBottomRightRadius: isMine ? 4 : radius,
          borderBottomLeftRadius: isMine ? radius : 4,
          borderWidth: isMine ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          className="text-[15px] leading-5"
          style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}
        >
          {message.isDeleted ? 'This message was deleted' : message.text}
        </Text>
      </View>

      {showTime ? (
        <View className="mt-0.5 flex-row items-center gap-1 px-1">
          <Text className="text-[10px]" style={{ color: colors.textMuted }}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {isMine ? (
            <Text className="text-[10px]" style={{ color: message.readAt ? colors.info : colors.textMuted }}>
              {message.readAt ? 'Read' : 'Sent'}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TypingIndicator({ nickname }) {
  const { colors } = useTheme();

  return (
    <View className="px-4 pb-1">
      <Text className="text-xs italic" style={{ color: colors.textMuted }}>
        {nickname} is typing…
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { emit, on, presence, wallet, setUnreadCount } = useSocket();
  const { playSent } = useSounds();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => chatApi.conversation(conversationId),
  });

  const { data: history, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.messages(conversationId, { limit: 50 }),
  });

  // Server history is the base; socket messages are appended to it. Adjusting
  // during render rather than in an effect avoids painting the previous
  // conversation's messages for one frame when navigating between chats.
  const [syncedHistory, setSyncedHistory] = useState(null);

  if (history && history !== syncedHistory) {
    setSyncedHistory(history);
    setMessages(history.items);
  }

  const partner = conversation?.partner;
  const isOnline = partner ? (presence?.[partner.id]?.isOnline ?? partner.isOnline) : false;

  // ----- Realtime -----------------------------------------------------------

  useEffect(() => {
    if (!conversationId) return undefined;

    emit(SOCKET_EVENT.CONVERSATION_JOIN, { conversationId });

    const offMessage = on(SOCKET_EVENT.MESSAGE_NEW, (message) => {
      if (String(message.conversationId) !== String(conversationId)) return;

      setMessages((current) => {
        // The sender already has this message from the send response; without
        // this guard it would appear twice.
        if (current.some((existing) => existing.id === message.id)) return current;
        return [...current, message];
      });
    });

    const offTyping = on(SOCKET_EVENT.TYPING_UPDATE, (payload) => {
      if (String(payload.conversationId) !== String(conversationId)) return;
      if (String(payload.userId) === String(user?.id)) return;
      setPartnerTyping(payload.isTyping);
    });

    const offReceipt = on(SOCKET_EVENT.MESSAGE_READ_RECEIPT, (payload) => {
      if (String(payload.conversationId) !== String(conversationId)) return;

      setMessages((current) =>
        current.map((message) =>
          String(message.senderId) === String(user?.id) && !message.readAt
            ? { ...message, readAt: payload.readAt }
            : message,
        ),
      );
    });

    return () => {
      emit(SOCKET_EVENT.CONVERSATION_LEAVE, { conversationId });
      offMessage?.();
      offTyping?.();
      offReceipt?.();
    };
  }, [conversationId, emit, on, user?.id]);

  /**
   * Marks the thread read on open, and clears the badge locally so the tab
   * updates without waiting for the next fetch.
   */
  useEffect(() => {
    if (!conversationId) return;

    chatApi
      .markRead(conversationId)
      .then((result) => {
        setUnreadCount((count) => Math.max(0, count - result.readCount));
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .catch(() => undefined);
  }, [conversationId, setUnreadCount, queryClient]);

  /**
   * The free-time heartbeat.
   *
   * Sent only while this screen is open, which is what makes the introductory
   * allowance measure time actually spent chatting rather than wall-clock time
   * since signup. The server decides how much each tick is worth and ignores
   * ticks that arrive too fast, so this interval cannot be gamed.
   */
  useEffect(() => {
    if (!conversationId || wallet?.isUnlimited) return undefined;
    if (!wallet?.freeTalkSecondsRemaining) return undefined;

    const timer = setInterval(() => {
      emit(SOCKET_EVENT.CHAT_HEARTBEAT, { conversationId });
    }, 15_000);

    return () => clearInterval(timer);
  }, [conversationId, emit, wallet?.isUnlimited, wallet?.freeTalkSecondsRemaining]);

  // ----- Sending ------------------------------------------------------------

  const handleTyping = useCallback(
    (value) => {
      setDraft(value);

      emit(SOCKET_EVENT.TYPING_START, { conversationId });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emit(SOCKET_EVENT.TYPING_STOP, { conversationId });
      }, 1800);
    },
    [conversationId, emit],
  );

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setDraft('');
    emit(SOCKET_EVENT.TYPING_STOP, { conversationId });

    try {
      const result = await chatApi.send(conversationId, { text: trimmed });

      setMessages((current) =>
        current.some((existing) => existing.id === result.message.id)
          ? current
          : [...current, result.message],
      );

      playSent();

      // Tell the user the moment a block was bought, so the balance dropping
      // is explained rather than mysterious.
      if (result.billing?.outcome === 'block_purchased') {
        toast.coins(
          `${result.billing.coinsCharged} coins — ${result.billing.wallet.pricing.messagesPerBlock} more messages`,
        );
      }
    } catch (sendError) {
      if (sendError.code === 'INSUFFICIENT_COINS') {
        setDraft(trimmed); // Give the message back rather than losing it.
        toast.error('You are out of coins');
        router.push('/coins');
      } else {
        setDraft(trimmed);
        toast.error(sendError.message ?? 'Could not send that message');
      }
    } finally {
      setIsSending(false);
    }
  }

  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const next = messages[index + 1];
      // Only the last message in a run shows a timestamp, which keeps a long
      // back-and-forth readable.
      const showTime =
        !next ||
        next.senderId !== message.senderId ||
        new Date(next.createdAt) - new Date(message.createdAt) > 5 * 60_000;

      return { ...message, showTime };
    });
  }, [messages]);

  if (isLoadingConversation || isLoadingMessages) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Loading label="Opening chat…" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <View
        className="flex-row items-center gap-3 px-3 pb-3"
        style={{
          paddingTop: insets.top + 6,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
          <Text className="text-2xl" style={{ color: colors.textPrimary }}>
            ‹
          </Text>
        </Pressable>

        <Avatar
          uri={partner?.avatarUrl}
          name={partner?.nickname}
          gender={partner?.gender}
          emoji={partner?.avatarEmoji}
          color={partner?.avatarColor}
          size={40}
          isOnline={isOnline}
          showPresence
        />

        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            {partner?.nickname ?? 'Chat'}
          </Text>
          <Text className="text-[11px]" style={{ color: isOnline ? colors.onlineDot : colors.textMuted }}>
            {isOnline
              ? 'Online now'
              : partner?.lastSeenAt
                ? `Seen ${formatRelativeTime(partner.lastSeenAt)} ago`
                : 'Offline'}
          </Text>
        </View>

        <WalletHeader compact />
      </View>

      <FlatList
        ref={listRef}
        data={groupedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={String(item.senderId) === String(user?.id)}
            showTime={item.showTime}
          />
        )}
      />

      {partnerTyping ? <TypingIndicator nickname={partner?.nickname ?? 'They'} /> : null}

      {showEmoji ? (
        <View
          className="flex-row flex-wrap gap-1 px-3 py-2"
          style={{ backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.border }}
        >
          {EMOJI_ROW.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => send(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Send ${emoji}`}
              className="p-1.5"
            >
              <Text className="text-3xl">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        className="flex-row items-end gap-2 px-3 pt-2"
        style={{
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => setShowEmoji((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={showEmoji ? 'Hide emoji' : 'Show emoji'}
          className="pb-2.5"
        >
          <Text className="text-2xl">{showEmoji ? '⌨️' : '😊'}</Text>
        </Pressable>

        <TextInput
          value={draft}
          onChangeText={handleTyping}
          placeholder="Message…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          className="max-h-28 flex-1 px-4 py-2.5 text-[15px]"
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius,
            color: colors.textPrimary,
          }}
        />

        <Pressable
          onPress={() => send(draft)}
          disabled={!draft.trim() || isSending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: draft.trim() ? colors.primary : colors.surfaceAlt,
            opacity: isSending ? 0.6 : 1,
          }}
        >
          <Text style={{ color: draft.trim() ? colors.onPrimary : colors.textMuted, fontSize: 18 }}>
            ➤
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
