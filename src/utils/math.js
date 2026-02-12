// Pure math utility functions — no game state dependencies.

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Squared distance from a point to a line segment.
 * Used for laser beam collision checks.
 */
export function distPointToSegmentSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) {
    const ox = px - x1;
    const oy = py - y1;
    return ox * ox + oy * oy;
  }
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  const sx = x1 + dx * t;
  const sy = y1 + dy * t;
  const ox = px - sx;
  const oy = py - sy;
  return ox * ox + oy * oy;
}

/**
 * Returns a 0-1 value biased toward 0 or 1 (edges).
 * Higher power = stronger edge bias.
 */
export function edgeBiasedUnit(power = 1.8, random = Math.random) {
  const towardLeftOrTop = random() < 0.5;
  const n = Math.pow(random(), power);
  return towardLeftOrTop ? n : 1 - n;
}
