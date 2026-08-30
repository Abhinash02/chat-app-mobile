import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Mirrors what the server accepts, so a rejection happens before the upload. */
const EXTENSION_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  m4a: 'audio/m4a',
  mp3: 'audio/mpeg',
  aac: 'audio/aac',
  caf: 'audio/mp4',
  '3gp': 'audio/3gpp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * A recorder or picker does not always declare a MIME type, and the server
 * refuses anything it cannot name. Falling back to the extension keeps a
 * perfectly valid file from being rejected over a missing header.
 */
export function guessMimeType(uri, declared) {
  if (declared && declared !== 'application/octet-stream') return declared;

  const extension = String(uri).split('?')[0].split('.').pop()?.toLowerCase();
  return EXTENSION_MIME[extension] ?? 'application/octet-stream';
}

/**
 * Attaches a local file to a FormData, by whatever means the platform needs.
 *
 * These are genuinely two different APIs wearing one name:
 *
 * On native, React Native's FormData accepts `{ uri, name, type }` and streams
 * the file straight from disk. Nothing is read into JavaScript, which is the
 * only reason a 12MB video uploads from a phone without exhausting the heap.
 *
 * On web that same object is not a file — the browser's FormData stringifies
 * it to "[object Object]" and sends a 150-byte text field. The request looks
 * plausible and arrives with no file at all, which is exactly how this failed:
 * multer found nothing to parse and the stray text part tripped validation, so
 * the error pointed at a form field rather than the missing upload. A browser
 * needs a real Blob, so the uri is fetched (it is a blob: or data: url the
 * picker already produced locally, not a network round trip) and appended with
 * an explicit filename.
 */
export async function appendFile(formData, { uri, mimeType, fieldName = 'file' }) {
  const type = guessMimeType(uri, mimeType);
  const extension = type.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';
  const name = `upload.${extension}`;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();

    // The picker's blob sometimes carries no type; the server refuses what it
    // cannot name, so the detected one is reapplied.
    formData.append(fieldName, blob.type ? blob : new Blob([blob], { type }), name);
    return formData;
  }

  formData.append(fieldName, { uri, name, type });
  return formData;
}

/**
 * The longest edge a shared photo keeps.
 *
 * Matched to what Cloudinary stores rather than picked freely. The server caps
 * images at 1080 on the long edge, so anything larger is bytes uploaded over
 * mobile data purely to be thrown away on arrival — and sending exactly 1080
 * means Cloudinary's resize is a no-op, so the picture is resampled once
 * instead of twice. Every resample costs a little detail.
 *
 * 1080 is also about what a phone screen can show. A 12-megapixel camera photo
 * is roughly 4000px wide: three quarters of that data cannot be displayed on
 * the device it is being sent to.
 */
const MAX_IMAGE_EDGE = 1080;

/**
 * JPEG quality for the upload.
 *
 * Deliberately higher than the final: Cloudinary re-encodes with its own
 * quality pass, and a second encode of an already-squeezed image compounds the
 * artefacts. Handing it a generous source and letting it do the last squeeze
 * gives a better picture at a smaller size than compressing hard twice.
 *
 * At 0.85 the difference from the original is not visible at phone size, while
 * a typical camera photo drops from around 4MB to a couple of hundred KB.
 */
const UPLOAD_QUALITY = 0.85;

/**
 * Shrinks a photo before it is uploaded.
 *
 * Compression belongs on this side of the wire. Doing it only on the server
 * still means the person waits for four megabytes to crawl out over a phone
 * connection, and pays for the data, before anything is saved — the saving
 * lands on the storage bill rather than on them.
 *
 * A failure here is not fatal: if the manipulator cannot read the file, the
 * original is uploaded instead. A larger photo that arrives beats a smaller
 * one that never sends.
 */
