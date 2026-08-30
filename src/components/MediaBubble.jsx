import { useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';

import { formatDuration } from '../lib/media.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * A photo in a message, tappable to fill the screen.
 *
 * The thumbnail is a fixed box rather than the image's own aspect ratio: a
 * panorama and a portrait selfie in the same thread should not make the list
 * jump around as each one loads.
 */
export function ImageBubble({ url, caption, isMine }) {
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  const size = Math.min(240, width * 0.6);

  return (
    <View>
      <Pressable onPress={() => setIsOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size, borderRadius: radius - 4 }}
          contentFit="cover"
          transition={150}
        />
      </Pressable>

      {caption ? (
        <Text className="mt-1.5 text-[15px] leading-5" style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}>
          {caption}
        </Text>
      ) : null}

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/95" onPress={() => setIsOpen(false)}>
          <Image source={{ uri: url }} style={{ width: '100%', height: '80%' }} contentFit="contain" />
          {caption ? <Text className="px-6 pt-4 text-center text-[15px] text-white">{caption}</Text> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * A short video in a message.
 *
 * It does not autoplay. A room can hold dozens of these, and a list that plays
 * everything at once burns battery and talks over whoever is actually
 * speaking. The first frame plus a play badge is enough of an invitation.
 */
export function VideoBubble({ url, caption, durationSeconds, isMine }) {
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();

  const player = useVideoPlayer({ uri: url }, (instance) => {
    instance.loop = false;
  });

  const size = Math.min(240, width * 0.6);

  return (
    <View>
      <View style={{ width: size, height: size, borderRadius: radius - 4, overflow: 'hidden', backgroundColor: '#000' }}>
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls
          allowsFullscreen
        />
      </View>

      {durationSeconds ? (
        <View
          className="absolute left-2 top-2 rounded-full px-2 py-0.5"
          style={{ backgroundColor: '#00000099' }}
          pointerEvents="none"
        >
          <Text className="text-[10px] text-white">{formatDuration(durationSeconds)}</Text>
        </View>
      ) : null}

      {caption ? (
        <Text className="mt-1.5 text-[15px] leading-5" style={{ color: isMine ? colors.onPrimary : colors.textPrimary }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
