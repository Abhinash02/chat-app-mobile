import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 60;

/**
 * Builds a sum and three plausible wrong answers.
 *
 * The distractors sit within a few of the real answer on purpose: offering
 * 12, 400 and 7 would make the right one obvious without doing the sum, and
 * the game would stop being about arithmetic.
 */
function makeQuestion() {
  const operations = ['+', '-', '×'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let left;
  let right;
  let answer;

  if (operation === '×') {
    // Kept small: this is a speed game, not mental gymnastics.
    left = 2 + Math.floor(Math.random() * 11);
    right = 2 + Math.floor(Math.random() * 11);
    answer = left * right;
  } else if (operation === '+') {
    left = 5 + Math.floor(Math.random() * 60);
    right = 5 + Math.floor(Math.random() * 60);
    answer = left + right;
  } else {
    left = 20 + Math.floor(Math.random() * 60);
    right = 5 + Math.floor(Math.random() * 15);
    // Ordered so the answer is never negative.
    answer = left - right;
  }

  const options = new Set([answer]);
  while (options.size < 4) {
    const drift = Math.floor(Math.random() * 9) - 4;
    const candidate = answer + (drift === 0 ? 5 : drift);
    if (candidate >= 0) options.add(candidate);
  }

  return {
    text: `${left} ${operation} ${right}`,
    answer,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

/** Number Rush: as many quick sums as you can in sixty seconds. */
export function NumberRush({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [question, setQuestion] = useState(makeQuestion);
  const [feedback, setFeedback] = useState(null);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setScore(0);
      setStreak(0);
      setSecondsLeft(ROUND_SECONDS);
      setQuestion(makeQuestion());
      setFeedback(null);
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
    if (phase === 'submitting') finish(score);
  }, [phase, score, finish]);

  const answer = useCallback(
    (choice) => {
      const isCorrect = choice === question.answer;

      if (isCorrect) {
        // A streak bonus rewards sustained accuracy without letting a lucky
        // run outscore the per-game ceiling the server enforces.
        const bonus = Math.min(Math.floor(streak / 3), 4);
        setScore((current) => current + 5 + bonus);
        setStreak((current) => current + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      } else {
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      }

      setFeedback(isCorrect ? 'correct' : 'wrong');
      setQuestion(makeQuestion());
    },
    [question.answer, streak],
  );

  // Clear the flash without blocking the next answer.
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 220);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <GameShell
      title="Number Rush"
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay={{
        emoji: '🧮',
        text: 'Solve as many sums as you can in sixty seconds. Answer three in a row and each one starts counting for more.',
      }}
      stats={[
        { label: 'score', value: score },
        { label: 'seconds', value: secondsLeft, color: secondsLeft <= 10 ? colors.danger : undefined },
        { label: 'streak', value: streak },
      ]}
    >
      <View className="flex-1 justify-center px-6">
        <View
          className="mb-8 items-center py-10"
          style={{
            backgroundColor:
              feedback === 'correct'
                ? `${colors.success}22`
                : feedback === 'wrong'
                  ? `${colors.danger}22`
                  : colors.surface,
            borderRadius: radius + 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text className="text-5xl font-bold" style={{ color: colors.textPrimary }}>
            {question.text}
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {question.options.map((option) => (
            <Pressable
              key={option}
              onPress={() => answer(option)}
              accessibilityRole="button"
              accessibilityLabel={`Answer ${option}`}
              className="mb-3 items-center justify-center py-5"
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderRadius: radius + 4,
                borderWidth: 2,
                borderColor: colors.border,
              }}
            >
              <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameShell>
  );
}
