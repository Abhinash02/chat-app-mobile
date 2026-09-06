import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const START_LENGTH = 3;
/** Long enough to read, short enough that it has to be held rather than copied. */
const SHOW_MS = 2200;

function makeDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

/**
 * Rapid Recall: a short run of digits flashes up, then you type it back.
 *
 * One digit longer each round. Like Memory Sequence, difficulty comes from
 * length rather than speed — but this one is held in words rather than in
 * space, which makes it a genuinely different exercise.
 */
export function RapidRecall({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [digits, setDigits] = useState([]);
  const [entry, setEntry] = useState([]);
  const [isShowing, setIsShowing] = useState(false);
  const [round, setRound] = useState(0);

  const timersRef = useRef([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    /*
     * First run seeded here, not from an effect. Kept inline rather than
     * calling `beginRound` because that is defined further down — this closure
     * runs long after mount, but reading it here would still be a
     * use-before-define the linter is right to flag.
     */
    onStart: () => {
      clearTimers();
      setDigits(makeDigits(START_LENGTH));
      setEntry([]);
      setIsShowing(true);
      setRound(1);
      timersRef.current.push(setTimeout(() => setIsShowing(false), SHOW_MS));
    },
  });

  const beginRound = useCallback(
    (length) => {
      const next = makeDigits(length);
      setDigits(next);
      setEntry([]);
      setIsShowing(true);

      timersRef.current.push(setTimeout(() => setIsShowing(false), SHOW_MS));
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'submitting') return;
    // Rounds cleared, not digits typed — the reward is for holding a longer
    // run, and a partial round scores nothing.
    finish(Math.max(0, (round - 1) * 45));
  }, [phase, round, finish]);

  function press(digit) {
    if (isShowing || phase !== 'playing') return;

    const position = entry.length;

    if (digits[position] !== digit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setPhase('submitting');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const nextEntry = [...entry, digit];
    setEntry(nextEntry);

    if (nextEntry.length === digits.length) {
      timersRef.current.push(
        setTimeout(() => {
          setRound((current) => {
            beginRound(START_LENGTH + current);
            return current + 1;
          });
        }, 380),
      );
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
      howToPlay="A short run of digits appears for a couple of seconds. When it disappears, tap them back in the same order. One more digit every round."
      stats={[
        { label: 'Round', value: round },
        { label: 'Digits', value: digits.length },
        { label: 'Typed', value: entry.length },
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: isShowing ? colors.primary : colors.textMuted,
            marginBottom: 18,
          }}
        >
          {isShowing ? 'REMEMBER THESE…' : 'TAP THEM BACK IN ORDER'}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            minHeight: 74,
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          {digits.map((digit, index) => (
            <View
              key={`${round}-${index}`}
              style={{
                width: 50,
                height: 66,
                borderRadius: radius,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: index < entry.length ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.textPrimary }}>
                {isShowing ? digit : index < entry.length ? entry[index] : '•'}
              </Text>
            </View>
          ))}
        </View>

        {/* Keypad. Disabled while the digits are on screen, so nobody can copy
            them across instead of remembering them. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
            <Pressable
              key={digit}
              onPress={() => press(digit)}
              disabled={isShowing}
              accessibilityRole="button"
              accessibilityLabel={String(digit)}
              style={({ pressed }) => ({
                width: 68,
                height: 56,
                margin: 4,
                borderRadius: radius,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: isShowing ? 0.35 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>
                {digit}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameShell>
  );
}

export default RapidRecall;
