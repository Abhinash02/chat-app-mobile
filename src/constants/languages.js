/**
 * Languages someone can say they are comfortable talking in.
 *
 * A deliberate mirror of SPOKEN_LANGUAGES in the backend's
 * `src/common/constants/index.js`. It lives here rather than being fetched
 * because the first screen that needs it is signup — which runs before there
 * is a token to fetch anything with, and where a spinner over the language
 * step would be the worst place in the app to wait.
 *
 * The backend validates every submitted code against its own list, so the
 * worst a stale copy here can do is offer an option the server rejects with a
 * clear message. Keep the two in step when adding a language.
 */
export const LANGUAGES = Object.freeze([
  { code: 'hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'english', label: 'English', native: 'English' },
  { code: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'marathi', label: 'Marathi', native: 'मराठी' },
  { code: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { code: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'odia', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'urdu', label: 'Urdu', native: 'اردو' },
  { code: 'assamese', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'bhojpuri', label: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'rajasthani', label: 'Rajasthani', native: 'राजस्थानी' },
  { code: 'haryanvi', label: 'Haryanvi', native: 'हरियाणवी' },
]);

/** Matches MAX_LANGUAGES_PER_USER on the server. */
export const MAX_LANGUAGES = 5;

const BY_CODE = new Map(LANGUAGES.map((entry) => [entry.code, entry]));

/** "Hindi" for a known code; the raw code for one this build has not heard of. */
export function languageLabel(code) {
  return BY_CODE.get(code)?.label ?? code;
}

/** "हिन्दी · ਪੰਜਾਬੀ" — for showing what someone speaks on their profile. */
export function languageNativeList(codes, separator = ' · ') {
  if (!Array.isArray(codes) || codes.length === 0) return '';
  return codes.map((code) => BY_CODE.get(code)?.native ?? code).join(separator);
}

/**
 * ISO language subtag → the codes this app stores.
 *
 * Only the languages actually offered appear here; a device set to anything
 * else falls through and contributes nothing, which is the right outcome.
 */
const SUBTAG_TO_CODE = {
  hi: 'hindi',
  en: 'english',
  pa: 'punjabi',
  mr: 'marathi',
  gu: 'gujarati',
  bn: 'bengali',
  ta: 'tamil',
  te: 'telugu',
  kn: 'kannada',
  ml: 'malayalam',
  or: 'odia',
  ur: 'urdu',
  as: 'assamese',
  bho: 'bhojpuri',
};

/**
 * A starting selection taken from how the phone is already set up.
 *
 * Someone whose device is in Punjabi almost certainly speaks it, and making
 * them find it among sixteen chips to tell us something the phone already
 * knows is work for nothing. It is only a default — the chips are right there,
 * and anything wrong is one tap to remove.
 *
 * Region is consulted as well, because a great many phones in India are set to
 * English while the person is comfortable in more than that: `en-IN` seeds
 * Hindi alongside English rather than English alone.
 */
export function guessLanguagesFromDevice() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const [subtag, region] = locale.toLowerCase().split(/[-_]/);

    const guessed = [];
    const primary = SUBTAG_TO_CODE[subtag];
    if (primary) guessed.push(primary);
    if (region === 'in' && !guessed.includes('hindi')) guessed.push('hindi');

    return guessed.slice(0, MAX_LANGUAGES);
  } catch {
    // No Intl, or a locale in a shape this does not expect. Nothing
    // pre-selected is perfectly usable.
    return [];
  }
}
