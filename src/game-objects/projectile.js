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
    colorTheme: Math.floor(Math.random() * 4),
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
      p.hitShip = true;
      hits.push({ x: p.x, y: p.y, colorTheme: p.colorTheme });
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
export function drawProjectiles(ctx, state, qualityCaps = null) {
  if (!state.projectiles.length) return;

  const maxShadowBlur = Number.isFinite(qualityCaps?.maxShadowBlur)
    ? Math.max(0, qualityCaps.maxShadowBlur)
    : 18;
  const shadowBlurEnabled =
    typeof qualityCaps?.shadowBlurEnabled === 'boolean'
      ? qualityCaps.shadowBlurEnabled
      : maxShadowBlur > 0;
  const projectileShadowBlur = shadowBlurEnabled ? Math.min(18, maxShadowBlur) : 0;

  // 0: cyan/white, 1: magenta/pink, 2: gold/orange, 3: green/lime
  const THEMES = [
    { main: '0,255,255', glow: '120,255,255' },
    { main: '255,0,255', glow: '255,120,255' },
    { main: '255,165,0', glow: '255,230,130' },
    { main: '50,255,50', glow: '180,255,180' },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i];
    const theme = THEMES[p.colorTheme] || THEMES[0];

    // Particle trail
    for (let t = 0; t < p.trail.length; t++) {
      const tp = p.trail[t];
      const f = 1 - t / Math.max(1, p.trail.length);
      
      // Drifting fade particles
      if (t % 2 === 0) {
        const driftX = (Math.sin(t * 0.8 + p.x) * 2);
        ctx.fillStyle = `rgba(${theme.main},${0.4 * f})`;
        ctx.beginPath();
        ctx.arc(tp.x + driftX, tp.y, 1.5 + 2.5 * f, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Motion streak
    if (p.trail.length > 0) {
      const tail = p.trail[p.trail.length - 1];
      const grad = ctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
      grad.addColorStop(0, `rgba(${theme.main},0)`);
      grad.addColorStop(1, `rgba(${theme.main},0.4)`);
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Energy bolt head (Orb)
    // Outer glow
    ctx.fillStyle = `rgba(${theme.main}, 0.2)`;
    ctx.shadowColor = `rgba(${theme.glow}, 0.9)`;
    ctx.shadowBlur = projectileShadowBlur;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner color
    ctx.fillStyle = `rgba(${theme.main}, 0.6)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Core white
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
