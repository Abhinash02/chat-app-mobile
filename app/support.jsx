import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar, Badge, Button, Card, Loading } from '../src/components/ui.jsx';
import { supportApi } from '../src/api/endpoints.js';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';
import { Ionicons } from '@expo/vector-icons';

const ISSUE_CATEGORIES = [
  { id: 'billing', label: '💳 Coins & Payment Issue', description: 'Failed payment, missing coins, or billing questions', emoji: '💳' },
  { id: 'account', label: '👤 Account & Profile', description: 'Login issues, profile picture, or account security', emoji: '👤' },
  { id: 'technical', label: '⚡ Technical / Voice Call', description: 'Audio bugs, connection issues, or voice room problems', emoji: '⚡' },
  { id: 'bug', label: '🐛 App Crash / Bug', description: 'UI glitches, frozen screen, or unexpected crashes', emoji: '🐛' },
  { id: 'other', label: '❓ General Question', description: 'General help, feedback, or general inquiries', emoji: '❓' },
];

const PRESET_QUESTIONS = [
  {
    category: 'billing',
    subject: 'Coins not credited after payment',
    message: 'Hi support, I completed a payment for coins but my balance has not updated yet. Please help check my transaction.',
  },
  {
    category: 'account',
    subject: 'Issue with profile / verification',
    message: 'Hello, I need assistance regarding my profile details and verification status.',
  },
  {
    category: 'technical',
    subject: 'Chat audio / room call issue',
    message: 'Hi, I am experiencing an issue with audio during live room calls or sending voice notes.',
  },
];

