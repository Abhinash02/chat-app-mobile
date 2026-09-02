/**
 * Supported app languages with metadata.
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
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageMeta(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
