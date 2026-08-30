import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { gamesApi } from '../api/endpoints.js';
import { useSounds } from './useSounds.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * The start/score/submit cycle every mini game shares.
 *
 * The score is computed in the app, which is unavoidable for a game rendered
 * entirely on the phone. The server does not trust it: it bounds the score,
 * the elapsed time and the number of games per day. Each game's round length
 * is chosen to sit comfortably inside those bounds.
 *
 * Phases: ready -> playing -> submitting -> finished. `submitting` exists so a
 * final move lands before the score is read — submitting from the timer
 * callback would send the score as it was one tick earlier.
 */
export function useGameSession({ gameKey, onStart, onExit }) {
  const { playCoin } = useSounds();
  const toast = useToast();

  const [phase, setPhase] = useState('ready');
  const [result, setResult] = useState(null);

  const sessionRef = useRef(null);
  const submittedForRef = useRef(null);

  const start = useMutation({
    mutationFn: () => gamesApi.start(gameKey),
    onSuccess: (session) => {
      sessionRef.current = session.sessionId;
      submittedForRef.current = null;
      setResult(null);
      setPhase('playing');
      onStart?.();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Could not start the game');
      onExit?.();
    },
  });

  const submit = useMutation({
    mutationFn: (finalScore) => gamesApi.complete(sessionRef.current, finalScore),
    onSuccess: (outcome) => {
      setResult(outcome);
      setPhase('finished');
      if (outcome.pointsAwarded > 0) playCoin();
    },
    onError: (error) => {
      // The round is over either way; the player should see what they scored
      // even when the server would not record it.
      toast.error(error.message ?? 'Could not save your score');
      setPhase('finished');
    },
  });

  /** Guarded so a re-render during `submitting` cannot send the score twice. */
  const finish = useCallback(
    (finalScore) => {
      if (submittedForRef.current === sessionRef.current) return;
      submittedForRef.current = sessionRef.current;
      submit.mutate(finalScore);
    },
    [submit],
  );

  return {
    phase,
    setPhase,
    result,
    startGame: start.mutate,
    isStarting: start.isPending,
    finish,
    isSubmitting: submit.isPending,
  };
}
