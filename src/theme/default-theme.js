/**
 * Bundled fallback palette.
 *
 * Built around a single dominant brand colour the way WhatsApp and Instagram
 * are: one hue carries every primary action, active state and accent, and
 * everything else is a neutral or a status colour. Spreading three or four
 * competing brand hues across a screen is what makes an app look assembled
 * rather than designed.
 */
export const DEFAULT_COLORS = Object.freeze({
  primary: '#06B6D4',
  primaryDark: '#0891B2',
  primaryLight: '#67E8F9',
  onPrimary: '#FFFFFF',
  secondary: '#0E7490',
  accent: '#22D3EE',
  background: '#F6FDFE',
  surface: '#FFFFFF',
  surfaceAlt: '#ECFAFC',
  border: '#D7EEF3',
  textPrimary: '#0B2027',
  textSecondary: '#41616B',
  textMuted: '#8AA5AD',
  success: '#1FBF75',
  warning: '#F5A524',
  danger: '#F5325B',
  info: '#3B82F6',
  /* Kept in the same family so the gradient reads as one colour with depth,
     not as two brands meeting in the middle. */
  gradientStart: '#06B6D4',
  gradientEnd: '#0E7490',
  maleAccent: '#0EA5E9',
  femaleAccent: '#F472B6',
  onlineDot: '#22C55E',
  offlineDot: '#B4C6CC',
  coinGold: '#FFB020',
  chatBubbleIncoming: '#FFFFFF',
  chatBubbleIncomingText: '#0B2027',
  chatBubbleOutgoing: '#06B6D4',
  chatBubbleOutgoingText: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#06B6D4',
  tabBarInactive: '#8AA5AD',
  cardBackground: '#FFFFFF',
  inputBackground: '#F2FBFC',
  inputBorder: '#D7EEF3',
  vipGold: '#FFD700',
  freeTalkBadge: '#06B6D4',
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
