/**
 * Defensive numeric helpers used by runtime/render modules.
 */

export function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function toNonNegativeFinite(value, fallback = 0) {
  const safe = Number.isFinite(value) ? value : fallback;
  return safe < 0 ? 0 : safe;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}
