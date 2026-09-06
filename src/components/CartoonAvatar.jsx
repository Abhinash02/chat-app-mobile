import { memo } from 'react';
import { Image } from 'expo-image';
import Svg from 'react-native-svg';

import { AVATAR_PHOTOS } from './avatar-photos.js';
import { buildLook } from './avatar-looks.js';
import {
  Earrings,
  Face,
  Glasses,
  HairBob,
  HairBun,
  HairCrop,
  HairCurly,
  HairCurlyLong,
  HairLong,
  HairSwept,
  Pinafore,
  Torso,
} from './avatar-parts.jsx';

/**
 * The illustrated stand-in for someone with no photo.
 *
 * Assembled rather than drawn once: skin tone, hair colour, hairstyle, top
 * colour, expression and accessories are all chosen from the account id, so a
 * discovery grid looks like a crowd instead of one character repeated. That
 * variety is what the reference apps are actually doing — the drawing style is
 * the easy half.
 *
 * The pieces live in `avatar-parts.jsx` and the trait picking in
 * `avatar-looks.js`. Adding a hairstyle means adding one component there and
 * one name to the list; nothing in this file changes.
 *
 * Hand-drawn rather than themed: this is artwork, so it keeps its own palette
 * instead of following the accent colour. A character tinted to whatever blue
 * or pink an admin picked stops reading as a person and starts reading as an
 * icon, which is the thing it replaced.
 *
 * Everything is geometry, not a bitmap: sharp at 28px in a chat row and at
 * 170px on a discovery card, nothing to download, no @2x/@3x variants.
 */

const HAIR_STYLES = {
  swept: HairSwept,
  crop: HairCrop,
  curly: HairCurly,
  curlyLong: HairCurlyLong,
  bob: HairBob,
  long: HairLong,
  bun: HairBun,
};

function CartoonAvatarComponent({ gender, size = 48, seed, expression }) {
  const look = buildLook({ seed, gender });

  /*
   * Rendered artwork wins when it is supplied.
   *
   * `avatar-photos.js` ships with both entries null, so this branch is dead code
   * until two files are dropped into `assets/avatars/` and two lines are
   * uncommented — at which point every avatar switches over. Note that doing so
   * gives everyone the same two pictures again and gives up the variety below.
   */
  const photo = look.isFemale ? AVATAR_PHOTOS.girl : AVATAR_PHOTOS.boy;
  if (photo) {
    return (
      <Image
        source={photo}
        style={{ width: size, height: size }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }

  const Hair = HAIR_STYLES[look.hairStyle] ?? HairSwept;
  const mood = expression || look.expression;

  /*
   * Draw order is the whole trick.
   *
   * Long and bob styles need their mass behind the head and their fringe in
   * front of it, so they render on both sides of the face. Short styles have
   * nothing behind, so they render once, after. Getting this wrong is what
   * produces hair floating over a cheek or a fringe hidden under a forehead.
   */
  const hairWrapsFace =
    look.hairStyle === 'bob' || look.hairStyle === 'long' || look.hairStyle === 'curlyLong';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {hairWrapsFace ? <Hair hair={look.hair} layer="back" /> : null}

      <Torso skin={look.skin} top={look.top} female={look.isFemale} />
      {look.isFemale ? <Pinafore colour={look.top.dark} shade={look.top.base} /> : null}

      <Face expression={mood} skin={look.skin} />

      <Hair hair={look.hair} layer="front" />

      {look.earrings ? <Earrings /> : null}
      {look.glasses ? <Glasses /> : null}
    </Svg>
  );
}

/** The drawing only depends on its props, so it never needs re-rendering when
 *  a presence tick moves through the list around it. */
export const CartoonAvatar = memo(CartoonAvatarComponent);

export default CartoonAvatar;
