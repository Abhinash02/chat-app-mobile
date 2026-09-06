import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameShell } from './GameShell.jsx';
import { useGameSession } from '../../hooks/useGameSession.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

const PADS = [
  { id: 0, color: '#EF4444' },
  { id: 1, color: '#3B82F6' },
  { id: 2, color: '#22C55E' },
  { id: 3, color: '#F59E0B' },
];

const FLASH_MS = 460;
const GAP_MS = 200;

/**
 * Memory Sequence: watch the pattern, then repeat it.
 *
 * The sequence grows by one pad each round, so the difficulty curve is the
 * game rather than a timer. One wrong pad ends the run — that is what makes
 * reaching round nine mean something.
 */
export function MemorySequence({ game, onExit }) {
  const { colors, radius } = useTheme();

  const [sequence, setSequence] = useState([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [litPad, setLitPad] = useState(null);
  const [isShowing, setIsShowing] = useState(false);
  const [round, setRound] = useState(0);

  /*
   * Every pending flash timer, so leaving mid-pattern cannot set state on a
   * component that is already gone.
   */
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
     * The first pattern is seeded here rather than from an effect watching
     * `round === 0`. Starting a round *is* the event, so an effect would be
     * reacting to state it had just set — the cascading-render pattern the
     * React Compiler lint rejects.
     */
    onStart: () => {
      clearTimers();
      setSequence([Math.floor(Math.random() * PADS.length)]);
      setInputIndex(0);
      setLitPad(null);
      setRound(1);
    },
  });

  /** Plays the pattern back, then hands control to the player. */
  const playSequence = useCallback(
    (pattern) => {
      clearTimers();

      /*
       * Every state change here is scheduled, including this first one.
       *
       * Setting `isShowing` synchronously worked, but it happened inside the
       * effect that starts a round — a synchronous setState in an effect, which
       * the React Compiler lint flags as a cascading render. The whole function
       * is already a timeline of timed changes, so putting the first one on the
       * same timeline at t=0 is consistent and behaves identically.
       */
      timersRef.current.push(setTimeout(() => setIsShowing(true), 0));

      pattern.forEach((padId, position) => {
        timersRef.current.push(
          setTimeout(() => setLitPad(padId), position * (FLASH_MS + GAP_MS)),
        );
        timersRef.current.push(
          setTimeout(() => setLitPad(null), position * (FLASH_MS + GAP_MS) + FLASH_MS),
        );
      });

      timersRef.current.push(
        setTimeout(() => {
          setIsShowing(false);
          setInputIndex(0);
        }, pattern.length * (FLASH_MS + GAP_MS)),
      );
    },
    [clearTimers],
  );

  // A new round starts by extending the pattern and showing it.
  useEffect(() => {
    if (phase !== 'playing' || sequence.length !== round || round === 0) return;
    playSequence(sequence);
  }, [phase, round, sequence, playSequence]);

  useEffect(() => {
    if (phase !== 'submitting') return;
    // Rounds completed, not pads tapped: 40 a round rewards depth, and the
    // ceiling is reached by genuinely remembering ten in a row.
    finish(Math.max(0, (round - 1) * 40));
  }, [phase, round, finish]);

  function handlePad(padId) {
    if (isShowing || phase !== 'playing') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setLitPad(padId);
    timersRef.current.push(setTimeout(() => setLitPad(null), 160));

    if (sequence[inputIndex] !== padId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setPhase('submitting');
      return;
    }

    const next = inputIndex + 1;

    if (next < sequence.length) {
      setInputIndex(next);
      return;
    }

    // Pattern repeated in full: extend it and show the longer one.
    timersRef.current.push(
      setTimeout(() => {
        setSequence((current) => [...current, Math.floor(Math.random() * PADS.length)]);
        setRound((current) => current + 1);
      }, 420),
    );
  }

  return (
    <GameShell
      title={game.name}
      phase={phase}
      result={result}
      onExit={onExit}
      onStart={startGame}
      isStarting={isStarting}
      howToPlay="Watch the pads light up, then tap them back in the same order. The pattern gets one longer every round. One wrong pad ends the run."
      stats={[
        { label: 'Round', value: round },
        { label: 'Length', value: sequence.length },
        { label: 'Step', value: isShowing ? '—' : `${inputIndex + 1}` },
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: isShowing ? colors.primary : colors.textMuted,
            marginBottom: 22,
          }}
        >
          {isShowing ? 'WATCH THE PATTERN…' : 'YOUR TURN — REPEAT IT'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center' }}>
          {PADS.map((pad) => {
            const isLit = litPad === pad.id;
            return (
              <Pressable
                key={pad.id}
                onPress={() => handlePad(pad.id)}
                disabled={isShowing}
                accessibilityRole="button"
                accessibilityLabel={`Pad ${pad.id + 1}`}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: radius + 10,
                  backgroundColor: pad.color,
                  // Lit pads brighten rather than change colour, so the pattern
                  // is legible to someone who cannot separate the four hues.
                  opacity: isLit ? 1 : 0.35,
                  transform: [{ scale: isLit ? 1.04 : 1 }],
                  shadowColor: pad.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isLit ? 0.5 : 0,
                  shadowRadius: 12,
                  elevation: isLit ? 6 : 0,
                }}
              />
            );
          })}
        </View>
      </View>
    </GameShell>
  );
}

export default MemorySequence;
