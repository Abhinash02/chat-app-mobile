import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../src/components/ScreenHeader.jsx';
import { EmptyState } from '../src/components/ui.jsx';
import { notificationsApi } from '../src/api/endpoints.js';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useToast } from '../src/components/Toast.jsx';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { notificationUnreadCount, setNotificationUnreadCount } = useSocket();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: () => notificationsApi.list({ limit: 40 }),
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: (res, id) => {
      if (typeof res?.unreadCount === 'number') {
        setNotificationUnreadCount(res.unreadCount);
      } else {
        setNotificationUnreadCount((c) => Math.max(0, c - 1));
      }
      queryClient.setQueryData(['in-app-notifications'], (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((it) => (it.id === id ? { ...it, isRead: true } : it)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-home'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      setNotificationUnreadCount(0);
      toast.success('All notifications marked as read');
      queryClient.setQueryData(['in-app-notifications'], (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((it) => ({ ...it, isRead: true })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-home'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationsApi.delete(id),
    onSuccess: (res, id) => {
      if (typeof res?.unreadCount === 'number') {
        setNotificationUnreadCount(res.unreadCount);
      }
      queryClient.setQueryData(['in-app-notifications'], (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((it) => it.id !== id),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications-home'] });
      toast.info('Notification removed');
    },
  });

  const notifications = data?.items || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationPress = useCallback(
    (item) => {
      if (!item.isRead) {
        markReadMutation.mutate(item.id);
      }

      if (item.actionUrl) {
        if (item.actionUrl.startsWith('http://') || item.actionUrl.startsWith('https://')) {
          // External link or stays
        } else {
          router.push(item.actionUrl);
        }
      }
    },
    [markReadMutation],
  );

  const renderHeaderRight = () => {
    if (unreadCount === 0) return null;
    return (
      <Pressable
        hitSlop={12}
        onPress={() => markAllReadMutation.mutate()}
        style={styles.markAllBtn}
      >
        <Ionicons name="checkmark-done" size={16} color={colors.primary} />
        <Text style={[styles.markAllText, { color: colors.primary }]}>
          Mark all read
        </Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.itemCard,
          {
            backgroundColor: item.isRead
              ? isDark
                ? '#191526'
                : '#ffffff'
              : isDark
                ? '#241b3a'
                : '#fbf5ff',
            borderColor: item.isRead
              ? colors.border
              : `${colors.primary}50`,
          },
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View
              style={[
                styles.itemIcon,
                {
                  backgroundColor: item.isRead
                    ? `${colors.primary}15`
                    : `${colors.primary}30`,
                },
              ]}
            >
              <Text style={styles.itemEmoji}>
                {item.imageUrl ? '🖼️' : '📢'}
              </Text>
            </View>

            <View style={styles.itemMeta}>
              <View style={styles.badgeLine}>
                <Text style={[styles.announcementTag, { color: colors.primary }]}>
                  ANNOUNCEMENT
                </Text>
                {!item.isRead && (
                  <View
                    style={[styles.unreadBadge, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.unreadBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </View>

          <Pressable
            hitSlop={12}
            onPress={() => deleteMutation.mutate(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {item.imageUrl ? (
          <View style={styles.itemImageWrapper}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        <Text
          style={[
            styles.itemTitle,
            {
              color: colors.textPrimary,
              fontWeight: item.isRead ? '600' : '800',
            },
          ]}
        >
          {item.title}
        </Text>

        <Text
          style={[
            styles.itemBody,
            { color: colors.textSecondary },
          ]}
        >
          {item.body}
        </Text>

        {item.actionUrl ? (
          <View style={styles.actionRow}>
            <View
              style={[
                styles.actionChip,
                { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` },
              ]}
            >
              <Text style={[styles.actionChipText, { color: colors.primary }]}>
                Open link <Ionicons name="arrow-forward" size={12} color={colors.primary} />
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Notifications"
        subtitle={
          notificationUnreadCount > 0
            ? `${notificationUnreadCount} unread announcement${notificationUnreadCount > 1 ? 's' : ''}`
            : 'All caught up'
        }
        right={renderHeaderRight()}
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="🔔"
              title="No notifications yet"
              description="When the admin posts announcements or festival offers, you will receive them here with instant alerts."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemMeta: {
    flex: 1,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  announcementTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemTime: {
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  itemImageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    maxHeight: 180,
  },
  itemImage: {
    width: '100%',
    height: 160,
  },
  itemTitle: {
    fontSize: 15.5,
    marginBottom: 4,
    lineHeight: 20,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
