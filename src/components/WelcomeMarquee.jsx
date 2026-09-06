import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../theme/ThemeProvider.jsx';

/**
 * The tiles that drift behind the welcome screen.
 *
 * Each one is a small piece of what the app actually is — the languages people
 * talk in, the rooms, the games — rather than decoration. They read as a wall
 * of moments, which is the point: the screen should say "there are people in
 * here" before a single word is read.
 *
 * TO USE REAL PHOTOGRAPHS: drop files into `assets/welcome/` and add `photo:
 * require('../../assets/welcome/one.jpg')` to any tile below. React Native
 * resolves `require` at build time, so each image has to be named explicitly —
 * there is no globbing a folder at runtime. A tile with a photo renders the
 * photo and drops its text; the rest keep working unchanged, so photographs can
 * be added a few at a time.
 */
const TILES = [
  { id: 'hi', label: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', caption: 'Punjabi', height: 168 },
  { id: 'rooms', label: 'rooms', caption: 'live voice', height: 120 },
  { id: 'namaste', label: 'नमस्ते', caption: 'Hindi', height: 150 },
  { id: 'games', label: 'games', caption: 'play together', height: 132 },
  { id: 'vanakkam', label: 'வணக்கம்', caption: 'Tamil', height: 156 },
  { id: 'free', label: '30 min', caption: 'free to start', height: 118 },
  { id: 'namaskar', label: 'নমস্কার', caption: 'Bengali', height: 144 },
  { id: 'hello', label: 'hello', caption: 'English', height: 126 },
];

/** Slow enough to read as atmosphere rather than as something loading. */
const COLUMN_DURATION_MS = 34_000;

function Tile({ tile, tone }) {
  const { colors, fonts } = useTheme();

  return (
    <View
      style={{
        height: tile.height,
        marginBottom: 12,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: tone,
        justifyContent: 'flex-end',
        padding: 14,
      }}
    >
      {tile.photo ? (
        <Image
          source={tile.photo}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 18,
              color: colors.textPrimary,
              fontFamily: fonts?.display,
            }}
          >
            {tile.label}
          </Text>
          <Text style={{ fontSize: 11, marginTop: 3, color: colors.textMuted }}>
            {tile.caption}
          </Text>
        </>
      )}
    </View>
  );
}

/**
 * One endlessly drifting column.
 *
 * The list is rendered twice and translated by exactly the height of one copy,
 * so the moment the animation resets the second copy is sitting precisely where
 * the first was — the loop has no seam and no jump.
 */
function Column({ tiles, width, direction, tones, delay }) {
  const [offset] = useState(() => new Animated.Value(0));
  const [runHeight, setRunHeight] = useState(0);

  useEffect(() => {
    if (!runHeight) return undefined;

    offset.setValue(0);

    const animation = Animated.loop(
      Animated.timing(offset, {
        toValue: 1,
        duration: COLUMN_DURATION_MS,
        delay,
        // Linear on purpose: any easing would make the drift speed up and slow
        // down, and a loop that pulses reads as a glitch rather than motion.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [offset, runHeight, delay]);

  const translateY = offset.interpolate({
    inputRange: [0, 1],
    // Opposite directions per column. Two columns moving the same way looks
    // like the screen is scrolling; moving apart looks alive.
    outputRange: direction === 'up' ? [0, -runHeight] : [-runHeight, 0],
  });

  return (
    <View style={{ width, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {/* Measured once, from the first copy only. */}
        <View onLayout={(event) => setRunHeight(event.nativeEvent.layout.height)}>
          {tiles.map((tile, index) => (
            <Tile key={tile.id} tile={tile} tone={tones[index % tones.length]} />
          ))}
        </View>

        {tiles.map((tile, index) => (
          <Tile key={`${tile.id}-repeat`} tile={tile} tone={tones[index % tones.length]} />
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Two columns of drifting tiles, for the top of the welcome screen.
 *
 * Deliberately unequal: the columns are different widths and start at different
 * offsets, so the composition never resolves into a neat grid. A symmetrical
 * pair of columns is the thing that would make this read as a component rather
 * than as art direction.
 */
export function WelcomeMarquee({ height = 340 }) {
  const { colors } = useTheme();

  // Tones from the theme, so the wall recolours with the rest of the app.
  const tones = [colors.surfaceAlt, colors.surface, `${colors.primary}14`];

  const left = TILES.filter((_, index) => index % 2 === 0);
  const right = TILES.filter((_, index) => index % 2 === 1);

  return (
    <View
      style={{ height, flexDirection: 'row', gap: 12, overflow: 'hidden' }}
      // Purely atmospheric: it must never intercept a tap meant for the
      // buttons, and there is nothing here for a screen reader to announce.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Column tiles={left} width={132} direction="up" tones={tones} delay={0} />
      {/* Narrower, slower to start, drifting the other way. */}
      <Column tiles={right} width={104} direction="down" tones={tones} delay={900} />
    </View>
  );
}

export default WelcomeMarquee;
