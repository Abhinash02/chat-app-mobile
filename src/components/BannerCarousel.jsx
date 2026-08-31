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

/**
 * One banner, with whichever motion the admin chose.
 * Formatted in 4:1 LinkedIn banner aspect ratio.
 */
function AnimatedBanner({ banner, width, height }) {
  const { radius } = useTheme();
  const [motion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (banner.animation === 'none') return undefined;

    const duration = banner.animation === 'shimmer' ? 1800 : 4200;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        // Shimmer restarts from the left rather than sweeping back, which would
        // read as the light moving the wrong way.
        banner.animation === 'shimmer'
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
  }, [banner.animation, motion]);

  // A slow pan needs the image slightly wider than the frame, or there is
  // nothing to pan across.
  const isPan = banner.animation === 'pan';

  const imageStyle = {
    width: isPan ? width * 1.12 : width,
    height,
    transform: [
      ...(isPan
        ? [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.12] }) }]
        : []),
      ...(banner.animation === 'pulse'
        ? [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }]
        : []),
    ],
  };

  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <Animated.View style={imageStyle}>
        <Image
          source={{ uri: banner.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {banner.animation === 'shimmer' ? (
        <Animated.View
          style={{
            // In style rather than as a prop: the prop form is deprecated, and
            // the sweep must not swallow taps meant for the banner beneath it.
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: width * 0.35,
            backgroundColor: 'rgba(255,255,255,0.28)',
            transform: [
              {
                translateX: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width * 0.4, width * 1.1],
                }),
              },
              { rotate: '12deg' },
            ],
          }}
        />
      ) : null}
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
    queryFn: () => bannersApi.listLive(),
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
    bannersApi.recordTap(banner.id).catch(() => undefined);

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
        {banners.map((banner) => (
          <Pressable
            key={banner.id}
            onPress={() => handlePress(banner)}
            disabled={banner.action === 'none'}
            accessibilityRole={banner.action === 'none' ? 'image' : 'button'}
            accessibilityLabel={banner.title}
          >
            <AnimatedBanner banner={banner} width={width} height={bannerHeight} />
          </Pressable>
        ))}
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
