import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 120;
const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Words are embedded rather than fetched: the list is small, it never changes,
 * and a word game that needs a network round trip to start a round would stall
 * on exactly the flaky connections this app runs on.
 *
 * Everyday words with a hint each, so the game rewards a guess rather than
 * vocabulary trivia.
 */
const WORDS = [
  { word: 'GUITAR', hint: 'Six strings' },
  { word: 'MONSOON', hint: 'Season of rain' },
  { word: 'CRICKET', hint: 'Bat and ball' },
  { word: 'BIRYANI', hint: 'Rice and spice' },
  { word: 'MOUNTAIN', hint: 'Very tall ground' },
  { word: 'FRIEND', hint: 'What you came here for' },
  { word: 'SUNRISE', hint: 'Start of the day' },
  { word: 'JOURNEY', hint: 'A long trip' },
  { word: 'LIBRARY', hint: 'Full of books' },
  { word: 'DIAMOND', hint: 'Hardest gem' },
  { word: 'ELEPHANT', hint: 'Never forgets' },
  { word: 'RAINBOW', hint: 'Seven colours' },
  { word: 'CHOCOLATE', hint: 'Sweet and brown' },
  { word: 'FESTIVAL', hint: 'Lights and sweets' },
  { word: 'TEACHER', hint: 'Stands at the board' },
  { word: 'PAINTING', hint: 'Hangs on a wall' },
  { word: 'MARKET', hint: 'Where you haggle' },
  { word: 'WINTER', hint: 'Coldest season' },
  { word: 'PUZZLE', hint: 'Pieces that fit' },
  { word: 'CAMERA', hint: 'Captures a moment' },
];

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

/** Word Guess: reveal the word a letter at a time before six wrong tries. */
export function WordGuess({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [target, setTarget] = useState(pickWord);
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(0);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setTarget(pickWord());
      setGuessed([]);
      setWrong(0);
      setSolved(0);
      setScore(0);
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
    if (phase === 'submitting') finish(score);
  }, [phase, score, finish]);

  const letters = [...new Set(target.word.split(''))];
  const isComplete = letters.every((letter) => guessed.includes(letter));
  const isOut = wrong >= MAX_WRONG;

  /**
   * Moving on is handled here rather than in an effect watching the board,
   * because the guess is what causes it — and a fresh word must not be dealt
   * before the player sees the one they just finished.
   */
  function guess(letter) {
    if (guessed.includes(letter) || isComplete || isOut) return;

    const isHit = target.word.includes(letter);
    const nextGuessed = [...guessed, letter];
    setGuessed(nextGuessed);

    if (isHit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      if (letters.every((l) => nextGuessed.includes(l))) {
        // Fewer wrong guesses is worth more, so a clean solve beats a lucky one.
        setScore((current) => current + 20 + (MAX_WRONG - wrong) * 5);
        setSolved((current) => current + 1);
        setTimeout(() => {
          setTarget(pickWord());
          setGuessed([]);
          setWrong(0);
        }, 900);
      }
      return;
    }

    const nextWrong = wrong + 1;
    setWrong(nextWrong);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

    if (nextWrong >= MAX_WRONG) {
      // Show the answer briefly, then deal another word rather than ending the
      // whole round on one bad guess.
      setTimeout(() => {
        setTarget(pickWord());
        setGuessed([]);
        setWrong(0);
      }, 1400);
    }
  }

  return (
    <GameShell
      title="Word Guess"
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay={{
        emoji: '🔤',
        text: 'Guess the hidden word one letter at a time. Six wrong letters and you move on to the next word — solve it with guesses to spare and it counts for more.',
      }}
      stats={[
        { label: 'score', value: score },
        { label: 'seconds', value: secondsLeft, color: secondsLeft <= 20 ? colors.danger : undefined },
        { label: 'solved', value: solved },
      ]}
    >
      <View className="flex-1 justify-between px-4 pb-4">
        <View className="items-center pt-4">
          <Text className="text-xs uppercase" style={{ color: colors.textMuted }}>
            {target.hint}
          </Text>

          <View className="mt-5 flex-row flex-wrap justify-center">
            {target.word.split('').map((letter, index) => {
              const isRevealed = guessed.includes(letter) || isOut;

              return (
                <View
                  key={`${letter}-${index}`}
                  className="m-1 items-center justify-center"
                  style={{
                    width: 34,
                    height: 44,
                    borderRadius: 8,
                    backgroundColor: isRevealed ? colors.surface : colors.surfaceAlt,
                    borderBottomWidth: 3,
                    borderBottomColor: isOut && !guessed.includes(letter) ? colors.danger : colors.primary,
                  }}
                >
                  <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                    {isRevealed ? letter : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          <View className="mt-4 flex-row gap-1.5">
            {Array.from({ length: MAX_WRONG }).map((_, index) => (
              <View
                key={index}
                className="h-2 w-6 rounded-full"
                style={{ backgroundColor: index < wrong ? colors.danger : colors.border }}
              />
            ))}
          </View>

          {isComplete ? (
            <Text className="mt-3 text-sm font-bold" style={{ color: colors.success }}>
              Solved!
            </Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap justify-center">
          {ALPHABET.map((letter) => {
            const isUsed = guessed.includes(letter);
            const isHit = isUsed && target.word.includes(letter);

            return (
              <Pressable
                key={letter}
                onPress={() => guess(letter)}
                disabled={isUsed}
                accessibilityRole="button"
                accessibilityLabel={`Guess ${letter}`}
                className="m-1 items-center justify-center"
                style={{
                  width: 34,
                  height: 42,
                  borderRadius: radius - 2,
                  backgroundColor: isUsed
                    ? isHit
                      ? `${colors.success}33`
                      : colors.surfaceAlt
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isUsed ? 'transparent' : colors.border,
                  opacity: isUsed && !isHit ? 0.4 : 1,
                }}
              >
                <Text
                  className="text-base font-bold"
                  style={{ color: isHit ? colors.success : colors.textPrimary }}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GameShell>
  );
}
