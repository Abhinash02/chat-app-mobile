import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

/**
 * `LinearGradient` with NativeWind's `className` wired up.
 *
 * NativeWind maps className to style automatically for React Native's own
 * components, but a third-party component has to be registered — otherwise the
 * prop is passed straight through and silently ignored, which is exactly what
 * happened here: the welcome screen's centring classes did nothing and the
 * title rendered clipped against the left edge.
 *
 * Registering once, here, means every screen imports a gradient that already
 * behaves like the rest of the UI.
 */
export const Gradient = cssInterop(LinearGradient, {
  className: 'style',
});
