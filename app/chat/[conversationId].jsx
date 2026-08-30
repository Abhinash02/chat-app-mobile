import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { goBack } from '../../src/components/ScreenHeader.jsx';
import { useActionSheet } from '../../src/components/ActionSheet.jsx';
import { MessageTicks } from '../../src/components/chat/MessageTicks.jsx';
import { ReactionChips, ReactionPicker } from '../../src/components/chat/ReactionBar.jsx';
import { ImageBubble } from '../../src/components/MediaBubble.jsx';
import { Avatar } from '../../src/components/ui.jsx';
import { Skeleton } from '../../src/components/Loader.jsx';
import { WalletHeader } from '../../src/components/WalletHeader.jsx';
import { chatApi } from '../../src/api/endpoints.js';
import { appendFile, captureWithCamera, pickFromLibrary } from '../../src/lib/media.js';
import { SOCKET_EVENT } from '../../src/constants/events.js';
import { formatMessageTime, formatRelativeTime } from '../../src/lib/format.js';
import { useAuth } from '../../src/hooks/useAuth.jsx';
import { useSocket } from '../../src/hooks/useSocket.jsx';
import { useIsForeground } from '../../src/hooks/useIsForeground.js';
import { useSounds } from '../../src/hooks/useSounds.jsx';
import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useToast } from '../../src/components/Toast.jsx';

const EMOJI_ROW = ['😊', '😂', '❤️', '😍', '👍', '🙌', '🔥', '😅', '🥰', '😎', '🤔', '👋'];

