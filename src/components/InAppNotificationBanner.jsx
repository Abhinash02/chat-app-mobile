import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSocket } from '../hooks/useSocket.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

export function InAppNotificationBanner() {
  const { activeBannerNotification, dismissBannerNotification } = useSocket();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isNative = Platform.OS !== 'web';

    if (!activeBannerNotification) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
          duration: 250,
          useNativeDriver: isNative,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: isNative,
        }),
      ]).start();
      return undefined;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: isNative,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: isNative,
      }),
    ]).start();

    // Auto-dismiss after 6.5s
    const timer = setTimeout(() => {
      dismissBannerNotification();
    }, 6500);

    return () => clearTimeout(timer);
  }, [activeBannerNotification, dismissBannerNotification, opacity, translateY]);

  if (!activeBannerNotification) return null;

  const handlePress = () => {
    const actionUrl = activeBannerNotification.actionUrl;
    dismissBannerNotification();

    if (actionUrl) {
      if (actionUrl.startsWith('http://') || actionUrl.startsWith('https://')) {
        // External link
        router.push(`/notifications`);
      } else {
        router.push(actionUrl);
      }
    } else {
      router.push('/notifications');
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? '#1f1b2e' : '#ffffff',
            borderColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <View style={styles.content}>
          {activeBannerNotification.imageUrl ? (
            <Image
              source={{ uri: activeBannerNotification.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.iconBox,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <Text style={styles.iconText}>📢</Text>
            </View>
          )}

          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.appName,
                  { color: colors.primary },
                ]}
              >
                VIBE ANNOUNCEMENT
              </Text>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                Now
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.title,
                { color: colors.textPrimary },
              ]}
            >
              {activeBannerNotification.title}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.body,
                { color: colors.textSecondary },
              ]}
            >
              {activeBannerNotification.body}
            </Text>
          </View>

          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              dismissBannerNotification();
            }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  banner: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#333',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timeText: {
    fontSize: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
