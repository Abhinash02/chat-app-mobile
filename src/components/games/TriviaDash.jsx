import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const QUESTIONS_PER_ROUND = 10;
const SECONDS_PER_QUESTION = 12;

/**
 * The question bank is embedded for the same reason the word list is: it is
 * small, static, and a quiz that cannot start without a network round trip is
 * a quiz that fails on a train.
 *
 * General knowledge, weighted towards things an Indian audience would find
 * fair rather than obscure trivia.
 */
const QUESTIONS = [
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
  { q: 'How many players are on a cricket team?', options: ['9', '10', '11', '12'], answer: 2 },
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
  { q: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Ganga', 'Yangtze'], answer: 1 },
  { q: 'How many colours are in a rainbow?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which gas do plants absorb?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { q: 'What is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { q: 'Who wrote the national anthem of India?', options: ['Tagore', 'Nehru', 'Gandhi', 'Bose'], answer: 0 },
  { q: 'How many minutes are in a full day?', options: ['1200', '1440', '1800', '2400'], answer: 1 },
  { q: 'Which metal is liquid at room temperature?', options: ['Lead', 'Mercury', 'Zinc', 'Tin'], answer: 1 },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2 },
  { q: 'Which animal is the tallest?', options: ['Elephant', 'Giraffe', 'Horse', 'Camel'], answer: 1 },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'What does WWW stand for?', options: ['World Wide Web', 'Web World Wide', 'Wide World Web', 'World Web Wide'], answer: 0 },
  { q: 'Which is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'Which festival is called the festival of lights?', options: ['Holi', 'Diwali', 'Eid', 'Onam'], answer: 1 },
  { q: 'What is the boiling point of water in Celsius?', options: ['90', '95', '100', '105'], answer: 2 },
  { q: 'Which is the largest mammal?', options: ['Elephant', 'Blue whale', 'Giraffe', 'Hippo'], answer: 1 },
  { q: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], answer: 2 },
];

function dealRound() {
  return [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_ROUND);
}

/** Trivia Dash: ten questions, twelve seconds each. */
export function TriviaDash({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [round, setRound] = useState(dealRound);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [chosen, setChosen] = useState(null);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setRound(dealRound());
      setIndex(0);
      setCorrect(0);
      setScore(0);
      setSecondsLeft(SECONDS_PER_QUESTION);
      setChosen(null);
    },
  });

  const question = round[index];

  // A per-question timer, reset by the index changing rather than by a separate
  // effect — one source of truth for "a new question started".
  useEffect(() => {
    if (phase !== 'playing' || chosen !== null) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          // Out of time counts as a wrong answer, revealed like any other.
          setChosen(-1);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, index, chosen]);

  useEffect(() => {
    if (phase === 'submitting') finish(score);
  }, [phase, score, finish]);

  // Advance after the answer has been shown long enough to read.
  useEffect(() => {
    if (chosen === null || phase !== 'playing') return undefined;

    const timer = setTimeout(() => {
      if (index + 1 >= round.length) {
        setPhase('submitting');
        return;
      }

      setIndex((current) => current + 1);
      setSecondsLeft(SECONDS_PER_QUESTION);
      setChosen(null);
    }, 1100);

    return () => clearTimeout(timer);
  }, [chosen, index, round.length, phase, setPhase]);

  function answer(optionIndex) {
    if (chosen !== null) return;

    setChosen(optionIndex);

    if (optionIndex === question.answer) {
      // Answering quickly is worth more, which is what makes it a dash.
      setScore((current) => current + 10 + secondsLeft);
      setCorrect((current) => current + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }
  }

  function optionColour(optionIndex) {
    if (chosen === null) return { bg: colors.surface, border: colors.border, text: colors.textPrimary };
    if (optionIndex === question.answer) {
      return { bg: `${colors.success}22`, border: colors.success, text: colors.success };
    }
    if (optionIndex === chosen) {
      return { bg: `${colors.danger}22`, border: colors.danger, text: colors.danger };
    }
    return { bg: colors.surface, border: colors.border, text: colors.textMuted };
  }

  return (
    <GameShell
      title="Trivia Dash"
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay={{
        emoji: '🧠',
        text: 'Ten questions, twelve seconds each. The faster you answer correctly, the more each one is worth.',
      }}
      stats={[
        { label: 'score', value: score },
        { label: 'seconds', value: secondsLeft, color: secondsLeft <= 4 ? colors.danger : undefined },
        { label: 'correct', value: `${correct}/${round.length}` },
      ]}
    >
      <View className="flex-1 justify-center px-5">
        <View className="mb-4 flex-row items-center gap-2">
          {round.map((_, questionIndex) => (
            <View
              key={questionIndex}
              className="h-1.5 flex-1 rounded-full"
              style={{
                backgroundColor: questionIndex <= index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        <View
          className="mb-6 items-center justify-center px-5 py-8"
          style={{ backgroundColor: colors.surface, borderRadius: radius + 8, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="mb-1 text-xs uppercase" style={{ color: colors.textMuted }}>
            Question {index + 1} of {round.length}
          </Text>
          <Text
            className="text-center text-xl font-bold leading-snug"
            style={{ color: colors.textPrimary }}
          >
            {question.q}
          </Text>
        </View>

        {question.options.map((option, optionIndex) => {
          const tone = optionColour(optionIndex);

          return (
            <Pressable
              key={option}
              onPress={() => answer(optionIndex)}
              disabled={chosen !== null}
              accessibilityRole="button"
              className="mb-2.5 flex-row items-center gap-3 px-4 py-4"
              style={{
                backgroundColor: tone.bg,
                borderRadius: radius + 2,
                borderWidth: 2,
                borderColor: tone.border,
              }}
            >
              <View
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.surfaceAlt }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                  {String.fromCharCode(65 + optionIndex)}
                </Text>
              </View>
              <Text className="flex-1 text-base font-semibold" style={{ color: tone.text }}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}
