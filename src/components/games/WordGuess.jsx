import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 120;
const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Words with rich descriptive hints and categories to make guessing intuitive and fun.
 */
const WORDS = [
  // Food & Drinks
  { word: 'BIRYANI', category: '🍛 Food & Cuisine', hint: 'Fragrant spiced rice dish cooked with herbs & aroma' },
  { word: 'CHOCOLATE', category: '🍫 Sweets & Treats', hint: 'Delicious sweet brown treat made from roasted cocoa' },
  { word: 'PIZZA', category: '🍕 Food & Snacks', hint: 'Cheesy oven-baked crust loaded with savoury toppings' },
  { word: 'BURGER', category: '🍔 Fast Food', hint: 'Juicy patty layered with fresh veggies in a round bun' },
  { word: 'COFFEE', category: '☕ Beverages', hint: 'Popular morning drink brewed from roasted dark beans' },
  { word: 'MANGO', category: '🥭 Fruits', hint: 'Sweet yellow summer fruit known as the King of Fruits' },
  { word: 'SAMOSA', category: '🥟 Crispy Snacks', hint: 'Triangular fried crispy pastry filled with spiced potatoes' },

  // Sports & Games
  { word: 'CRICKET', category: '🏏 Sports', hint: 'Bat & ball game played on pitch with wickets & overs' },
  { word: 'FOOTBALL', category: '⚽ Sports', hint: 'World game played on grass kicking ball into goal post' },
  { word: 'CHESS', category: '♟️ Board Game', hint: 'Strategic board game with King, Queen, Knights & Pawns' },
  { word: 'TENNIS', category: '🎾 Racket Sport', hint: 'Game played over a net with rackets & fuzzy yellow ball' },
  { word: 'BADMINTON', category: '🏸 Racket Sport', hint: 'Fast indoor game played with feathered shuttlecock' },

  // Music & Entertainment
  { word: 'GUITAR', category: '🎸 Music', hint: 'String instrument played by strumming or plucking' },
  { word: 'PIANO', category: '🎹 Instruments', hint: 'Musical instrument with 88 black and white keys' },
  { word: 'DRUMS', category: '🥁 Rhythm & Beats', hint: 'Percussion instrument struck with wooden drumsticks' },
  { word: 'CINEMA', category: '🎬 Entertainment', hint: 'Movie theatre with large screen and popcorn' },

  // Nature & Animals
  { word: 'ELEPHANT', category: '🐘 Wildlife', hint: 'Largest land mammal with big ears & long trunk' },
  { word: 'DOLPHIN', category: '🐬 Ocean Life', hint: 'Intelligent friendly sea mammal known for high flips' },
  { word: 'RAINBOW', category: '🌈 Sky & Nature', hint: 'Arch of seven vibrant colours appearing after rainfall' },
  { word: 'MONSOON', category: '🌧️ Weather Season', hint: 'Rainy season bringing cloudy skies and cool showers' },
  { word: 'MOUNTAIN', category: '⛰️ Landscapes', hint: 'Giant natural elevation of the earth with snowy peaks' },
  { word: 'BUTTERFLY', category: '🦋 Insects', hint: 'Beautiful winged insect with colourful patterned wings' },
  { word: 'SUNRISE', category: '🌅 Daily Sky', hint: 'Morning moment when golden sun rises on horizon' },
  { word: 'PEACOCK', category: '🦚 Birds', hint: 'Graceful bird famous for dancing with eye-spotted feathers' },

  // Objects & Daily Life
  { word: 'CAMERA', category: '📸 Technology', hint: 'Device used to take photos and record memories' },
  { word: 'DIAMOND', category: '💎 Precious Gems', hint: 'Hardest sparkling gemstone used in rings and jewellery' },
  { word: 'LIBRARY', category: '📚 Books & Study', hint: 'Quiet building with shelves full of books to read' },
  { word: 'AIRPLANE', category: '✈️ Travel', hint: 'Large winged vehicle flying through clouds across cities' },
  { word: 'PAINTING', category: '🎨 Fine Arts', hint: 'Artwork created on canvas using brushes and colours' },
  { word: 'SMARTPHONE', category: '📱 Gadgets', hint: 'Touchscreen handheld phone used for calls and apps' },
  { word: 'FESTIVAL', category: '🎉 Celebrations', hint: 'Joyful holiday celebration with lights and sweets' },
  { word: 'FRIEND', category: '👥 Relationships', hint: 'Someone you cherish sharing laughs, chats & secrets' },
  { word: 'WINTER', category: '❄️ Seasons', hint: 'Coldest time of year with sweaters, fog & hot tea' },
  { word: 'PUZZLE', category: '🧩 Brain Games', hint: 'Mind game of fitting interlocking pieces together' },
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

  function guess(letter) {
    if (guessed.includes(letter) || isComplete || isOut) return;

    const isHit = target.word.includes(letter);
    const nextGuessed = [...guessed, letter];
    setGuessed(nextGuessed);

    if (isHit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      if (letters.every((l) => nextGuessed.includes(l))) {
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
      setTimeout(() => {
        setTarget(pickWord());
        setGuessed([]);
        setWrong(0);
      }, 1400);
    }
  }

  function revealHintLetter() {
    const unrevealed = target.word.split('').filter((l) => !guessed.includes(l));
    if (unrevealed.length === 0) return;
    const randomLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    guess(randomLetter);
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
        text: 'Guess the hidden word using the clue and category. Tap "Reveal 1 Letter" if you get stuck!',
      }}
      stats={[
        { label: 'score', value: score },
        { label: 'seconds', value: secondsLeft, color: secondsLeft <= 20 ? colors.danger : undefined },
        { label: 'solved', value: solved },
      ]}
    >
      <View className="flex-1 justify-between px-4 pb-4">
        <View className="items-center pt-2">
          {/* Helpful Category & Clue Card */}
          <View
            className="w-full px-4 py-3 rounded-2xl border shadow-sm items-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            {/* Category Badge */}
            <View
              className="px-3 py-1 rounded-full mb-1.5"
              style={{ backgroundColor: `${colors.primary}18` }}
            >
              <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.primary }}>
                {target.category || '💡 Word Clue'}
              </Text>
            </View>

            {/* Hint Clue Text */}
            <Text
              className="text-xs font-semibold text-center leading-4"
              style={{ color: colors.textPrimary }}
            >
              "{target.hint}"
            </Text>

            {/* Reveal Letter Clue Button */}
            {!isComplete && !isOut && (
              <Pressable
                onPress={revealHintLetter}
                accessibilityRole="button"
                className="mt-2.5 flex-row items-center gap-1 px-3 py-1 rounded-full border shadow-sm active:scale-95 transition"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="bulb" size={13} color={colors.warning || '#F5A524'} />
                <Text className="text-[11px] font-bold" style={{ color: colors.textSecondary }}>
                  Reveal 1 Letter Hint
                </Text>
              </Pressable>
            )}
          </View>

          {/* Letter Slots */}
          <View className="mt-4 flex-row flex-wrap justify-center">
            {target.word.split('').map((letter, index) => {
              const isRevealed = guessed.includes(letter) || isOut;

              return (
                <View
                  key={`${letter}-${index}`}
                  className="m-1 items-center justify-center shadow-sm"
                  style={{
                    width: 34,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: isRevealed ? colors.surface : colors.surfaceAlt,
                    borderBottomWidth: 3,
                    borderBottomColor: isOut && !guessed.includes(letter) ? colors.danger : colors.primary,
                  }}
                >
                  <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>
                    {isRevealed ? letter : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Wrong Guesses Bar */}
          <View className="mt-3 flex-row gap-1.5">
            {Array.from({ length: MAX_WRONG }).map((_, index) => (
              <View
                key={index}
                className="h-2 w-6 rounded-full"
                style={{ backgroundColor: index < wrong ? colors.danger : colors.border }}
              />
            ))}
          </View>

          {isComplete ? (
            <Text className="mt-2 text-sm font-black" style={{ color: colors.success || '#10B981' }}>
              🎉 Solved!
            </Text>
          ) : null}
        </View>

        {/* Alphabet Keyboard */}
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
                className="m-1 items-center justify-center active:scale-95 transition shadow-sm"
                style={{
                  width: 34,
                  height: 42,
                  borderRadius: radius - 2,
                  backgroundColor: isUsed
                    ? isHit
                      ? `${colors.success || '#10B981'}33`
                      : colors.surfaceAlt
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isUsed ? 'transparent' : colors.border,
                  opacity: isUsed && !isHit ? 0.35 : 1,
                }}
              >
                <Text
                  className="text-base font-black"
                  style={{ color: isHit ? (colors.success || '#10B981') : colors.textPrimary }}
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
