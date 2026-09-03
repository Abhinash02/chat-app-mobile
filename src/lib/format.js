export function formatCoins(value) {
  const amount = Number(value ?? 0);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${(amount / 1000).toFixed(1)}k`;
  return String(amount);
}

/** "23h 14m" / "4:08" — the unit follows the magnitude, as a countdown should. */
export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((milliseconds ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatFreeTalk(seconds) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;

  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
  return `${remainder}s`;
}

export function formatRelativeTime(value) {
  if (!value) return '';

  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(deltaMs / 60_000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatMessageTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return 'Less than 1 km away';
  return `${Math.round(km)} km away`;
}

export function formatRupees(amount) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN')}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

