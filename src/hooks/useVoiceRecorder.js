import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

/** A voice note is a remark, not a monologue. */
export const MAX_VOICE_SECONDS = 120;

/**
 * Anything shorter than this is a mis-tap, not a message.
 *
 * Hold-to-record turns every stray tap on the microphone into a recording, and
 * sending a 0.2-second file helps nobody. Below the floor the recording is
 * discarded and the caller is told why.
 */
const MIN_VOICE_SECONDS = 1;

/**
 * Hold-to-record voice notes.
 *
 * Recording state lives here rather than in the composer so the screen deals
 * in "start / stop / cancel" and never in audio-session details. The recorder
 * is stopped on unmount whatever happens: leaving a room mid-recording must
 * not leave the microphone hot.
 */
export function useVoiceRecorder({ onError } = {}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [isPreparing, setIsPreparing] = useState(false);
  const isCancelledRef = useRef(false);
  const isRecordingRef = useRef(false);

  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);
  const isRecording = recorderState.isRecording;

  /*
   * The cleanup below must not re-run every time recording starts or stops —
   * it would stop the recorder it was meant to protect. So the flag is mirrored
   * into a ref that the unmount handler reads, keeping the effect's
   * dependencies down to the recorder itself.
   */
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(
    () => () => {
      // The hook is unmounting — a screen change, a back gesture, a crash on
      // the way out. Whatever the reason, stop holding the microphone.
      if (isRecordingRef.current) recorder.stop().catch(() => undefined);
    },
    [recorder],
  );

  const start = useCallback(async () => {
    if (isRecording || isPreparing) return false;

    setIsPreparing(true);
    isCancelledRef.current = false;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onError?.('Allow microphone access to send a voice note.');
        return false;
      }

      // iOS records nothing at all in silent mode unless this is set, which
      // looks exactly like a broken button to whoever has their ringer off.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch {
      onError?.('Could not start recording.');
      return false;
    } finally {
      setIsPreparing(false);
    }
  }, [isPreparing, isRecording, onError, recorder]);

  /**
   * Stops and hands back the file, or null if there is nothing worth sending.
   *
   * The audio session is handed back to playback either way — leaving
   * `allowsRecording` on ducks every later sound on iOS, so a missed reset is
   * heard for the rest of the session, not just the next second.
   */
  const stop = useCallback(async () => {
    if (!isRecording) return null;

    const recordedSeconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

    try {
      await recorder.stop();
    } catch {
      onError?.('Recording failed.');
      return null;
    } finally {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => undefined);
    }

    if (isCancelledRef.current) return null;

    if (recordedSeconds < MIN_VOICE_SECONDS) {
      onError?.('Hold the button to record.');
      return null;
    }

    const uri = recorder.uri;
    if (!uri) return null;

    return { uri, durationSeconds: recordedSeconds };
  }, [isRecording, onError, recorder, recorderState.durationMillis]);

  /** Throw the recording away — a slide-off, or a change of mind. */
  const cancel = useCallback(async () => {
    isCancelledRef.current = true;
    if (isRecording) await stop();
  }, [isRecording, stop]);

  return {
    isRecording,
    isPreparing,
    seconds,
    /** Drives the level meter; expo reports dBFS, so it needs normalising. */
    metering: recorderState.metering ?? null,
    start,
    stop,
    cancel,
    maxSeconds: MAX_VOICE_SECONDS,
  };
}
