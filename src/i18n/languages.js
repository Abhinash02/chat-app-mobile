/**
 * The languages the app interface is available in.
 *
 * Every entry here needs a matching block in `translations.js` — `setLanguage`
 * silently ignores a code it has no translations for, so an unbacked entry
 * renders a chip that does nothing when tapped.
 *
 * Ordered by reach rather than alphabetically: the picker is a horizontal strip
 * and the first few are the ones most people are looking for.
 */
export const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    emoji: '🇬🇧',
    region: 'UK / Global',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'भारत',
  },
  {
    code: 'pa',
    label: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'ਪੰਜਾਬ',
  },
  {
    code: 'hinglish',
    label: 'Hinglish',
    nativeName: 'Hinglish',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'Desi Vibe',
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'महाराष्ट्र',
  },
  {
    code: 'gu',
    label: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'ગુજરાત',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'পশ্চিমবঙ্গ',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'தமிழ்நாடு',
  },
  {
    code: 'te',
    label: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'ఆంధ్ర / తెలంగాణ',
  },
  {
    code: 'kn',
    label: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'ಕರ್ನಾಟಕ',
  },
  {
    code: 'ml',
    label: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    emoji: '🇮🇳',
    region: 'കേരളം',
  },
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageMeta(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
