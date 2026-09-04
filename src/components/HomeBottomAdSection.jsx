import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image as RNImage,
  Linking,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';

import { bannersApi, settingsApi } from '../api/endpoints.js';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { AdBanner } from './AdBanner';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Native Video Ad with auto aspect ratio
 */
function NativeAdVideo({ uri, height = 180, aspectRatio = 16 / 9 }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
        aspectRatio: aspectRatio || undefined,
      }}
    >
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

/**
 * Video Ad Player for Web and Native
 */
function AdVideoPlayer({ uri, height = 180, onRatioChange }) {
  const [videoRatio, setVideoRatio] = useState(16 / 9);

  const handleLoadedMetadata = (e) => {
    const video = e?.target;
    if (video && video.videoWidth && video.videoHeight) {
      const ratio = video.videoWidth / video.videoHeight;
      if (ratio > 0.3 && ratio < 4) {
        setVideoRatio(ratio);
        onRatioChange?.(ratio);
      }
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          width: '100%',
          height,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <video
          src={uri}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </View>
    );
  }

  return <NativeAdVideo uri={uri} height={height} aspectRatio={videoRatio} />;
}

/**
 * Responsive Animated Ad Banner that dynamically calculates height & aspect ratio
 */
function AnimatedAdBanner({ banner, containerWidth }) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const motion = useRef(new Animated.Value(0)).current;

  // Aspect ratio state (width / height)
  // Default to 16:9 or 2.4:1 banner ratio before media is loaded
  const [aspectRatio, setAspectRatio] = useState(2.2);

  const isVideo =
    banner.mediaType === 'video' ||
    (typeof banner.imageUrl === 'string' &&
      Boolean(banner.imageUrl.match(/\.(mp4|webm|mov|3gp)($|\?)/i)));

  const animType = banner.animation || 'shimmer';

  // Measure Image natural dimensions on mount/URI change
  useEffect(() => {
    if (isVideo || !banner.imageUrl) return;

    let isMounted = true;

    // React Native Image.getSize works across Native & Web
    RNImage.getSize(
      banner.imageUrl,
      (width, height) => {
        if (!isMounted || !width || !height) return;
        const ratio = width / height;
        // Keep within reasonable bounds (0.6 to 4.5)
        if (ratio >= 0.6 && ratio <= 4.5) {
          setAspectRatio(ratio);
        }
      },
      () => {
        // Fallback default
      }
    );

    return () => {
      isMounted = false;
    };
  }, [banner.imageUrl, isVideo]);

  useEffect(() => {
    if (isVideo || animType === 'none') {
      motion.setValue(0);
      return;
    }

    const duration = animType === 'shimmer' ? 2200 : animType === 'pulse' ? 3200 : 4000;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        animType === 'shimmer'
          ? Animated.delay(1200)
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
  }, [animType, isVideo, motion]);

  // Compute responsive height based on container width and detected aspect ratio
  const validWidth = containerWidth > 0 ? containerWidth : 340;
  const rawHeight = validWidth / (aspectRatio || 2.2);
  const maxAllowedHeight = Math.min(360, Math.round(screenHeight * 0.45));
  const height = Math.min(Math.max(Math.round(rawHeight), 85), maxAllowedHeight);

  if (isVideo) {
    return (
      <AdVideoPlayer
        uri={banner.imageUrl}
        height={height}
        onRatioChange={(r) => setAspectRatio(r)}
      />
    );
  }

  const isPulse = animType === 'pulse';
  const isFade = animType === 'fade';
  const isShimmer = animType === 'shimmer';

  const imageStyle = {
    width: '100%',
    height: '100%',
    opacity: isFade
      ? motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1, 0.85] })
      : 1,
    transform: [
      ...(isPulse
        ? [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }]
        : []),
      ...(isFade
        ? [{ scale: motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.02, 1] }) }]
        : []),
    ],
  };

  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        position: 'relative',
      }}
    >
      <Animated.View style={imageStyle}>
        <Image
          source={{ uri: banner.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          onLoad={(e) => {
            const { width: w, height: h } = e.source || {};
            if (w && h && w > 0 && h > 0) {
              const ratio = w / h;
              if (ratio >= 0.6 && ratio <= 4.5) {
                setAspectRatio(ratio);
              }
            }
          }}
          transition={200}
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* Shimmer sweep effect */}
      {isShimmer && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -height * 0.3,
            bottom: -height * 0.3,
            width: Math.max(90, Math.round(validWidth * 0.3)),
            transform: [
              {
                translateX: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-validWidth * 0.5, validWidth * 1.4],
                }),
              },
              { rotate: '15deg' },
            ],
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
          }}
        />
      )}
    </View>
  );
}

