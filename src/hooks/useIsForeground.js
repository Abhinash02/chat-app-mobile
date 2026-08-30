import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Whether the app is actually in front of the person using it.
 *
 * Billed time has to follow this. A phone locked mid-conversation, or the app
 * swiped away, is not someone chatting — and JavaScript timers do not reliably
 * stop on their own when an app is backgrounded, so an interval left running
 * would keep spending an allowance nobody was using.
 *
 * On web there is no AppState 'background', so visibilitychange covers the
 * same ground: a hidden tab is a backgrounded app.
 */
export function useIsForeground() {
  const [isForeground, setIsForeground] = useState(AppState.currentState !== 'background');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });

    // `inactive` on iOS covers the app switcher and an incoming call — a brief
    // limbo that is not backgrounded but is not being used either.
    return () => subscription.remove();
  }, []);

  return isForeground;
}
