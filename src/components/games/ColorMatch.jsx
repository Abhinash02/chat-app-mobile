import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 40;

/**
 * Deliberately printed in a colour that is usually *not* the one it names.
 *
 * That mismatch is the whole game — the Stroop effect. Reading the word is
 * automatic; ignoring the ink it is printed in is not, which is what makes a
 * trivially simple rule genuinely hard at speed.
 */
const COLORS = [
  { name: 'RED', value: '#EF4444' },
  { name: 'BLUE', value: '#3B82F6' },
  { name: 'GREEN', value: '#22C55E' },
  { name: 'YELLOW', value: '#F59E0B' },
  { name: 'PURPLE', value: '#8B5CF6' },
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** A word, an ink colour, and four swatches — one of which is the answer. */
function makeRound() {
  const word = pick(COLORS);
  const ink = pick(COLORS);

  const others = COLORS.filter((entry) => entry.name !== word.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return {
    word,
    ink,
    options: [word, ...others].sort(() => Math.random() - 0.5),
  };
}

/**
 * Color Match: tap the swatch the word *names*, ignoring the colour it is
 * written in.
 */
export function ColorMatch({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [round, setRound] = useState(makeRound);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [flash, setFlash] = useState(null);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setRound(makeRound());
      setCorrect(0);
      setStreak(0);
      setBestStreak(0);
      setMistakes(0);
      setFlash(null);
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

    /*
     * Ten a correct answer, with a bonus for the best unbroken run and a small
     * penalty per mistake. Guessing at random averages one in four, so the
     * penalty is what stops mashing from out-scoring reading.
     */
    finish(Math.max(0, correct * 10 + bestStreak * 5 - mistakes * 4));
  }, [phase, correct, bestStreak, mistakes, finish]);

  function answer(option) {
    const isRight = option.name === round.word.name;

    if (isRight) {
      setCorrect((value) => value + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } else {
      setMistakes((value) => value + 1);
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }

    setFlash(isRight ? 'right' : 'wrong');
    setRound(makeRound());
  }

  return (
    <GameShell
      title={game.name}
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay="A word appears in a colour that usually does not match it. Tap the swatch the word SAYS, not the colour it is written in."
      stats={[
        { label: 'Correct', value: correct },
        { label: 'Streak', value: streak },
        { label: 'Time', value: `${secondsLeft}s` },
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, marginBottom: 14 }}>
          TAP THE COLOUR THIS WORD NAMES
        </Text>

        <View
          style={{
            paddingHorizontal: 34,
            paddingVertical: 26,
            borderRadius: radius + 8,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor:
              flash === 'right'
                ? colors.success || '#22C55E'
                : flash === 'wrong'
                  ? colors.danger || '#EF4444'
                  : colors.border,
            marginBottom: 30,
          }}
        >
          <Text style={{ fontSize: 44, fontWeight: '900', color: round.ink.value, letterSpacing: 1 }}>
            {round.word.name}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {round.options.map((option) => (
            <Pressable
              key={option.name}
              onPress={() => answer(option)}
              accessibilityRole="button"
              accessibilityLabel={option.name}
              style={({ pressed }) => ({
                width: 74,
                height: 74,
                borderRadius: 20,
                backgroundColor: option.value,
                transform: [{ scale: pressed ? 0.94 : 1 }],
                shadowColor: option.value,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              })}
            />
          ))}
        </View>
      </View>
    </GameShell>
  );
}

export default ColorMatch;
