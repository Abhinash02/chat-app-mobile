import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 45;

/**
 * Pairs that are close enough to need a second look, but never ambiguous.
 *
 * A pair nobody can separate is not difficulty, it is a broken puzzle — so
 * each of these differs in exactly one obvious feature once you find it.
 */
const PAIRS = [
  ['🙂', '🙃'],
  ['😺', '😸'],
  ['🍎', '🍏'],
  ['⭐', '🌟'],
  ['🐶', '🐕'],
  ['🌸', '🌺'],
  ['🔵', '🔷'],
  ['🥕', '🌽'],
  ['🐢', '🐊'],
  ['🍋', '🍌'],
];

/** Grid grows with the round, so it gets harder without getting faster. */
function gridSizeFor(round) {
  if (round < 3) return 3;
  if (round < 6) return 4;
  return 5;
}

function makeBoard(round) {
  const size = gridSizeFor(round);
  const count = size * size;
  const [common, odd] = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const oddIndex = Math.floor(Math.random() * count);

  return {
    size,
    oddIndex,
    tiles: Array.from({ length: count }, (_, index) => (index === oddIndex ? odd : common)),
  };
}

/** Odd One Out: find the single tile that differs from the rest. */
export function OddOneOut({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [round, setRound] = useState(0);
  const [board, setBoard] = useState(() => makeBoard(0));
  const [found, setFound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setRound(0);
      setBoard(makeBoard(0));
      setFound(0);
      setMistakes(0);
      setSecondsLeft(ROUND_SECONDS);
    },
  });

  useEffect(() => {
    if (phase !== 'playing') return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setPhase('submitting');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, setPhase]);

  useEffect(() => {
    if (phase !== 'submitting') return;
    // A wrong tap costs three seconds' worth of progress, which is roughly
    // what a careless guess saves — so scanning beats stabbing.
    finish(Math.max(0, found * 25 - mistakes * 8));
  }, [phase, found, mistakes, finish]);

  function handleTile(index) {
    if (phase !== 'playing') return;

    if (index === board.oddIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const next = round + 1;
      setFound((value) => value + 1);
      setRound(next);
      setBoard(makeBoard(next));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setMistakes((value) => value + 1);
    }
  }

  // Sized so a 5x5 board still fits a small phone without scrolling.
  const tileSize = board.size === 3 ? 86 : board.size === 4 ? 68 : 56;

  return (
    <GameShell
      title={game.name}
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay="Every tile is the same except one. Tap the odd one to move on. The grid grows as you go, and wrong taps cost points."
      stats={[
        { label: 'Found', value: found },
        { label: 'Grid', value: `${board.size}×${board.size}` },
        { label: 'Time', value: `${secondsLeft}s` },
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, marginBottom: 16 }}>
          FIND THE ONE THAT IS DIFFERENT
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: board.size * (tileSize + 8),
            justifyContent: 'center',
          }}
        >
          {board.tiles.map((emoji, index) => (
            <Pressable
              key={`${round}-${index}`}
              onPress={() => handleTile(index)}
              accessibilityRole="button"
              accessibilityLabel={`Tile ${index + 1}`}
              style={({ pressed }) => ({
                width: tileSize,
                height: tileSize,
                margin: 4,
                borderRadius: radius,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <Text style={{ fontSize: tileSize * 0.5 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameShell>
  );
}

export default OddOneOut;