function MessageBubble({ message, isMine, showTime, onLongPress }) {
  const { colors, radius } = useTheme();

  // A message that is only emoji is rendered big and bare, the way every
  // messaging app people already use does it.
  const isEmojiOnly = message.type === 'emoji';
  const isPhoto = message.type === 'image' && message.media?.url && !message.isDeleted;

  if (isEmojiOnly && !message.isDeleted) {
    return (
      <View className={`mb-1.5 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
        <Pressable onLongPress={() => onLongPress(message)} delayLongPress={280}>
          <Text className="text-5xl">{message.text}</Text>
        </Pressable>

        <ReactionChips
          reactions={message.reactions}
          isMine={isMine}
          onPress={() => onLongPress(message)}
        />

        {showTime ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-[10px]" style={{ color: colors.textMuted }}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isMine ? <MessageTicks state={message.deliveryState} /> : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className={`mb-1.5 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
      <Pressable
        // A withdrawn message has nothing left to react to or delete twice.
        onLongPress={message.isDeleted ? undefined : () => onLongPress(message)}
        delayLongPress={280}
        accessibilityRole={message.isDeleted ? 'text' : 'button'}
        accessibilityHint={message.isDeleted ? undefined : 'Long press for reactions and delete'}
        className={`max-w-[80%] ${isPhoto ? 'p-1' : 'px-3.5 py-2.5'}`}
        style={{
          backgroundColor: isMine ? colors.primary : colors.surface,
          borderRadius: radius,
          borderBottomRightRadius: isMine ? 4 : radius,
          borderBottomLeftRadius: isMine ? radius : 4,
          borderWidth: isMine ? 0 : 1,
          borderColor: colors.border,
          opacity: message.isDeleted ? 0.7 : 1,
        }}
      >
        {message.type === 'image' && message.media?.url && !message.isDeleted ? (
          <ImageBubble url={message.media.url} caption={message.text} isMine={isMine} />
        ) : (
          <Text
            className={`text-[15px] leading-5 ${message.isDeleted ? 'italic' : ''}`}
            style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}
          >
            {message.isDeleted ? 'This message was deleted' : message.text}
          </Text>
        )}
      </Pressable>

      <ReactionChips
        reactions={message.reactions}
        isMine={isMine}
        onPress={() => onLongPress(message)}
      />

      {showTime ? (
        <View className="mt-0.5 flex-row items-center gap-1 px-1">
          <Text className="text-[10px]" style={{ color: colors.textMuted }}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {isMine && !message.isDeleted ? <MessageTicks state={message.deliveryState} /> : null}
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
  const { emit, on, presence, wallet, setWallet, setUnreadCount, setFreeTalkRunning } = useSocket();
  const actionSheet = useActionSheet();
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

  /*
   * The chat list already holds everything the header needs — partner name,
   * avatar, presence — so it seeds this query as placeholder data. The header
   * then paints on the first frame instead of after a round trip, which on a
   * cluster in another country is the difference between instant and a
   * half-second of blank screen.
   *
   * It is `placeholderData` rather than `initialData` on purpose: the cached
   * copy is a preview, so the query still refetches and replaces it.
   */
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => chatApi.conversation(conversationId),
    placeholderData: () => {
      const cached = queryClient.getQueryData(['conversations']);
      return cached?.items?.find((item) => item.id === conversationId);
    },
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
            ? { ...message, readAt: payload.readAt, deliveryState: 'read' }
            : message,
        ),
      );
    });

    /*
     * A withdrawal replaces the message in place rather than removing it. The
     * other person watched something arrive; leaving a note where it was is
     * honest, and a bubble that silently vanishes reads as a glitch.
     */
    const offDeleted = on(SOCKET_EVENT.MESSAGE_DELETED, (deleted) => {
      if (String(deleted.conversationId) !== String(conversationId)) return;

      setMessages((current) =>
        current.map((message) => (message.id === deleted.id ? { ...message, ...deleted } : message)),
      );
    });

    const offReaction = on(SOCKET_EVENT.MESSAGE_REACTION, (updated) => {
      if (String(updated.conversationId) !== String(conversationId)) return;

      setMessages((current) =>
        current.map((message) =>
          message.id === updated.id ? { ...message, reactions: updated.reactions } : message,
        ),
      );
    });

    return () => {
      emit(SOCKET_EVENT.CONVERSATION_LEAVE, { conversationId });
      offMessage?.();
      offTyping?.();
      offDeleted?.();
      offReaction?.();
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
   * Sent only while this screen is open AND the app is in front, which is what
   * makes the introductory allowance measure time actually spent chatting
   * rather than wall-clock time since signup. Backgrounding the app stops the
   * heartbeat, so the allowance is not spent while the phone is in a pocket —
   * and because the server stores a balance rather than a deadline, reopening
   * resumes from whatever is left instead of restarting at thirty minutes.
   *
   * The server decides how much each tick is worth and ignores ticks that
   * arrive too fast, so this interval cannot be gamed.
   */
  const isForeground = useIsForeground();

  const isSpendingFreeTalk = Boolean(
    conversationId && !wallet?.isUnlimited && wallet?.freeTalkSecondsRemaining && isForeground,
  );

  /*
   * The header's countdown follows the heartbeat exactly, so the number on
   * screen is moving if and only if the server is billing for it.
   */
  useEffect(() => {
    setFreeTalkRunning(isSpendingFreeTalk);
    return () => setFreeTalkRunning(false);
  }, [isSpendingFreeTalk, setFreeTalkRunning]);

  useEffect(() => {
    if (!isSpendingFreeTalk) return undefined;

    const timer = setInterval(() => {
      emit(SOCKET_EVENT.CHAT_HEARTBEAT, { conversationId });
    }, 15_000);

    return () => clearInterval(timer);
  }, [conversationId, emit, isSpendingFreeTalk]);

  // ----- Photos -------------------------------------------------------------

  const [isUploading, setIsUploading] = useState(false);

  function choosePhoto() {
    actionSheet.show({
      title: 'Send a photo',
      options: [
        { label: '📷  Camera', onPress: () => pickPhoto(captureWithCamera) },
        { label: '🖼️  Gallery', onPress: () => pickPhoto(pickFromLibrary) },
      ],
    });
  }

  async function pickPhoto(source) {
    // Photos only here. Video in a one-to-one chat is a bigger question than
    // an attach button — it needs its own limits and its own storage budget.
    const result = await source({ allowVideo: false });

    if (result.error) return toast.error(result.error);
    if (result.cancelled || !result.asset) return undefined;

    return sendPhoto(result.asset);
  }

  async function sendPhoto(asset) {
    setIsUploading(true);

    // Whatever is typed rides along as the caption, so a photo and the line
    // about it arrive as one message rather than two.
    const caption = draft.trim();

    try {
      const formData = new FormData();
      await appendFile(formData, { uri: asset.uri, mimeType: asset.mimeType });
      if (caption) formData.append('caption', caption);

      const result = await chatApi.sendMedia(conversationId, formData);

      setDraft('');
      setMessages((current) =>
        current.some((existing) => existing.id === result.message.id)
          ? current
          : [...current, result.message],
      );

      // A photo is billed like any other message, so the wallet moves with it.
      if (result.billing?.wallet) setWallet(result.billing.wallet);
    } catch (error) {
      toast.error(error.message ?? 'Could not send that photo');
    } finally {
      setIsUploading(false);
    }
  }

  // ----- Message actions ----------------------------------------------------

  /** The message a long press opened the reaction row for, if any. */
  const [actioned, setActioned] = useState(null);

  function openMessageActions(message) {
    setActioned(message);
  }

  async function react(message, emoji) {
    setActioned(null);

    /*
     * Applied locally first. A reaction is a tap on something already on
     * screen, and waiting a round trip to see it makes the button feel
     * unresponsive — the socket event that follows carries the authoritative
     * tally and overwrites this.
     */
    const mine = message.reactions?.find((entry) => entry.mine);
    const isUndo = mine?.emoji === emoji;

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, reactions: isUndo ? [] : [{ emoji, count: 1, mine: true }] }
          : item,
      ),
    );

    try {
      await chatApi.react(message.id, emoji);
    } catch (error) {
      // Put the old reaction back rather than leaving a lie on screen.
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, reactions: message.reactions ?? [] } : item,
        ),
      );
      toast.error(error.message ?? 'Could not react to that');
    }
  }

  function confirmDelete(message) {
    setActioned(null);

    const isMine = String(message.senderId) === String(user?.id);

    const options = [
      {
        label: 'Delete for me',
        destructive: true,
        onPress: () => removeMessage(message, 'me'),
      },
    ];

    /*
     * Withdrawing from both sides is offered only on your own messages,
     * because it is a claim over the other person's copy. The server enforces
     * this too — the menu just does not dangle an option that would be
     * refused.
     */
    if (isMine) {
      options.push({
        label: 'Delete for everyone',
        destructive: true,
        onPress: () => removeMessage(message, 'everyone'),
      });
    }

    actionSheet.show({ title: 'Delete message?', options });
  }

  async function removeMessage(message, scope) {
    try {
      await chatApi.deleteMessage(message.id, scope);

      if (scope === 'me') {
        // Gone from this device only; the other person keeps their copy, so
        // there is no tombstone to leave behind here.
        setMessages((current) => current.filter((item) => item.id !== message.id));
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, isDeleted: true, text: '', reactions: [] } : item,
        ),
      );
    } catch (error) {
      toast.error(error.message ?? 'Could not delete that');
    }
  }

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
        <Pressable onPress={() => goBack()} accessibilityRole="button" accessibilityLabel="Back" className="px-1">
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

      {isLoadingMessages && groupedMessages.length === 0 ? (
        /*
         * Bubbles rather than a spinner: the shape of the thing arriving reads
         * as faster than a spinner does, even when the wait is identical — and
         * only this area waits now, not the whole screen.
         */
        <View className="flex-1 justify-end px-4 pb-3">
          {[
            { mine: false, width: '62%' },
            { mine: true, width: '48%' },
            { mine: false, width: '70%' },
            { mine: true, width: '38%' },
          ].map((row, index) => (
            <View
              key={index}
              className="mb-2.5"
              style={{ alignItems: row.mine ? 'flex-end' : 'flex-start' }}
            >
              <Skeleton width={row.width} height={38} radius={18} />
            </View>
          ))}
        </View>
      ) : null}

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
            onLongPress={openMessageActions}
          />
        )}
      />

      {/*
        A long press opens the reactions inline rather than in the action
        sheet: reacting is the common case and should cost one more tap, while
        deleting is rarer and deserves the confirmation step.
      */}
      <Modal
        visible={Boolean(actioned)}
        transparent
        animationType="fade"
        onRequestClose={() => setActioned(null)}
      >
        <Pressable className="flex-1 justify-center bg-black/40 px-6" onPress={() => setActioned(null)}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <ReactionPicker
              current={actioned?.reactions?.find((entry) => entry.mine)?.emoji}
              onPick={(emoji) => react(actioned, emoji)}
            />

            <Pressable
              onPress={() => confirmDelete(actioned)}
              accessibilityRole="button"
              accessibilityLabel="Delete this message"
              className="mt-2 items-center py-3"
              style={{ backgroundColor: colors.surface, borderRadius: radius }}
            >
              <Text className="text-[15px] font-medium" style={{ color: colors.danger }}>
                Delete message
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
          onPress={choosePhoto}
          disabled={isUploading || isSending}
          accessibilityRole="button"
          accessibilityLabel="Send a photo"
          className="h-11 w-10 items-center justify-center"
        >
          <Text className="text-xl" style={{ opacity: isUploading ? 0.4 : 1 }}>
            📷
          </Text>
        </Pressable>

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
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ color: draft.trim() ? colors.onPrimary : colors.textMuted, fontSize: 18 }}>
              ➤
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
