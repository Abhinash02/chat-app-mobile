import * as ImagePicker from 'expo-image-picker';

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
 * Wraps a local file for upload.
 *
 * React Native's FormData takes `{ uri, name, type }` rather than a Blob — the
 * file is never read into JavaScript, which is the only reason a 12MB video
 * can be sent from a phone without running the heap out.
 */
export function toFormFile(formData, { uri, mimeType, fieldName = 'file' }) {
  const type = guessMimeType(uri, mimeType);
  const extension = type.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';

  formData.append(fieldName, { uri, name: `upload.${extension}`, type });
  return formData;
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

function normalizeAsset(asset) {
  if (!asset) return null;

  const kind = asset.type === 'video' ? 'video' : 'image';

  return {
    uri: asset.uri,
    kind,
    mimeType: guessMimeType(asset.uri, asset.mimeType),
    sizeBytes: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
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
  return { asset: normalizeAsset(result.assets?.[0]) };
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
  return { asset: normalizeAsset(result.assets?.[0]) };
}

/** mm:ss, the only duration format anyone reads on a playback control. */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '0:00';
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
