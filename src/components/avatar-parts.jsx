import { G, Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * The interchangeable pieces an avatar is assembled from.
 *
 * Everything is drawn on the same 100x100 grid against the same face, so any
 * hair can sit on any skin tone with any top and the joins still land. Adding a
 * style means adding one component here and one entry to the list in
 * `avatar-looks.js` — nothing else changes.
 */

export const SKIN_TONES = [
  { id: 'fair', base: '#FBDCC8', shade: '#F3C9B0', deep: '#E9B597' },
  { id: 'light', base: '#F2CBAA', shade: '#E5B994', deep: '#D6A57E' },
  { id: 'medium', base: '#DFAE85', shade: '#CE9B71', deep: '#BC885F' },
  { id: 'tan', base: '#C08D63', shade: '#AC7A52', deep: '#976744' },
  { id: 'deep', base: '#8D5B3C', shade: '#7A4C30', deep: '#653D26' },
];

export const HAIR_COLOURS = [
  { id: 'black', base: '#2E2320', dark: '#1C1412', light: '#4A3A34' },
  { id: 'darkBrown', base: '#4E342E', dark: '#3B2622', light: '#6B4A40' },
  { id: 'brown', base: '#A9744C', dark: '#8C5C3A', light: '#C08D63' },
  { id: 'auburn', base: '#8C4A32', dark: '#6E3724', light: '#AD6244' },
];

export const TOP_COLOURS = [
  { id: 'coral', base: '#EE8377', dark: '#DB6E62' },
  { id: 'rose', base: '#E05C55', dark: '#C74D46' },
  { id: 'teal', base: '#4FA9A2', dark: '#3E8B85' },
  { id: 'indigo', base: '#6C6BC4', dark: '#5857A6' },
  { id: 'mustard', base: '#D9A441', dark: '#BC8B32' },
  { id: 'mint', base: '#7FBF8F', dark: '#68A377' },
];

const INK = '#4A332C';
const BROW = '#7A5140';
const CHEEK = '#F4A09A';
const MOUTH = '#C9615C';
const MOUTH_IN = '#A9474A';

/* ── Features ─────────────────────────────────────────────────────────── */

function OpenEye({ cx, cy, squint = 0 }) {
  const ry = 4.7 - squint;
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx="3.6" ry={ry} fill={INK} />
      <Ellipse cx={cx} cy={cy + 0.6} rx="2.5" ry={ry * 0.62} fill="#6B4A3F" opacity="0.55" />
      <Circle cx={cx - 1.2} cy={cy - 1.7} r="1.35" fill="#FFFFFF" />
      <Circle cx={cx + 1.3} cy={cy + 1.5} r="0.62" fill="#FFFFFF" opacity="0.75" />
    </G>
  );
}