export function HomeBottomAdSection() {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Dynamic container width (defaults to screen width minus padding, clamped for large screens/tablets)
  const initialCardWidth = Math.min(Math.max(windowWidth - 32 - 24, 280), 560);
  const [contentWidth, setContentWidth] = useState(initialCardWidth);

  // 1. Fetch live public app settings for ads config
  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: settingsApi.public,
    staleTime: 60_000,
  });

  const adsConfig = publicSettings?.ads ?? {
    homeBottomAdProvider: 'admin',
    admobBannerUnitId: 'ca-app-pub-1028685120327829/9588291921',
    showSponsoredBadge: true,
  };

  const provider = adsConfig.homeBottomAdProvider ?? 'admin';

  // 2. Fetch live bottom in-house banner if provider === 'admin'
  const { data: bottomBanners } = useQuery({
    queryKey: ['banners', 'home_bottom_ad'],
    queryFn: () => bannersApi.listLive({ placement: 'home_bottom_ad' }),
    enabled: provider === 'admin',
    staleTime: 30_000,
  });

  const banner = bottomBanners?.[0];

  // Record impression on mount
  const hasRecordedImpression = useRef(false);
  useEffect(() => {
    if (provider === 'admin' && banner?.id && !hasRecordedImpression.current) {
      hasRecordedImpression.current = true;
      bannersApi.recordImpressions([banner.id]).catch(() => {});
    }
  }, [provider, banner?.id]);

  // If section is turned off from Admin
  if (provider === 'off') {
    return null;
  }

  // Handle banner tap redirection
  const handleBannerPress = () => {
    if (!banner) return;
    bannersApi
      .recordTap(banner.id, {
        action: banner.action,
        actionTarget: banner.actionTarget,
      })
      .catch(() => {});

    // External Website Link (opens in Chrome/Safari/system browser)
    if (banner.action === 'url' && banner.actionTarget) {
      Linking.openURL(banner.actionTarget).catch(() => {});
    }
    // In-App Screen (navigates inside app)
    else if (banner.action === 'screen' && banner.actionTarget) {
      const target = banner.actionTarget.startsWith('/')
        ? banner.actionTarget
        : `/${banner.actionTarget}`;
      router.push(target);
    }
  };

  const isRedirectActive = Boolean(
    banner?.action && banner.action !== 'none' && banner.actionTarget && banner.actionTarget.trim().length > 0
  );

  const isVideo =
    banner?.mediaType === 'video' ||
    (typeof banner?.imageUrl === 'string' &&
      Boolean(banner.imageUrl.match(/\.(mp4|webm|mov|3gp)($|\?)/i)));

  // ── Option A: Admin In-House Custom Ad (Image or Short Video) ──
  if (provider === 'admin') {
    if (!banner) return null;

    return (
      <View
        className="mb-6 px-4"
        onLayout={(e) => {
          const layoutWidth = e.nativeEvent.layout.width;
          if (layoutWidth > 0) {
            // Subtract card inner padding (12px on left and right = 24px)
            setContentWidth(layoutWidth - 24);
          }
        }}
      >
        <Pressable
          onPress={handleBannerPress}
          disabled={!isRedirectActive}
          accessibilityRole={isRedirectActive ? 'button' : 'none'}
          style={({ pressed }) => ({
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: `${colors.primary}25`,
            padding: 12,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
            transform: [{ scale: pressed && isRedirectActive ? 0.98 : 1 }],
          })}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  backgroundColor: `${colors.primary}18`,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${colors.primary}33`,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>
                  {isVideo ? '🎬 VIDEO AD' : '📢 SPONSORED'}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, flex: 1 }}
              >
                {banner.title}
              </Text>
            </View>

            {isRedirectActive ? (
              <View
                style={{
                  backgroundColor: `${colors.primary}15`,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary }}>
                  {banner.action === 'url' ? 'Visit website ↗' : 'Tap to open →'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Banner Graphic (Image or Video) with responsive width & auto-aspect-ratio */}
          <AnimatedAdBanner banner={banner} containerWidth={contentWidth} />

          {banner.note ? (
            <Text
              numberOfLines={1}
              style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}
            >
              {banner.note}
            </Text>
          ) : null}
        </Pressable>
      </View>
    );
  }

  // ── Option B: Google AdMob ──
  if (provider === 'admob') {
    return (
      <View className="mb-6 px-4">
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: colors.border,
            padding: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  backgroundColor: '#EAB30818',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#EAB30840',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#CA8A04', letterSpacing: 0.5 }}>
                  AD · GOOGLE ADS
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Sponsored Content
              </Text>
            </View>

            <Text style={{ fontSize: 10, color: colors.textMuted }}>
              AdMob Live
            </Text>
          </View>

          {/* Google AdMob Banner */}
          <AdBanner />
        </View>
      </View>
    );
  }

  return null;
}

