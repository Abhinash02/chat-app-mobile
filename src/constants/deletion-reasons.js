/**
 * Why someone is closing their account.
 *
 * A deliberate mirror of DELETION_REASON in the backend's
 * `src/modules/account-deletion/deletion.constants.js`. The codes have to match
 * — the server validates against its own list — but the wording lives here,
 * because it is interface copy rather than data.
 *
 * Ordered with the answers we can actually act on first. "Other" sits last and
 * is the only one that asks for a written note, which the server requires.
 */
export const DELETION_REASONS = Object.freeze([
  {
    code: 'not_useful',
    label: "I'm not finding it useful",
    hint: 'There was nobody to talk to, or nothing worth staying for.',
  },
  {
    code: 'harassment',
    label: 'Someone treated me badly',
    hint: 'Harassment, abuse, or messages that made me uncomfortable.',
  },
  {
    code: 'privacy',
    label: 'Privacy concerns',
    hint: "I'd rather my profile and data were not stored.",
  },
  {
    code: 'too_many_notifications',
    label: 'Too many notifications',
    hint: 'The app contacted me more than I wanted.',
  },
  {
    code: 'found_alternative',
    label: "I'm using something else",
    hint: 'Another app covers this for me.',
  },
  {
    code: 'temporary_break',
    label: 'I just need a break',
    hint: 'I may want to come back later.',
  },
  {
    code: 'other',
    label: 'Something else',
    hint: 'Tell us in your own words.',
    requiresDetail: true,
  },
]);

/** Matches REVIEW_WINDOW_HOURS on the server. */
export const REVIEW_WINDOW_HOURS = 24;

const BY_CODE = new Map(DELETION_REASONS.map((entry) => [entry.code, entry]));

/** The written label for a stored code; the raw code if this build predates it. */
export function deletionReasonLabel(code) {
  return BY_CODE.get(code)?.label ?? code;
}
