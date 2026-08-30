import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { Button, Card, GradientButton } from '../ui.jsx';
import { gamesApi } from '../../api/endpoints.js';
import { useSounds } from '../../hooks/useSounds.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useToast } from '../Toast.jsx';

const ROUND_SECONDS = 20;
const TARGET_SIZE = 76;

/**
 * Quick Tap: hit the target before it moves.
 *
 * The score is computed here and sent to the server, which is unavoidable for a
 * game rendered entirely in the app. The server does not trust it — it bounds
 * the score, the elapsed time and the number of games per day. The round length
 * here is chosen to sit comfortably inside those bounds.
 */
export function TapGame({ game, onExit }) {
  const { colors, radius } = useTheme();
  const { playCoin } = useSounds();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState('ready');
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [target, setTarget] = useState({ top: 0.4, left: 0.4 });
  const [result, setResult] = useState(null);

  const sessionRef = useRef(null);

  // The play area's measured size is state, not a ref: the target's position
  // is computed from it during render, and a ref would not trigger the
  // re-render that repositions the target after layout.
  const [area, setArea] = useState({ width: 300, height: 400 });

  const moveTarget = useCallback(() => {
    // Kept away from the very edges so the target is never half off-screen or
    // under a thumb resting on the bezel.
    setTarget({ top: 0.08 + Math.random() * 0.74, left: 0.06 + Math.random() * 0.72 });
  }, []);

  const startSession = useMutation({
    mutationFn: () => gamesApi.start(game.key),
    onSuccess: (session) => {
      sessionRef.current = session.sessionId;
      setPhase('playing');
      setScore(0);
      setSecondsLeft(ROUND_SECONDS);
      moveTarget();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Could not start the game');
      onExit();
    },
  });

  const submitScore = useMutation({
    mutationFn: (finalScore) => gamesApi.complete(sessionRef.current, finalScore),
    onSuccess: (outcome) => {
      setResult(outcome);
      setPhase('finished');
      if (outcome.pointsAwarded > 0) playCoin();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Could not save your score');
      setPhase('finished');
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
  }, [phase]);

  // Submitting is its own phase so the final tap is counted before the score
  // is read. The mutation is fired from the phase change rather than the timer
  // callback, which would still be holding the previous score.
  const submittedForRef = useRef(null);

  useEffect(() => {
    if (phase !== 'submitting' || submittedForRef.current === sessionRef.current) return;
    submittedForRef.current = sessionRef.current;
    submitScore.mutate(score);
  }, [phase, score, submitScore]);

  function handleHit() {
    setScore((current) => current + 1);
    moveTarget();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Leave the game">
          <Text className="text-base" style={{ color: colors.textSecondary }}>
            ✕ Leave
          </Text>
        </Pressable>

        <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
          {game.name}
        </Text>

        <View
          className="px-3 py-1"
          style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
        >
          <Text className="text-sm font-bold" style={{ color: colors.primary }}>
            {score}
          </Text>
        </View>
      </View>

      {phase === 'ready' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl">⚡</Text>
          <Text className="mt-4 text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Quick Tap
          </Text>
          <Text className="mt-2 text-center text-sm leading-5" style={{ color: colors.textMuted }}>
            Tap the circle as many times as you can in {ROUND_SECONDS} seconds. It moves every time
            you hit it.
          </Text>

          <GradientButton
            title="Start"
            className="mt-7 w-full"
            isLoading={startSession.isPending}
            onPress={() => startSession.mutate()}
          />
        </View>
      ) : null}

      {phase === 'playing' || phase === 'submitting' ? (
        <>
          <View className="px-4 pb-2">
            <View
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.surfaceAlt }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: secondsLeft <= 5 ? colors.danger : colors.primary,
                  width: `${(secondsLeft / ROUND_SECONDS) * 100}%`,
                }}
              />
            </View>
            <Text className="mt-1.5 text-center text-xs" style={{ color: colors.textMuted }}>
              {secondsLeft}s left
            </Text>
          </View>

          <View
            className="flex-1 m-4"
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius }}
            onLayout={(event) => setArea(event.nativeEvent.layout)}
          >
            {phase === 'playing' ? (
              <Pressable
                onPress={handleHit}
                accessibilityRole="button"
                accessibilityLabel="Tap the target"
                style={{
                  position: 'absolute',
                  top: target.top * (area.height - TARGET_SIZE),
                  left: target.left * (area.width - TARGET_SIZE),
                  width: TARGET_SIZE,
                  height: TARGET_SIZE,
                  borderRadius: TARGET_SIZE / 2,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 30 }}>👆</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}

      {phase === 'finished' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl">{result?.pointsAwarded > 0 ? '🎉' : '😅'}</Text>

          <Text className="mt-4 text-3xl font-bold" style={{ color: colors.textPrimary }}>
            {score} taps
          </Text>

          {result ? (
            <Card className="mt-5 w-full">
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  Points earned
                </Text>
                <Text className="text-base font-bold" style={{ color: colors.primary }}>
                  +{result.pointsAwarded}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  Your total
                </Text>
                <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                  {result.totalPoints}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1">
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  Your rank
                </Text>
                <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                  #{result.rank}
                </Text>
              </View>

              {result.coinsEarned > 0 ? (
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-sm" style={{ color: colors.textMuted }}>
                    Coins earned
                  </Text>
                  <Text className="text-base font-bold" style={{ color: colors.coinGold }}>
                    +{result.coinsEarned} 🪙
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          <GradientButton
            title="Play again"
            className="mt-6 w-full"
            isLoading={startSession.isPending}
            onPress={() => {
              setResult(null);
              startSession.mutate();
            }}
          />

          <Button title="Back to games" variant="ghost" className="mt-2 w-full" onPress={onExit} />
        </View>
      ) : null}
    </View>
  );
}