function ClosedEye({ cx, cy }) {
  return (
    <Path
      d={`M${cx - 4} ${cy + 1.4}c1.4-2.6 2.7-3.8 4-3.8s2.6 1.2 4 3.8`}
      stroke={INK}
      strokeWidth="2.1"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function Brows({ expression }) {
  const common = { stroke: BROW, strokeWidth: 1.9, strokeLinecap: 'round', fill: 'none' };

  if (expression === 'curious') {
    return (
      <G>
        <Path d="M36 36.5c1.6-1.9 4.6-2.2 6.6-.9" {...common} />
        <Path d="M57.4 35c2-1.3 5-1 6.6.9" {...common} />
      </G>
    );
  }
  if (expression === 'shy') {
    return (
      <G>
        <Path d="M36.2 36c2-1.2 4.6-1.1 6.4.4" {...common} />
        <Path d="M57.4 36.4c1.8-1.5 4.4-1.6 6.4-.4" {...common} />
      </G>
    );
  }
  return (
    <G>
      <Path d="M36.2 36c1.8-1.7 4.6-1.8 6.5-.4" {...common} />
      <Path d="M57.3 35.6c1.9-1.4 4.7-1.3 6.5.4" {...common} />
    </G>
  );
}

function Mouth({ expression }) {
  if (expression === 'curious') {
    return (
      <G>
        <Ellipse cx="50" cy="59" rx="2.9" ry="3.4" fill={MOUTH_IN} />
        <Ellipse cx="50" cy="60.4" rx="1.9" ry="1.6" fill="#E1867F" opacity="0.7" />
      </G>
    );
  }
  if (expression === 'sweet' || expression === 'wink') {
    return (
      <G>
        <Path d="M43.4 56.6c1.6 4.4 4 6.6 6.6 6.6s5-2.2 6.6-6.6z" fill={MOUTH_IN} />
        <Path d="M46.6 61.4c1 1.2 2.2 1.8 3.4 1.8s2.4-.6 3.4-1.8z" fill="#E1867F" />
      </G>
    );
  }
  if (expression === 'shy') {
    return (
      <Path
        d="M46.4 58c1.2 1.6 2.5 2.4 3.7 2.4s2.3-.7 3.3-2.1"
        stroke={MOUTH}
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <Path
      d="M45.4 57.4c1.5 2.4 3.1 3.6 4.6 3.6s3.1-1.2 4.6-3.6"
      stroke={MOUTH}
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** Head, ears and expression. Skin tone is the only thing that varies. */
export function Face({ expression, skin }) {
  const isShy = expression === 'shy';

  return (
    <G>
      <Circle cx="24.5" cy="49" r="5.4" fill={skin.shade} />
      <Circle cx="75.5" cy="49" r="5.4" fill={skin.shade} />

      <Path
        d="M50 17c15.6 0 25.4 10.6 25.4 26.2 0 16.6-10.4 28.4-25.4 28.4S24.6 59.8 24.6 43.2C24.6 27.6 34.4 17 50 17z"
        fill={skin.base}
      />
      <Path
        d="M31 58c4.4 8.6 11 13.6 19 13.6s14.6-5 19-13.6c-2.6 10.6-9.8 17-19 17s-16.4-6.4-19-17z"
        fill={skin.deep}
        opacity="0.45"
      />
      <Path
        d="M27 34c6-6.4 13.6-9.6 23-9.6s17 3.2 23 9.6c-6-3.6-13.6-5.4-23-5.4S33 30.4 27 34z"
        fill={skin.deep}
        opacity="0.3"
      />

      <Brows expression={expression} />

      {expression === 'sweet' ? (
        <G>
          <ClosedEye cx={40.4} cy={47} />
          <ClosedEye cx={59.6} cy={47} />
        </G>
      ) : expression === 'wink' ? (
        <G>
          <ClosedEye cx={40.4} cy={47} />
          <OpenEye cx={59.6} cy={46.5} />
        </G>
      ) : (
        <G>
          <OpenEye cx={40.4} cy={46.5} squint={isShy ? 1.1 : 0} />
          <OpenEye cx={59.6} cy={46.5} squint={isShy ? 1.1 : 0} />
        </G>
      )}

      <Path
        d="M48.7 52.6c.9.8 1.7.8 2.6 0"
        stroke={skin.deep}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      <Ellipse cx="31.5" cy="54.5" rx={isShy ? 5.6 : 4.6} ry={isShy ? 3.4 : 2.9} fill={CHEEK} opacity={isShy ? 0.95 : 0.7} />
      <Ellipse cx="68.5" cy="54.5" rx={isShy ? 5.6 : 4.6} ry={isShy ? 3.4 : 2.9} fill={CHEEK} opacity={isShy ? 0.95 : 0.7} />
      {isShy ? (
        <G stroke="#E08880" strokeWidth="0.9" strokeLinecap="round" opacity="0.8">
          <Path d="M28.6 52.9l0 3.2M31.5 52.4l0 4.1M34.4 52.9l0 3.2" />
          <Path d="M65.6 52.9l0 3.2M68.5 52.4l0 4.1M71.4 52.9l0 3.2" />
        </G>
      ) : null}

      <Mouth expression={expression} />
    </G>
  );
}

/** Neck and shoulders. The top's colour is what changes between people. */
export function Torso({ skin, top, female }) {
  return (
    <G>
      <Rect x="43.5" y="63" width="13" height="10" rx="5" fill={skin.shade} />
      <Path d="M43.5 70c3.6 2.6 9.4 2.6 13 0v3.4h-13z" fill={skin.deep} opacity="0.6" />
      <Path
        d={
          female
            ? 'M20 100v-9c0-11.6 9.4-19.4 21-21.6h18c11.6 2.2 21 10 21 21.6v9z'
            : 'M18 100v-9c0-11.6 9.4-19.4 21-21.6h22c11.6 2.2 21 10 21 21.6v9z'
        }
        fill={top.base}
      />
      <Path
        d={
          female
            ? 'M41 69.4c3.2 4.2 15.8 4.2 18 0v5c-3 4.4-15 4.4-18 0z'
            : 'M39 69.4c3.4 4.6 18.6 4.6 22 0v5.2c-3.4 4.6-18.6 4.6-22 0z'
        }
        fill={top.dark}
      />
    </G>
  );
}

/* ── Hair ─────────────────────────────────────────────────────────────── */

/** Swept fringe, parted off-centre. */
export function HairSwept({ hair }) {
  return (
    <G>
      <Path
        d="M50 12.5c14.8 0 25.8 9.4 25.8 23.4 0 2.6-.5 4.9-1.2 6.4-1.1-6.2-3.4-10.2-6.6-12.6-4.9 3.7-12.3 5.3-20.6 4.2-4.4-.6-8 .5-10.6 3.1-1.9 1.9-3.1 4.6-3.6 8.1-1-1.9-1.6-5-1.6-8.2 0-14.9 8.6-24.4 18.4-24.4z"
        fill={hair.base}
      />
      <Path
        d="M50 12.5c8.7 0 15.9 3.3 20.4 8.8-5.3-3.4-12.1-4.6-19.6-3.1-9.4 1.9-15.6 7.6-18 15.6-.6-1.9-.9-4-.9-6 0-9.1 7.6-15.3 18.1-15.3z"
        fill={hair.dark}
        opacity="0.55"
      />
      <Path d="M40 18.6c4.4-2.8 9.6-4 15.4-3.4-5.4.7-10 2.6-13.6 5.8z" fill={hair.light} opacity="0.75" />
    </G>
  );
}

/** Even short crop with a straight hairline. */
export function HairCrop({ hair }) {
  return (
    <G>
      <Path
        d="M50 12c14.4 0 24.2 9 24.2 22.6 0 3-.4 5.6-1.2 7.8-.8-6.8-2.2-11.4-4.2-14-5 2.6-11.2 3.8-18.8 3.8s-13.8-1.2-18.8-3.8c-2 2.6-3.4 7.2-4.2 14-.8-2.2-1.2-4.8-1.2-7.8C25.8 21 35.6 12 50 12z"
        fill={hair.base}
      />
      <Path
        d="M50 12c8 0 14.6 2.8 19 7.6-5.2-3-11.6-4.4-19-4.4s-13.8 1.4-19 4.4C35.4 14.8 42 12 50 12z"
        fill={hair.light}
        opacity="0.6"
      />
      <Path d="M67 20.4c3.6 3 5.8 7.6 6.6 14-1.2-6-3.4-10.6-6.6-14z" fill={hair.dark} opacity="0.5" />
    </G>
  );
}

/** Textured curls sitting high on the crown. */
export function HairCurly({ hair }) {
  return (
    <G>
      <Path
        d="M50 11c13.6 0 23.4 9.2 23.4 22.6 0 3.4-.4 6.4-1.2 9-.9-7-2.4-11.8-4.4-14.4-5.2 2.8-11.4 4-17.8 4s-12.6-1.2-17.8-4c-2 2.6-3.5 7.4-4.4 14.4-.8-2.6-1.2-5.6-1.2-9C26.6 20.2 36.4 11 50 11z"
        fill={hair.base}
      />
      {/* Curl clusters, drawn as overlapping discs so the silhouette is lumpy
          rather than a smooth dome — that lumpiness is the whole read. */}
      <G fill={hair.base}>
        <Circle cx="33" cy="24" r="6.2" />
        <Circle cx="41.5" cy="18.4" r="6.8" />
        <Circle cx="50" cy="15.6" r="7" />
        <Circle cx="58.5" cy="18.4" r="6.8" />
        <Circle cx="67" cy="24" r="6.2" />
        <Circle cx="29.4" cy="31.6" r="5" />
        <Circle cx="70.6" cy="31.6" r="5" />
      </G>
      <G fill={hair.light} opacity="0.55">
        <Circle cx="40.4" cy="16.8" r="2.6" />
        <Circle cx="50.4" cy="14.2" r="2.8" />
        <Circle cx="32.2" cy="22.6" r="2.2" />
      </G>
      <G fill={hair.dark} opacity="0.45">
        <Circle cx="60.4" cy="20.6" r="2.6" />
        <Circle cx="68.4" cy="26.4" r="2.2" />
      </G>
    </G>
  );
}

/**
 * Shoulder-length curls.
 *
 * The short curly style is unisex, and on a female card it read as a boy — the
 * silhouette stops at the jaw and a crew neck under it gives nothing back. This
 * keeps the same curl language and carries it past the shoulders, so the two
 * are recognisably from one set without being the same character.
 */
export function HairCurlyLong({ hair, layer = 'front' }) {
  if (layer === 'back') {
    return (
      <G>
        <Path
          d="M50 11c14.6 0 24.6 9.6 24.6 24 0 13.2-.9 26-2.6 38.4-.4 2.8-2.4 4.8-5 5.4l-4 1H37l-4-1c-2.6-.6-4.6-2.6-5-5.4C26.3 61 25.4 48.2 25.4 35 25.4 20.6 35.4 11 50 11z"
          fill={hair.base}
        />
        {/* Lumpy edge: the curls read at the silhouette before anything inside
            it does, so the outline cannot be a smooth arc. */}
        <G fill={hair.base}>
          <Circle cx="26.4" cy="46" r="5.4" />
          <Circle cx="25.4" cy="57" r="5.6" />
          <Circle cx="27.2" cy="68" r="5.2" />
          <Circle cx="73.6" cy="46" r="5.4" />
          <Circle cx="74.6" cy="57" r="5.6" />
          <Circle cx="72.8" cy="68" r="5.2" />
        </G>
        <G fill={hair.dark} opacity="0.35">
          <Circle cx="28.6" cy="62" r="3.4" />
          <Circle cx="71.4" cy="62" r="3.4" />
        </G>
      </G>
    );
  }

  return (
    <G>
      <G fill={hair.base}>
        <Circle cx="33" cy="24" r="6.4" />
        <Circle cx="41.5" cy="18" r="7" />
        <Circle cx="50" cy="15.2" r="7.2" />
        <Circle cx="58.5" cy="18" r="7" />
        <Circle cx="67" cy="24" r="6.4" />
        <Circle cx="29.2" cy="32" r="5.2" />
        <Circle cx="70.8" cy="32" r="5.2" />
      </G>
      <G fill={hair.light} opacity="0.5">
        <Circle cx="40.2" cy="16.4" r="2.7" />
        <Circle cx="50.4" cy="13.8" r="2.9" />
        <Circle cx="32.2" cy="22.4" r="2.3" />
      </G>
      <G fill={hair.dark} opacity="0.4">
        <Circle cx="60.4" cy="20.2" r="2.7" />
        <Circle cx="68.6" cy="26.6" r="2.3" />
      </G>
    </G>
  );
}

/**
 * Chin-length bob with a straight fringe.
 *
 * Rendered in two passes: the mass goes behind the head, the fringe in front of
 * it. Drawing the whole thing on one layer either buries the face or floats the
 * lengths over the cheeks — there is no single z-position that works for hair
 * that frames a face.
 */
export function HairBob({ hair, layer = 'front' }) {
  if (layer === 'back') {
    return (
      <Path
        d="M50 10c17 0 28 12.4 28 31 0 10.6-1 21-2.8 30.6-.6 3.2-3.4 5.4-6.6 5.4H31.4c-3.2 0-6-2.2-6.6-5.4C23 62 22 51.6 22 41c0-18.6 11-31 28-31z"
        fill={hair.base}
      />
    );
  }

  return (
    <G>
      <Path
        d="M50 10c17 0 28 12.4 28 31 0 2.8-.2 5.6-.5 8.2-1.6-10.4-3.6-16.6-6-18.8-6.6 4.8-15 6.8-25 6-4.6-.4-8 .8-10.2 3.6-1.8 2.3-3 5.6-3.6 9.8-.5-2.8-.7-5.7-.7-8.8 0-18.6 11-31 28-31z"
        fill={hair.base}
      />
      <Path
        d="M50 10c9.6 0 17.2 4 21.8 10.8-5.8-4.2-13.4-5.6-21.6-3.8C39.8 19.2 33 25.8 30.4 35c-.6-2.2-.9-4.4-.9-6.6C29.5 17.8 38.4 10 50 10z"
        fill={hair.dark}
        opacity="0.5"
      />
      <Path d="M39.5 16.4c4.6-2.8 10-4 16-3.4-5.6.8-10.4 2.7-14.2 5.9z" fill={hair.light} opacity="0.7" />
    </G>
  );
}

/** Long hair falling well past the shoulders. Two passes, like the bob. */
export function HairLong({ hair, layer = 'front' }) {
  if (layer === 'back') {
    return (
      <G>
        <Path
          d="M50 10c17.4 0 28.4 12.6 28.4 31.4 0 16-1.2 32.4-3.4 49.2-.4 3-2.4 5.2-5.2 6l-4.8 1.4H35l-4.8-1.4c-2.8-.8-4.8-3-5.2-6C22.8 73.8 21.6 57.4 21.6 41.4 21.6 22.6 32.6 10 50 10z"
          fill={hair.base}
        />
        <G stroke={hair.light} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.35">
          <Path d="M26.4 46c.6 14 1.4 28 2.4 42" />
          <Path d="M73.6 46c-.6 14-1.4 28-2.4 42" />
        </G>
      </G>
    );
  }

  return (
    <G>
      <Path
        d="M50 10c17.4 0 28.4 12.6 28.4 31.4 0 2.6-.1 5.2-.2 7.8-1.5-11-3.4-17.8-5.6-20.4-6.6 4.8-15 6.8-25 6-4.6-.4-8 .8-10.2 3.6-1.8 2.3-3 5.6-3.6 9.8-.4-2.4-.6-4.8-.6-7.2 0-18.8 11-31 28.4-31z"
        fill={hair.base}
      />
      <Path
        d="M50 10c9.8 0 17.6 4.2 22.2 11.2-5.9-4.4-13.6-5.8-22-4C40 19.4 33 26.2 30.4 35.6c-.6-2.2-.9-4.6-.9-6.8C29.5 18 38.4 10 50 10z"
        fill={hair.dark}
        opacity="0.45"
      />
      <Path d="M39.5 16.4c4.6-2.8 10-4 16-3.4-5.6.8-10.4 2.7-14.2 5.9z" fill={hair.light} opacity="0.6" />
    </G>
  );
}

/** Hair up, with a bun on the crown and a few loose strands. */
export function HairBun({ hair }) {
  return (
    <G>
      {/* The bun sits low rather than on the very crown. Cards crop the top of
          the frame to fill the panel, and a bun at y10 was being sliced off —
          taking with it the one thing that distinguishes this style. */}
      <Circle cx="50" cy="16" r="8.2" fill={hair.base} />
      <Circle cx="47.6" cy="14" r="2.8" fill={hair.light} opacity="0.5" />
      <Path d="M43.4 21.6c4.2 2 9 2 13.2 0-1.8 2.6-4 3.9-6.6 3.9s-4.8-1.3-6.6-3.9z" fill={hair.dark} opacity="0.4" />
      <Path
        d="M50 14c14.6 0 24.4 9.4 24.4 23.6 0 3-.4 5.8-1.2 8.2-1-7.4-2.6-12.4-4.8-15-5.2 3-11.4 4.4-18.4 4.4s-13.2-1.4-18.4-4.4c-2.2 2.6-3.8 7.6-4.8 15-.8-2.4-1.2-5.2-1.2-8.2C25.6 23.4 35.4 14 50 14z"
        fill={hair.base}
      />
      <Path
        d="M50 14c8.4 0 15.2 3 19.8 8.4-5.4-3.6-12-5.4-19.8-5.4s-14.4 1.8-19.8 5.4C34.8 17 41.6 14 50 14z"
        fill={hair.dark}
        opacity="0.45"
      />
      {/* Loose strands at the temples, so it is tied back rather than shaved. */}
      <Path d="M28.8 32c-1.6 4-2.2 8.6-1.8 13.8-1.6-4.8-1.6-9.4 0-13.8z" fill={hair.base} />
      <Path d="M71.2 32c1.6 4 2.2 8.6 1.8 13.8 1.6-4.8 1.6-9.4 0-13.8z" fill={hair.base} />
    </G>
  );
}

/* ── Accessories ──────────────────────────────────────────────────────── */

/** Round wire frames, sitting on the nose and reaching the temples. */
export function Glasses({ tint = '#3A2E2A' }) {
  return (
    <G fill="none" stroke={tint} strokeWidth="1.7">
      <Circle cx="40.4" cy="46.5" r="7.4" fill="#FFFFFF" fillOpacity="0.14" />
      <Circle cx="59.6" cy="46.5" r="7.4" fill="#FFFFFF" fillOpacity="0.14" />
      <Path d="M47.8 45.8c1.5-1 2.9-1 4.4 0" strokeLinecap="round" />
      <Path d="M33 45.4l-4.6-1.2M67 45.4l4.6-1.2" strokeLinecap="round" />
    </G>
  );
}

/** A small stud at each earlobe. */
export function Earrings({ tint = '#E8C15C' }) {
  return (
    <G fill={tint}>
      <Circle cx="24.8" cy="54.4" r="1.7" />
      <Circle cx="75.2" cy="54.4" r="1.7" />
    </G>
  );
}

/** The pinafore the reference dresses her in. */
export function Pinafore({ colour, shade }) {
  return (
    <G>
      <Path d="M39.6 73.4c1.7-.6 3.4.4 3.9 2.2l2 7.4-6 1.6-2-7.4c-.5-1.8.4-3.3 2.1-3.8z" fill={colour} />
      <Path d="M60.4 73.4c1.7.5 2.6 2 2.1 3.8l-2 7.4-6-1.6 2-7.4c.5-1.8 2.2-2.8 3.9-2.2z" fill={colour} />
      <Path
        d="M50 78.4c4 0 7.6.5 10.6 1.5 1.7.6 2.9 2 3.1 3.8L66 100H34l2.3-16.3c.2-1.8 1.4-3.2 3.1-3.8 3-1 6.6-1.5 10.6-1.5z"
        fill={colour}
      />
      <Path d="M34.4 96.8h31.2L66 100H34z" fill={shade} opacity="0.6" />
    </G>
  );
}
