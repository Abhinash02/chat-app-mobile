/**
 * The gradients a text status can be written on.
 *
 * Mirrors the server's list. The feed also returns it, but the composer has to
 * draw a swatch before any request has been made — a colour picker that waits
 * on the network is a colour picker that flashes empty on open.
 */
export const STATUS_BACKGROUNDS = [
  { id: 'sunset', colors: ['#FF6B35', '#F7B32B'] },
  { id: 'blush', colors: ['#FF4E88', '#7C4DFF'] },
  { id: 'ocean', colors: ['#0EA5E9', '#14B8A6'] },
  { id: 'forest', colors: ['#1B9E77', '#84CC16'] },
  { id: 'midnight', colors: ['#4C1D95', '#1E1B4B'] },
  { id: 'ember', colors: ['#DC2626', '#F59E0B'] },
  { id: 'candy', colors: ['#EC4899', '#8B5CF6'] },
  { id: 'slate', colors: ['#334155', '#0F172A'] },
];

/** The server refuses anything longer, so the composer stops you first. */
export const MAX_STATUS_VIDEO_SECONDS = 15;
export const MAX_STATUS_TEXT_LENGTH = 280;
