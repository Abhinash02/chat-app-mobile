import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SOUND_SOURCES = {
  message: require('../../assets/sounds/message.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  sent: require('../../assets/sounds/sent.wav'),
};

const SoundContext = createContext(null);

/**
 * In-app sound effects.
 *
 * `createAudioPlayer` rather than the `useAudioPlayer` hook: these players are
 * shared app-wide and must outlive whichever screen happens to trigger them —
 * a chime should not be cut off because the chat screen unmounted. They are
 * created once, lazily, and live for the session.
 *
 * Every call is silent-failing on purpose. Audio is decoration; a device that
 * refuses to play a chime must not take a screen down with it.
 */
export function SoundProvider({ children }) {
  const playersRef = useRef({});
  const isEnabledRef = useRef(true);
  const isConfiguredRef = useRef(false);

  const configureOnce = useCallback(async () => {
    if (isConfiguredRef.current) return;
    isConfiguredRef.current = true;

    try {
      // Notification chimes should respect the ringer switch rather than
      // talking over it, and must not stop the user's music.
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
    } catch {
      // Older or restricted devices; the defaults are acceptable.
    }
  }, []);

  const getPlayer = useCallback((name) => {
    if (!playersRef.current[name]) {
      try {
        playersRef.current[name] = createAudioPlayer(SOUND_SOURCES[name]);
      } catch {
        return null;
      }
    }
    return playersRef.current[name];
  }, []);

  const play = useCallback(
    async (name, { haptic = null } = {}) => {
      if (!isEnabledRef.current || !SOUND_SOURCES[name]) return;

      await configureOnce();

      try {
        const player = getPlayer(name);
        if (player) {
          // Rewind first: a rapid burst of messages should chime each time,
          // not fall silent because the player is already at the end.
          player.seekTo(0);
          player.play();
        }
      } catch {
        // Ignore — see above.
      }

      if (haptic) {
        Haptics.notificationAsync(haptic).catch(() => undefined);
      }
    },
    [configureOnce, getPlayer],
  );

  const value = useMemo(
    () => ({
      playMessage: () => play('message'),
      playCoin: () => play('coin', { haptic: Haptics.NotificationFeedbackType.Success }),
      playSent: () => play('sent'),
      /** Mirrors the account's `preferences.soundEnabled`. */
      setEnabled: (enabled) => {
        isEnabledRef.current = enabled;
      },
    }),
    [play],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSounds() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSounds must be used inside a SoundProvider');
  return context;
}
