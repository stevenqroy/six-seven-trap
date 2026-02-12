import { PROJECTILE } from '../constants.js';

function circleHitsRect(cx, cy, r, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Spawn an energy bolt if below active cap.
 */
export function fireProjectile(state, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (state.projectiles.length >= PROJECTILE.MAX_ACTIVE) return false;
  state.projectiles.push({
    x,
    y,
    dy: -PROJECTILE.SPEED_PX_PER_FRAME * 60,
    life: 2.2,
    trail: [],
  });
  return true;
}

/**
 * Update projectile motion and collisions.
 * Returns hit positions against ship rect.
 */
export function updateProjectiles(state, dt, shipRect) {
  const hits = [];
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.y += p.dy * dt;
    p.life -= dt;

    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > PROJECTILE.TRAIL_LENGTH) p.trail.length = PROJECTILE.TRAIL_LENGTH;

    if (shipRect && shipRect.ready && circleHitsRect(p.x, p.y, PROJECTILE.RADIUS_PX, shipRect)) {
      hits.push({ x: p.x, y: p.y });
      state.projectiles.splice(i, 1);
      continue;
    }

    if (p.life <= 0 || p.y < -80) {
      state.projectiles.splice(i, 1);
    }
  }
  return hits;
}

/**
 * Draw active projectiles with glow + short trail.
 */
export function drawProjectiles(ctx, state) {
  if (!state.projectiles.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i];

    for (let t = 0; t < p.trail.length; t++) {
      const tp = p.trail[t];
      const f = 1 - t / Math.max(1, p.trail.length);
      ctx.fillStyle = `rgba(255,205,90,${0.32 * f})`;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 1.8 + 2.8 * f, 0, Math.PI * 2);
      ctx.fill();
    }

    const topY = p.y - 24;
    const grad = ctx.createLinearGradient(p.x, topY, p.x, p.y + 8);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.65, 'rgba(255,230,140,0.9)');
    grad.addColorStop(1, 'rgba(120,255,255,0.35)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,230,130,0.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(p.x, topY);
    ctx.lineTo(p.x, p.y + 4);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
