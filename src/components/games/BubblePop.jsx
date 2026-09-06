import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 35;
const SPAWN_MS = 700;
const BUBBLE_LIFE_MS = 2200;
/** Roughly one in five, which is often enough to punish indiscriminate tapping. */
const BOMB_CHANCE = 0.2;

let nextId = 0;

/**
 * Bubble Pop: tap the bubbles, leave the bombs.
 *
 * Bubbles expire on their own, so the pressure comes from choosing quickly
 * rather than from the clock alone — and the bombs are what stop the optimal
 * strategy being "tap everywhere as fast as possible".
 */
export function BubblePop({ game, onExit }) {
  const { colors } = useTheme();

  const [bubbles, setBubbles] = useState([]);
  const [popped, setPopped] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [area, setArea] = useState({ width: 320, height: 420 });

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setBubbles([]);
      setPopped(0);
      setBombs(0);
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

  // Spawning and expiry share one interval: a timer per bubble would leave
  // dozens pending, and every one of them would have to be cleaned up on exit.
  useEffect(() => {
    if (phase !== 'playing') return undefined;

    const spawner = setInterval(() => {
      const now = Date.now();

      setBubbles((current) => {
        const alive = current.filter((bubble) => now - bubble.bornAt < BUBBLE_LIFE_MS);

        nextId += 1;
        return [
          ...alive,
          {
            id: nextId,
            isBomb: Math.random() < BOMB_CHANCE,
            // Kept off the edges so nothing spawns half under a thumb.
            top: 0.06 + Math.random() * 0.76,
            left: 0.06 + Math.random() * 0.74,
            size: 48 + Math.random() * 26,
            bornAt: now,
          },
        ];
      });
    }, SPAWN_MS);

    return () => clearInterval(spawner);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'submitting') return;
    finish(Math.max(0, popped * 12 - bombs * 20));
  }, [phase, popped, bombs, finish]);

  function handlePop(bubble) {
    setBubbles((current) => current.filter((entry) => entry.id !== bubble.id));

    if (bubble.isBomb) {
      setBombs((value) => value + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } else {
      setPopped((value) => value + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }

  return (
    <GameShell
      title={game.name}
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay="Pop as many bubbles as you can before the time runs out. Bombs look different — tapping one costs you more than a bubble is worth."
      stats={[
        { label: 'Popped', value: popped },
        { label: 'Bombs', value: bombs },
        { label: 'Time', value: `${secondsLeft}s` },
      ]}
    >
      <View
        style={{ flex: 1, margin: 16, borderRadius: 24, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}
        onLayout={(event) => setArea(event.nativeEvent.layout)}
      >
        {bubbles.map((bubble) => (
          <Pressable
            key={bubble.id}
            onPress={() => handlePop(bubble)}
            accessibilityRole="button"
            accessibilityLabel={bubble.isBomb ? 'Bomb' : 'Bubble'}
            style={{
              position: 'absolute',
              top: bubble.top * area.height,
              left: bubble.left * area.width,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bubble.isBomb ? `${colors.danger || '#EF4444'}22` : `${colors.primary}22`,
              borderWidth: 2,
              borderColor: bubble.isBomb ? colors.danger || '#EF4444' : colors.primary,
            }}
          >
            <Text style={{ fontSize: bubble.size * 0.46 }}>{bubble.isBomb ? '💣' : '🫧'}</Text>
          </Pressable>
        ))}

        {phase === 'playing' && bubbles.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Get ready…</Text>
          </View>
        ) : null}
      </View>
    </GameShell>
  );
}

export default BubblePop;
