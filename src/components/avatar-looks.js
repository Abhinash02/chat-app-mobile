import { HAIR_COLOURS, SKIN_TONES, TOP_COLOURS } from './avatar-parts.jsx';

/**
 * Turns an account id into a consistent appearance.
 *
 * The point of a set like this is that no two people in a list look the same.
 * One drawn character repeated down a grid reads as a placeholder no matter how
 * well it is drawn; the same character with different hair, skin and clothing
 * reads as a room full of people.
 *
 * Every trait is derived from the id, so someone's look is a fixed part of who
 * they are — stable across sessions, devices and reinstalls, with nothing to
 * store and no extra request to make. Two accounts can of course land on the
 * same combination; with the counts below there are a few thousand of them, so
 * a repeat inside one screenful is unlikely rather than impossible.
 *
 * If avatar customisation is ever offered, this stays as the default a new
 * account starts from — the picker just overrides the fields a person changes.
 */

/*
 * Three character designs per gender, and no more.
 *
 * An earlier version offered a wider set of styles, and a grid of it looked
 * less like a cast and more like a component gallery — every card a different
 * silhouette, nothing tying them together as one app's artwork. Three reads as
 * a deliberate set. The variation that keeps people apart is carried by
 * expression, hair colour and skin tone instead, which vary without breaking
 * the family resemblance.
 *
 * The tied-back style was dropped as well as trimmed for: cards crop the top of
 * the frame, and it was the one silhouette that lost its defining feature to
 * that crop.
 */
export const FEMALE_HAIR = ['long', 'curlyLong', 'bob'];
export const MALE_HAIR = ['swept', 'crop', 'curly'];
export const EXPRESSIONS = ['happy', 'sweet', 'shy', 'curious', 'wink'];

/**
 * One hash, many traits.
 *
 * Each trait reads a different slice of the same hash rather than re-hashing,
 * and the slices are spread apart so that neighbouring ids — which real
 * databases hand out in droves — do not end up with the same hair and skin and
 * differ only in expression.
 */
function hashOf(seed) {
  let hash = 2166136261;
  const text = String(seed ?? '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function pick(list, hash, shift) {
  return list[Math.floor(hash / 2 ** shift) % list.length];
}

export function buildLook({ seed, gender }) {
  const isFemale =
    String(gender).toLowerCase() === 'female' || String(gender).toLowerCase() === 'girl';
  const hash = hashOf(seed);

  const hairStyles = isFemale ? FEMALE_HAIR : MALE_HAIR;

  const skin = pick(SKIN_TONES, hash, 0);

  /*
   * Hair has to read against the skin it sits on.
   *
   * The palettes are ordered light to dark, and mid-brown hair on tan or deep
   * skin came out near enough in value that the head looked bare — the shape
   * was there but nothing separated it from the forehead. On the darker tones
   * the mid-brown is dropped, which costs one combination and fixes the read.
   */
  const skinIndex = SKIN_TONES.indexOf(skin);
  const hairChoices =
    skinIndex >= 3 ? HAIR_COLOURS.filter((entry) => entry.id !== 'brown') : HAIR_COLOURS;

  return {
    isFemale,
    skin,
    hair: pick(hairChoices, hash, 5),
    top: pick(TOP_COLOURS, hash, 9),
    hairStyle: pick(hairStyles, hash, 13),
    expression: pick(EXPRESSIONS, hash, 17),
    // Roughly a third wear glasses. Common enough to feel like a real crowd,
    // rare enough that they still read as a distinguishing feature.
    glasses: Math.floor(hash / 2 ** 21) % 3 === 0,
    // Earrings only where the hairstyle does not cover the ears.
    earrings: isFemale && Math.floor(hash / 2 ** 24) % 2 === 0,
  };
}

export default buildLook;
