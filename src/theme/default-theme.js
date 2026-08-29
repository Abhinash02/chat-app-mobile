/**
 * Bundled fallback palette.
 *
 * The app fetches its real theme from the server, but it must render before
 * that request finishes — and must keep rendering if it never does. These
 * values match the backend's "Blush" preset so a cold start looks the same as a
 * warm one, and an offline launch is not a blank screen.
 */
export const DEFAULT_COLORS = Object.freeze({
  primary: '#FF4E88',
  primaryDark: '#D62E68',
  primaryLight: '#FF8FB3',
  onPrimary: '#FFFFFF',
  secondary: '#7C4DFF',
  accent: '#00D0C0',
  background: '#FFF7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FDEDF3',
  border: '#F3D7E2',
  textPrimary: '#1B1024',
  textSecondary: '#5C4A63',
  textMuted: '#9C8AA6',
  success: '#1FBF75',
  warning: '#F5A524',
  danger: '#F5325B',
  info: '#3B82F6',
  gradientStart: '#FF4E88',
  gradientEnd: '#7C4DFF',
  maleAccent: '#3B82F6',
  femaleAccent: '#FF4E88',
  onlineDot: '#22C55E',
  offlineDot: '#B9AFC0',
  coinGold: '#FFB020',
});

export const DEFAULT_BRANDING = Object.freeze({
  appName: 'Vibe',
  tagline: 'Say hi to someone new',
  logoUrl: '',
  splashImageUrl: '',
  borderRadius: 18,
  fontFamily: 'System',
});

export const DEFAULT_THEME = Object.freeze({
  slug: 'blush',
  name: 'Blush',
  isDark: false,
  colors: DEFAULT_COLORS,
  branding: DEFAULT_BRANDING,
});