export default function CustomerSupportScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [issueType, setIssueType] = useState('billing');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  // Attachment Image State
  const [attachedImageUrl, setAttachedImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const flatListRef = useRef(null);

  // Fetch list of user's support tickets
  const { data: myTickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: supportApi.myTickets,
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  });

  // Auto-select latest ticket once on initial screen load
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!hasAutoSelected.current && !activeTicketId && myTickets.length > 0) {
      hasAutoSelected.current = true;
      setActiveTicketId(myTickets[0]._id);
    }
  }, [myTickets, activeTicketId]);

  // Fetch current ticket messages
  const { data: ticketDetails, isLoading: isLoadingDetails, refetch: refetchTicketDetails } = useQuery({
    queryKey: ['support-ticket-details', activeTicketId],
    queryFn: () => supportApi.ticketDetails(activeTicketId),
    enabled: Boolean(activeTicketId),
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  });

  const activeTicket = ticketDetails?.ticket;
  const messages = ticketDetails?.messages ?? [];

  // Listen to real-time socket events for support messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
      if (activeTicketId && (data.dbTicketId === activeTicketId || data.ticketId === activeTicket?.ticketId)) {
        queryClient.invalidateQueries({ queryKey: ['support-ticket-details', activeTicketId] });
      }
    };

    socket.on('support:message:new', handleNewMessage);
    socket.on('support:ticket:updated', () => {
      refetchTickets();
      if (activeTicketId) refetchTicketDetails();
    });

    return () => {
      socket.off('support:message:new', handleNewMessage);
    };
  }, [socket, activeTicketId, activeTicket, queryClient, refetchTickets, refetchTicketDetails]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Pick and Compress Image before upload
  const handlePickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error('Permission to access photo gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Device compression: saves data & keeps crisp quality
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setIsUploadingImage(true);

        const formData = new FormData();
        const fileName = asset.fileName || asset.uri.split('/').pop() || 'attachment.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        if (Platform.OS === 'web') {
          // On Web, fetch the blob URL and append real Blob object
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          formData.append('file', blob, fileName);
        } else {
          formData.append('file', {
            uri: asset.uri,
            name: fileName,
            type: fileType,
          });
        }

        const uploadRes = await supportApi.uploadImage(formData);
        setAttachedImageUrl(uploadRes.url);
        toast.success('Screenshot attached successfully!');
      }
    } catch (err) {
      toast.error(err.message ?? 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Create new ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (data) => supportApi.createTicket(data),
    onSuccess: (res) => {
      toast.success('Support ticket created successfully!');
      refetchTickets();
      setActiveTicketId(res.ticket._id);
      setSubject('');
      setInitialMessage('');
      setAttachedImageUrl(null);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to open support ticket'),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data) => supportApi.sendMessage(activeTicketId, data),
    onSuccess: () => {
      setReplyMessage('');
      setAttachedImageUrl(null);
      refetchTicketDetails();
      refetchTickets();
    },
    onError: (err) => toast.error(err.message ?? 'Could not send message'),
  });

  const handleApplyPreset = (preset) => {
    setIssueType(preset.category);
    setSubject(preset.subject);
    setInitialMessage(preset.message);
  };

  const handleCreateSubmit = () => {
    const cleanSubject = subject.trim();
    const cleanMessage = initialMessage.trim();

    if (!cleanSubject) {
      toast.error('Please enter a subject for your ticket.');
      return;
    }
    if (cleanSubject.length < 3) {
      toast.error('Subject must be at least 3 characters.');
      return;
    }
    if (!cleanMessage && !attachedImageUrl) {
      toast.error('Please describe your issue or attach a screenshot.');
      return;
    }

    createTicketMutation.mutate({
      issueType,
      subject: cleanSubject,
      message: cleanMessage,
      attachments: attachedImageUrl ? [{ url: attachedImageUrl, type: 'image' }] : [],
    });
  };

  const handleCancelForm = () => {
    setSubject('');
    setInitialMessage('');
    setAttachedImageUrl(null);
    if (myTickets.length > 0) {
      setActiveTicketId(myTickets[0]._id);
    } else {
      router.back();
    }
  };

  const handleSendReply = () => {
    if ((!replyMessage.trim() && !attachedImageUrl) || !activeTicketId) return;
    sendMessageMutation.mutate({
      message: replyMessage.trim() || 'Attached image',
      attachments: attachedImageUrl ? [{ url: attachedImageUrl, type: 'image' }] : [],
    });
  };

  const handleBackNav = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const selectedCategoryObj = ISSUE_CATEGORIES.find((c) => c.id === issueType) || ISSUE_CATEGORIES[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Navigation Header (Dynamic Admin Theme Colors) */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        className="flex-row items-center justify-between shadow-sm"
      >
        <Pressable
          onPress={handleBackNav}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.surfaceAlt }}
        >
          <Text style={{ color: colors.textPrimary }} className="text-lg font-bold">
            ←
          </Text>
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
            🎧 Customer Support
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.success || '#22C55E' }} />
            <Text className="text-xs font-medium" style={{ color: colors.textMuted }}>
              24/7 Live Desk • Fast Resolution
            </Text>
          </View>
        </View>

        {myTickets.length > 0 && activeTicketId ? (
          <Pressable
            onPress={() => setActiveTicketId(null)}
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.primary + '18' }}
          >
            <Text className="text-xs font-bold" style={{ color: colors.primary }}>
              + New
            </Text>
          </Pressable>
        ) : (
          <View className="w-9" />
        )}
      </View>

      {/* Ticket Selection Switcher */}
      {myTickets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-12 border-b py-2 px-3"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Pressable
            onPress={() => setActiveTicketId(null)}
            className="mr-2 rounded-full px-3.5 py-1 text-xs font-medium border"
            style={{
              backgroundColor: activeTicketId === null ? colors.primary : colors.surfaceAlt,
              borderColor: activeTicketId === null ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: activeTicketId === null ? colors.onPrimary || '#FFF' : colors.textPrimary,
              }}
              className="text-xs font-bold"
            >
              + Create Ticket
            </Text>
          </Pressable>

          {myTickets.map((t) => {
            const isSelected = activeTicketId === t._id;
            return (
              <Pressable
                key={t._id}
                onPress={() => setActiveTicketId(t._id)}
                className="mr-2 flex-row items-center gap-1.5 rounded-full px-3 py-1 border"
                style={{
                  backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceAlt,
                  borderColor: isSelected ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isSelected ? colors.primary : colors.textPrimary }}
                >
                  {t.ticketId}
                </Text>
                <Badge
                  variant={
                    t.status === 'pending'
                      ? 'neutral'
                      : t.status === 'open'
                      ? 'warning'
                      : t.status === 'in_progress'
                      ? 'brand'
                      : 'success'
                  }
                  size="sm"
                >
                  {t.status}
                </Badge>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* MAIN CONTENT AREA */}
      {!activeTicketId ? (
        /* CREATE TICKET FORM */
        <ScrollView className="flex-1 p-4">
          <Card className="p-4 mb-4 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-lg font-bold mb-1" style={{ color: colors.textPrimary }}>
              Submit a Support Ticket
            </Text>
            <Text className="text-xs mb-4 leading-relaxed" style={{ color: colors.textMuted }}>
              Select an issue category, describe your problem, and attach a screenshot if available.
            </Text>

            {/* ISSUE CATEGORY DROPDOWN SELECTOR */}
            <Text className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              Issue Category
            </Text>

            <Pressable
              onPress={() => setIsCategoryPickerOpen(true)}
              className="rounded-xl p-3.5 border mb-4 flex-row items-center justify-between"
              style={{
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <Text className="text-xl">{selectedCategoryObj.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                    {selectedCategoryObj.label}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }} numberOfLines={1}>
                    {selectedCategoryObj.description}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                ▼
              </Text>
            </Pressable>

            {/* Subject Input */}
            <Text className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              Subject / Brief Title
            </Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g., Payment completed but coins missing"
              placeholderTextColor={colors.textMuted}
              className="rounded-xl p-3.5 text-xs mb-4 border font-medium"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
              }}
            />

            {/* Description Input */}
            <Text className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              Describe Your Problem
            </Text>
            <TextInput
              value={initialMessage}
              onChangeText={setInitialMessage}
              placeholder="Provide details like order ID, error message, or issue summary..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
              className="rounded-xl p-3.5 text-xs mb-4 border font-medium leading-relaxed"
            />

            {/* IMAGE ATTACHMENT PREVIEW & BUTTON */}
            <Text className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              Attach Screenshot (Optional)
            </Text>
            {attachedImageUrl ? (
              <View className="relative mb-4 w-32 h-32 rounded-xl overflow-hidden border" style={{ borderColor: colors.border }}>
                <Image source={{ uri: attachedImageUrl }} className="w-full h-full" contentFit="cover" />
                <Pressable
                  onPress={() => setAttachedImageUrl(null)}
                  className="absolute top-1 right-1 bg-black/70 w-6 h-6 rounded-full items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickAndUploadImage}
                disabled={isUploadingImage}
                className="mb-5 p-3.5 rounded-xl border border-dashed flex-row items-center justify-center gap-2"
                style={{ backgroundColor: colors.background, borderColor: colors.primary }}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text className="text-base">📷</Text>
                    <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                      Upload Compressed Image / Screenshot
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {/* ACTION BUTTONS: CANCEL & SUBMIT */}
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={handleCancelForm}
                className="flex-1 py-3.5 px-4 rounded-xl items-center justify-center border"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCreateSubmit}
                disabled={
                  createTicketMutation.isPending ||
                  isUploadingImage ||
                  !subject.trim() ||
                  (!initialMessage.trim() && !attachedImageUrl)
                }
                className="flex-1 py-3.5 px-4 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
                style={{
                  backgroundColor: colors.primary,
                  opacity:
                    createTicketMutation.isPending ||
                    isUploadingImage ||
                    !subject.trim() ||
                    (!initialMessage.trim() && !attachedImageUrl)
                      ? 0.5
                      : 1,
                }}
              >
                {createTicketMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
                ) : (
                  <>
                    <Text className="text-sm">🚀</Text>
                    <Text className="text-xs font-bold" style={{ color: colors.onPrimary || '#FFFFFF' }}>
                      Submit Ticket
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Card>

          {/* Quick Presets Section */}
          <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1" style={{ color: colors.textMuted }}>
            ⚡ Common Quick Help Shortcuts
          </Text>
          {PRESET_QUESTIONS.map((preset, idx) => (
            <Pressable
              key={idx}
              onPress={() => handleApplyPreset(preset)}
              className="p-3.5 mb-2.5 rounded-2xl border flex-row items-center justify-between"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  {preset.subject}
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {preset.message}
                </Text>
              </View>
              <Text style={{ color: colors.primary }} className="text-xs font-bold">
                Auto Fill →
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        /* LIVE TICKET CHAT STREAM */
        <View className="flex-1">
          {/* Active Ticket Header Banner */}
          {activeTicket && (
            <View
              className="px-4 py-3 border-b flex-row items-center justify-between"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <View className="flex-1 pr-2">
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  {activeTicket.subject}
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                  Ticket ID: {activeTicket.ticketId} • Category: {activeTicket.issueType}
                </Text>
              </View>
              <Badge
                variant={
                  activeTicket.status === 'pending'
                    ? 'neutral'
                    : activeTicket.status === 'open'
                    ? 'warning'
                    : activeTicket.status === 'in_progress'
                    ? 'brand'
                    : 'success'
                }
              >
                {activeTicket.status.toUpperCase()}
              </Badge>
            </View>
          )}

          {/* Messages Stream */}
          {isLoadingDetails ? (
            <View className="flex-1 items-center justify-center p-8">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                Connecting to support chat...
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isUser = item.senderType === 'user';
                return (
                  <View className={`mb-3 flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <View
                      className={`max-w-[82%] rounded-2xl p-3.5 ${
                        isUser ? 'rounded-br-none' : 'rounded-bl-none'
                      }`}
                      style={{
                        backgroundColor: isUser ? colors.primary : colors.surface,
                        borderWidth: isUser ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-1 gap-2 opacity-80">
                        <Text
                          className="text-[10px] font-bold"
                          style={{ color: isUser ? colors.onPrimary || '#FFF' : colors.primary }}
                        >
                          {isUser ? 'You' : '🛡️ Support Admin'}
                        </Text>
                        <Text
                          className="text-[10px]"
                          style={{ color: isUser ? colors.onPrimary + 'BB' || '#FFFFFFBB' : colors.textMuted }}
                        >
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Text
                        className="text-xs leading-relaxed"
                        style={{ color: isUser ? colors.onPrimary || '#FFF' : colors.textPrimary }}
                      >
                        {item.message}
                      </Text>

                      {/* Render Image Attachments */}
                      {item.attachments && item.attachments.length > 0 && (
                        <View className="mt-2.5 gap-2">
                          {item.attachments.map((att, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: att.url }}
                              className="w-52 h-52 rounded-xl"
                              contentFit="cover"
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Attached Image Preview Bar before reply */}
          {attachedImageUrl && (
            <View className="px-4 py-2 flex-row items-center justify-between border-t" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="flex-row items-center gap-2">
                <Image source={{ uri: attachedImageUrl }} className="w-10 h-10 rounded-lg" contentFit="cover" />
                <Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                  Image attached
                </Text>
              </View>
              <Pressable onPress={() => setAttachedImageUrl(null)} className="p-1">
                <Text className="text-xs font-bold" style={{ color: colors.danger || '#F5325B' }}>
                  Remove ✕
                </Text>
              </Pressable>
            </View>
          )}

          {/* Reply Message Input */}
          <View
            className="px-3 py-2.5 border-t flex-row items-center gap-2"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            {/* Attachment Button */}
            <Pressable
              onPress={handlePickAndUploadImage}
              disabled={isUploadingImage}
              className="h-10 w-10 rounded-full items-center justify-center border shadow-sm active:scale-95 transition"
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
              )}
            </Pressable>

            {/* Input Pill */}
            <View
              className="flex-1 flex-row items-center px-3.5 py-1 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                minHeight: 40,
              }}
            >
              <TextInput
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Type message to support admin..."
                placeholderTextColor={colors.textMuted}
                multiline
                className="flex-1 py-1 text-xs"
                style={{
                  color: colors.textPrimary,
                  maxHeight: 90,
                }}
              />
            </View>

            {/* Send Button */}
            <Pressable
              onPress={handleSendReply}
              disabled={(!replyMessage.trim() && !attachedImageUrl) || sendMessageMutation.isPending}
              className="h-10 w-10 rounded-full items-center justify-center shadow-sm active:scale-95 transition"
              style={{
                backgroundColor: (replyMessage.trim() || attachedImageUrl) ? colors.primary : colors.surfaceAlt,
                boxShadow: (replyMessage.trim() || attachedImageUrl) ? `0 4px 12px ${colors.primary}50` : 'none',
              }}
            >
              <Ionicons
                name="send"
                size={16}
                color={(replyMessage.trim() || attachedImageUrl) ? (colors.onPrimary || '#FFFFFF') : colors.textMuted}
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* CATEGORY PICKER DROPDOWN MODAL */}
      <Modal
        visible={isCategoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryPickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/50 px-4"
          onPress={() => setIsCategoryPickerOpen(false)}
        >
          <View
            className="rounded-3xl p-5 shadow-2xl space-y-3"
            style={{ backgroundColor: colors.surface }}
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b pb-3 mb-2" style={{ borderColor: colors.border }}>
              <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                Select Issue Category
              </Text>
              <Pressable onPress={() => setIsCategoryPickerOpen(false)} className="p-1">
                <Text style={{ color: colors.textMuted }} className="text-base font-bold">
                  ✕
                </Text>
              </Pressable>
            </View>

            {ISSUE_CATEGORIES.map((cat) => {
              const isSelected = issueType === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setIssueType(cat.id);
                    setIsCategoryPickerOpen(false);
                  }}
                  className="p-3.5 rounded-2xl border flex-row items-center justify-between mb-2"
                  style={{
                    backgroundColor: isSelected ? colors.primary + '15' : colors.surfaceAlt,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <Text className="text-2xl">{cat.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-xs font-bold" style={{ color: isSelected ? colors.primary : colors.textPrimary }}>
                        {cat.label}
                      </Text>
                      <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                        {cat.description}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
