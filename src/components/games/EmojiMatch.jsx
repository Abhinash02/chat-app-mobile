import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const ROUND_SECONDS = 90;
const PAIRS = 8;

const FACES = ['🦊', '🐯', '🦁', '🐼', '🐨', '🦄', '🐸', '🐙', '🦋', '🐢', '🦉', '🐬'];

/** A shuffled deck of matched pairs. */
function makeDeck() {
  const chosen = [...FACES].sort(() => Math.random() - 0.5).slice(0, PAIRS);

  return [...chosen, ...chosen]
    .map((emoji, index) => ({ id: index, emoji, isMatched: false }))
    .sort(() => Math.random() - 0.5);
}

/**
 * Emoji Match: turn over pairs before the timer runs out.
 *
 * Two cards stay face up briefly on a miss, which is the whole game — flipping
 * them back instantly would leave nothing to remember.
 */
export function EmojiMatch({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [deck, setDeck] = useState(makeDeck);
  const [flipped, setFlipped] = useState([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  const { phase, setPhase, result, startGame, isStarting, finish } = useGameSession({
    gameKey: game.key,
    onExit,
    onStart: () => {
      setDeck(makeDeck());
      setFlipped([]);
      setMatchedCount(0);
      setMoves(0);
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
     * Score rewards both completion and efficiency: 40 per pair, plus what is
     * left on the clock, minus a small penalty for wasted turns. A perfect
     * board lands near the server's ceiling for this game; flailing does not.
     */
    const efficiency = Math.max(0, PAIRS * 2 - Math.max(0, moves - PAIRS)) * 4;
    finish(matchedCount * 40 + secondsLeft + efficiency);
  }, [phase, matchedCount, secondsLeft, moves, finish]);

  // Any pending flip-back is cancelled on unmount, so leaving mid-round cannot
  // set state on a component that is gone.
  const flipBackRef = useRef(null);
  useEffect(() => () => clearTimeout(flipBackRef.current), []);

  /**
   * A pair is resolved here rather than in an effect watching `flipped`,
   * because the tap is what causes it. That also lets the last pair end the
   * round directly — finishing early is the reward for playing well, so the
   * player should not have to wait out the clock.
   */
  function flip(index) {
    if (flipped.length === 2 || flipped.includes(index) || deck[index].isMatched) return;

    const next = [...flipped, index];
    setFlipped(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    if (next.length < 2) return;

    setMoves((current) => current + 1);

    const [first, second] = next;

    if (deck[first].emoji !== deck[second].emoji) {
      // Long enough to memorise, short enough not to feel like a punishment.
      flipBackRef.current = setTimeout(() => setFlipped([]), 700);
      return;
    }

    setDeck((current) =>
      current.map((card, cardIndex) =>
        cardIndex === first || cardIndex === second ? { ...card, isMatched: true } : card,
      ),
    );
    setFlipped([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    const cleared = matchedCount + 1;
    setMatchedCount(cleared);
    if (cleared === PAIRS) setPhase('submitting');
  }

  return (
    <GameShell
      title="Emoji Match"
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay={{
        emoji: '🃏',
        text: 'Flip two cards at a time and find every matching pair. Finish early and the time you save counts towards your score.',
      }}
      stats={[
        { label: 'pairs', value: `${matchedCount}/${PAIRS}` },
        { label: 'seconds', value: secondsLeft, color: secondsLeft <= 15 ? colors.danger : undefined },
        { label: 'moves', value: moves },
      ]}
    >
      <View className="flex-1 flex-row flex-wrap content-center justify-center px-4">
        {deck.map((card, index) => {
          const isFaceUp = card.isMatched || flipped.includes(index);

          return (
            <Pressable
              key={card.id}
              onPress={() => flip(index)}
              accessibilityRole="button"
              accessibilityLabel={isFaceUp ? `${card.emoji} card` : 'Face down card'}
              className="m-1.5 items-center justify-center"
              style={{
                width: '21%',
                aspectRatio: 0.82,
                borderRadius: radius,
                backgroundColor: isFaceUp ? colors.surface : colors.primary,
                borderWidth: 2,
                borderColor: card.isMatched ? colors.success : colors.border,
                opacity: card.isMatched ? 0.55 : 1,
              }}
            >
              <Text style={{ fontSize: 30 }}>{isFaceUp ? card.emoji : '❓'}</Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}
