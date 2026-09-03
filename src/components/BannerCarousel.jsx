import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Linking, Pressable, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

/**
 * react-native-web has no native animated module, so requesting the native
 * driver there logs a warning for every animation and falls back anyway.
 * On a real device this stays true, which is where it matters.
 */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

import { bannersApi } from '../api/endpoints.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

const AUTO_ADVANCE_MS = 5000;

import { Text } from 'react-native';

/**
 * One banner, with whichever motion the admin chose.
 * Formatted in 4:1 LinkedIn banner aspect ratio.
 * 100% compatible with APK (Android) and Web.
 */
function AnimatedBanner({ banner, width, height }) {
  const { colors, radius } = useTheme();
  const [motion] = useState(() => new Animated.Value(0));

  const animType = banner.animation || 'shimmer';

  useEffect(() => {
    if (animType === 'none') return undefined;

    const duration =
      animType === 'shimmer' ? 2200 : animType === 'fade' ? 2800 : 4000;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        // Shimmer restarts from left rather than sweeping back
        animType === 'shimmer'
          ? Animated.timing(motion, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER })
          : Animated.timing(motion, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [animType, motion]);

  const isPan = animType === 'pan';
  const isPulse = animType === 'pulse';
  const isFade = animType === 'fade';
  const isShimmer = animType === 'shimmer';

  const imageStyle = {
    width: isPan ? width * 1.12 : width,
    height,
    opacity: isFade
      ? motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1, 0.85] })
      : 1,
    transform: [
      ...(isPan
        ? [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.12] }) }]
        : []),
      ...(isPulse
        ? [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }]
        : []),
      ...(isFade
        ? [{ scale: motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.02, 1] }) }]
        : []),
    ],
  };

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius || 18,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: `${colors.primary}25`,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <Animated.View style={imageStyle}>
        <Image
          source={{ uri: banner.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* Shimmer sweep animation (works on both Android APK and Web) */}
      {isShimmer && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -height * 0.2,
            bottom: -height * 0.2,
            width: width * 0.4,
            backgroundColor: 'rgba(255,255,255,0.3)',
            transform: [
              {
                translateX: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width * 0.5, width * 1.3],
                }),
              },
              { rotate: '15deg' },
            ],
          }}
        />
      )}

      {/* Floating Redirection Pill: shown ONLY when admin activated redirection */}
      {Boolean(banner.action && banner.action !== 'none' && banner.actionTarget && banner.actionTarget.trim().length > 0) && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 9.5, fontWeight: '700' }}>
            {banner.action === 'screen' ? 'Tap to open →' : 'Visit link ↗'}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * The promo strip at the top of the home feed.
 * Formatted like a LinkedIn panoramic banner (4:1 aspect ratio).
 */
export function BannerCarousel() {
  const { colors, radius } = useTheme();
  const [width, setWidth] = useState(Dimensions.get('window').width - 32);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const reportedRef = useRef(false);

  const bannerHeight = Math.round(width / 4);

  const { data: banners = [] } = useQuery({
    queryKey: ['banners', 'home_top'],
    queryFn: () => bannersApi.listLive({ placement: 'home_top' }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (banners.length === 0 || reportedRef.current) return;
    reportedRef.current = true;

    // Best effort: a lost impression is not worth surfacing to the user.
    bannersApi.recordImpressions(banners.map((banner) => banner.id)).catch(() => undefined);
  }, [banners]);

  // Auto-advance, but only when there is more than one banner to advance to.
  useEffect(() => {
    if (banners.length <= 1) return undefined;

    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [banners.length, width]);

  const handlePress = useCallback((banner) => {
    bannersApi
      .recordTap(banner.id, {
        action: banner.action,
        actionTarget: banner.actionTarget,
      })
      .catch(() => undefined);

    if (banner.action === 'screen' && banner.actionTarget) {
      router.push(`/${banner.actionTarget}`);
      return;
    }

    if (banner.action === 'url' && banner.actionTarget) {
      // The server already restricted this to http(s); this is the second gate.
      if (/^https?:\/\//i.test(banner.actionTarget)) {
        Linking.openURL(banner.actionTarget).catch(() => undefined);
      }
    }
  }, []);

  if (banners.length === 0) return null;

  return (
    <View
      className="mb-4"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        style={{ borderRadius: radius }}
      >
        {banners.map((banner) => {
          const isRedirectActive = Boolean(
            banner.action &&
            banner.action !== 'none' &&
            banner.actionTarget &&
            banner.actionTarget.trim().length > 0
          );

          return (
            <Pressable
              key={banner.id}
              onPress={() => (isRedirectActive ? handlePress(banner) : undefined)}
              disabled={!isRedirectActive}
              accessibilityRole={!isRedirectActive ? 'image' : 'button'}
              accessibilityLabel={banner.title}
              style={({ pressed }) => ({
                transform: [{ scale: pressed && isRedirectActive ? 0.98 : 1 }],
                opacity: pressed && isRedirectActive ? 0.92 : 1,
              })}
            >
              <AnimatedBanner banner={banner} width={width} height={bannerHeight} />
            </Pressable>
          );
        })}
      </Animated.ScrollView>

      {banners.length > 1 ? (
        <View className="mt-2 flex-row items-center justify-center gap-1.5">
          {banners.map((banner, dotIndex) => (
            <View
              key={banner.id}
              style={{
                width: dotIndex === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: dotIndex === index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
