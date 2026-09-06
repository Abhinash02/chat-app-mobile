/**
 * Rendered avatar artwork, when you have it.
 *
 * `CartoonAvatar` draws the boy and the girl as vectors, which is why the app
 * ships with no avatar image files at all. Vectors cannot be photorealistic —
 * skin texture, individual hair strands and studio lighting are raster output —
 * so if that is the look you want, the portraits have to be produced outside
 * the app and dropped in here.
 *
 * To switch the whole app over:
 *   1. Put the two files in `assets/avatars/` (see the README there for specs).
 *   2. Uncomment the two `require` lines below.
 *
 * That is the entire change. Every avatar — discovery cards, chat rows, room
 * stages, profile headers — reads through this module, so nothing else needs
 * touching, and deleting the files and re-commenting the lines puts the drawn
 * characters back.
 *
 * The paths have to be written out literally. React Native resolves `require`
 * at build time, so a path built from a variable will not resolve, and a
 * `require` of a file that is not there is a build failure rather than a null —
 * which is why these are commented out rather than wrapped in a try.
 */
export const AVATAR_PHOTOS = {
  boy: null,
  girl: null,

  // boy: require('../../assets/avatars/boy.png'),
  // girl: require('../../assets/avatars/girl.png'),
};

export default AVATAR_PHOTOS;