export async function compressImage(uri, { width, height } = {}) {
  try {
    const context = ImageManipulator.manipulate(uri);

    const longestEdge = Math.max(width ?? 0, height ?? 0);

    /*
     * Only shrink, and only the longest edge.
     *
     * Which edge that is decides which value to pass: the manipulator works
     * out the other one from the aspect ratio, and passing both would fix a
     * ratio and squash anything that is not square. Asking for a width of 1080
     * on a portrait photo leaves it 1080 x 1920 — still over the limit on the
     * side that mattered.
     *
     * An image already smaller than the cap is left at its own size. Resizing
     * up invents detail that was never captured and makes the file bigger to
     * store it.
     */
    if (longestEdge > MAX_IMAGE_EDGE) {
      const isLandscape = (width ?? 0) >= (height ?? 0);
      context.resize(isLandscape ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE });
    }

    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: UPLOAD_QUALITY, format: SaveFormat.JPEG });

    return { uri: result.uri, mimeType: 'image/jpeg', width: result.width, height: result.height };
  } catch {
    return null;
  }
}

/** What the server allows, so an over-size file fails here and not after a long upload. */
export const SIZE_LIMITS = { image: 5, audio: 3, video: 12 };

export function isWithinLimit(sizeBytes, kind) {
  if (!sizeBytes) return true;
  return sizeBytes <= SIZE_LIMITS[kind] * 1024 * 1024;
}

async function ensureLibraryPermission() {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

async function ensureCameraPermission() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  return granted;
}

/**
 * Turns a picker result into the shape the rest of the app uses, shrinking
 * photos on the way through.
 *
 * Compression happens here rather than at each upload site so every path —
 * chat, status, rooms — gets it without having to remember, and so the size
 * check downstream sees what will actually be sent rather than what came off
 * the camera. Checking the original would reject a 20MB photo that compresses
 * to 300KB and would have uploaded perfectly well.
 *
 * Video is left alone. Transcoding on-device is slow enough to feel broken,
 * and the length limits already bound how large a clip can be.
 */
async function normalizeAsset(asset) {
  if (!asset) return null;

  const kind = asset.type === 'video' ? 'video' : 'image';

  const base = {
    uri: asset.uri,
    kind,
    mimeType: guessMimeType(asset.uri, asset.mimeType),
    sizeBytes: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
  };

  if (kind !== 'image') return base;

  const compressed = await compressImage(asset.uri, { width: asset.width, height: asset.height });

  // Compression is best effort: an image the manipulator cannot read is sent
  // as it came, and the server's own limit is still there to catch it.
  if (!compressed) return base;

  return {
    ...base,
    uri: compressed.uri,
    mimeType: compressed.mimeType,
    width: compressed.width,
    height: compressed.height,
    /*
     * The original byte count no longer describes this file, and guessing
     * would be worse than admitting it: a null means "unknown", which the
     * limit check reads as "let the server decide".
     */
    sizeBytes: null,
    wasCompressed: true,
  };
}

/**
 * Picks one photo or video from the library.
 *
 * `videoMaxDuration` is a hint the picker enforces while trimming, not a
 * guarantee — the server measures the file itself, because a hint set by the
 * client is a request rather than a limit.
 */
export async function pickFromLibrary({ allowVideo = true, videoMaxSeconds = null } = {}) {
  if (!(await ensureLibraryPermission())) {
    return { error: 'Allow photo access to share from your gallery.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: allowVideo ? ['images', 'videos'] : ['images'],
    quality: 0.8,
    videoMaxDuration: videoMaxSeconds ?? undefined,
    allowsEditing: false,
  });

  if (result.canceled) return { cancelled: true };
  return { asset: await normalizeAsset(result.assets?.[0]) };
}

export async function captureWithCamera({ allowVideo = true, videoMaxSeconds = null } = {}) {
  if (!(await ensureCameraPermission())) {
    return { error: 'Allow camera access to take a photo.' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: allowVideo ? ['images', 'videos'] : ['images'],
    quality: 0.8,
    videoMaxDuration: videoMaxSeconds ?? undefined,
  });

  if (result.canceled) return { cancelled: true };
  return { asset: await normalizeAsset(result.assets?.[0]) };
}

/** mm:ss, the only duration format anyone reads on a playback control. */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '0:00';
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
