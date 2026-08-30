import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

/**
 * The device's coordinates, asked for only when something actually needs them.
 *
 * Requesting on mount would put a permission prompt in front of someone who
 * opened the app to read a message. This is called from the control that turns
 * a nearby filter on, so the prompt arrives with a reason attached.
 *
 * Coordinates are held in memory for the session rather than persisted: a
 * stale location is worse than none for "what is near me right now", and
 * storing someone's position is not something to do casually.
 */
export function useDeviceLocation() {
  const [coords, setCoords] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission is off. Turn it on in settings to see what is nearby.');
        return null;
      }

      // Balanced accuracy: city-level is all a radius search needs, and the
      // high-accuracy fix costs seconds and battery for no benefit here.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoords(next);
      return next;
    } catch {
      setError('Could not read your location. Try again in a moment.');
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setError(null);
  }, []);

  return { coords, request, clear, isRequesting, error };
}
