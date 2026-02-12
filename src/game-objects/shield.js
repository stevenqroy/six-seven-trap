import { SHIELD } from '../constants.js';

/**
 * Activate the shield if cooldown allows.
 */
export function activateShield(state, now) {
  if (now - state.shield.lastUsedAt < SHIELD.COOLDOWN_MS) return false;
  state.shield.active = true;
  state.shield.startedAt = now;
  state.shield.lastUsedAt = now;
  return true;
}

/**
 * Update shield lifecycle.
 */
export function updateShield(state, now) {
  if (!state.shield.active) return;
  if (now - state.shield.startedAt >= SHIELD.DURATION_MS) {
    state.shield.active = false;
  }
}

/**
 * True while shield is currently active.
 */
export function isShieldActive(state, now) {
  return state.shield.active && now - state.shield.startedAt < SHIELD.DURATION_MS;
}

/**
 * Alpha envelope for shield visuals.
 */
export function getShieldAlpha(state, now) {
  if (!isShieldActive(state, now)) return 0;
  const elapsed = now - state.shield.startedAt;
  const remaining = SHIELD.DURATION_MS - elapsed;
  const fadeIn = Math.min(1, elapsed / 200);
  const fadeOut = Math.max(0, Math.min(1, remaining / 300));
  const pulse = 0.88 + 0.12 * Math.sin(now * 0.012);
  return Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut) * pulse));
}

/**
 * Draws shield around guardian position.
 */
export function drawShield(ctx, cx, anchorY, state, now) {
  const alpha = getShieldAlpha(state, now);
  if (alpha <= 0.001) return;

  const centerX = cx;
  const centerY = anchorY + 18;
  const radius = SHIELD.RADIUS_PX * (0.98 + 0.02 * Math.sin(now * 0.01));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const fill = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
  fill.addColorStop(0, `rgba(255,255,255,${0.14 * alpha})`);
  fill.addColorStop(0.45, `rgba(120,255,245,${0.1 * alpha})`);
  fill.addColorStop(1, 'rgba(120,255,245,0)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(130,255,255,${0.58 * alpha})`;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = `rgba(120,255,255,${0.7 * alpha})`;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * (0.985 + 0.015 * Math.sin(now * 0.018)), 0, Math.PI * 2);
  ctx.stroke();

  const rippleAge = now - state.shield.rippleAt;
  if (rippleAge >= 0 && rippleAge <= 420) {
    const t = rippleAge / 420;
    const rippleR = radius * (0.22 + t * 0.86);
    const rippleA = (1 - t) * 0.55 * alpha;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(210,255,255,${rippleA})`;
    ctx.lineWidth = 3 - t * 1.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
