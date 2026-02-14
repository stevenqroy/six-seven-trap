import { SHIELD } from '../constants.js';
import {
  clamp,
  lerp,
  toFinite,
  toNonNegativeFinite,
} from '../utils/defensive.js';

const TAU = Math.PI * 2;
const MAX_TOTAL_PARTICLES = 30;
const MAX_SPARKLES = 20;
const MAX_BURST_PARTICLES = MAX_TOTAL_PARTICLES - MAX_SPARKLES;
const MAX_ARCS = 5;
const MIN_ARCS = 3;
const ARC_REFRESH_MIN_MS = 150;
const ARC_REFRESH_MAX_MS = 300;
const IMPACT_FLASH_MS = 420;
const RIPPLE_WINDOW_MS = 420;

const SHADOW_CAPS_BY_TIER = Object.freeze({
  high: Object.freeze({ shadowBlurEnabled: true, maxShadowBlur: 18 }),
  medium: Object.freeze({ shadowBlurEnabled: true, maxShadowBlur: 10 }),
  low: Object.freeze({ shadowBlurEnabled: false, maxShadowBlur: 0 }),
});

const SPARKLE_PALETTE = Object.freeze([
  [255, 255, 255], // white
  [120, 255, 255], // cyan
  [255, 222, 145], // gold
]);

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function mixColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function colorToRgba(color, alpha) {
  return `rgba(${color[0]},${color[1]},${color[2]},${clamp(alpha, 0, 1)})`;
}

function getShieldPalette(remainingRatio) {
  const brightCyan = [120, 255, 255];
  const dullBlue = [92, 130, 220];
  const dangerRed = [225, 95, 120];

  let border;
  if (remainingRatio > 0.45) {
    const t = clamp((1 - remainingRatio) / 0.55, 0, 1);
    border = mixColor(brightCyan, dullBlue, t);
  } else {
    const t = clamp((0.45 - remainingRatio) / 0.45, 0, 1);
    border = mixColor(dullBlue, dangerRed, t);
  }

  return {
    border,
    fill: mixColor(border, [255, 255, 255], 0.16),
    electric: mixColor(border, [180, 245, 255], 0.35),
  };
}

function getQualityCaps(state, qualityCaps) {
  if (qualityCaps && typeof qualityCaps === 'object') {
    return qualityCaps;
  }
  const tierName = typeof state?.qualityTier === 'string' ? state.qualityTier : 'high';
  return SHADOW_CAPS_BY_TIER[tierName] || SHADOW_CAPS_BY_TIER.high;
}

function getShadowBlurCap(state, qualityCaps) {
  const caps = getQualityCaps(state, qualityCaps);
  const maxShadowBlur = Number.isFinite(caps?.maxShadowBlur)
    ? Math.max(0, caps.maxShadowBlur)
    : 18;
  const shadowBlurEnabled = typeof caps?.shadowBlurEnabled === 'boolean'
    ? caps.shadowBlurEnabled
    : maxShadowBlur > 0;
  return shadowBlurEnabled ? Math.min(16, maxShadowBlur) : 0;
}

function makePerimeterPoint(centerX, centerY, radius, angle) {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function makeControlPoint(centerX, centerY, from, to, radius) {
  const mx = (from.x + to.x) * 0.5;
  const my = (from.y + to.y) * 0.5;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const jitter = randomRange(-radius * 0.16, radius * 0.16);
  let x = mx + nx * jitter;
  let y = my + ny * jitter;

  const ox = x - centerX;
  const oy = y - centerY;
  const dist = Math.hypot(ox, oy);
  const cap = radius * 0.95;
  if (dist > cap) {
    const scale = cap / dist;
    x = centerX + ox * scale;
    y = centerY + oy * scale;
  }

  return { x, y };
}

function makeJitteredInnerPoint(centerX, centerY, start, end, radius, t) {
  const baseX = lerp(start.x, end.x, t);
  const baseY = lerp(start.y, end.y, t);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const jitter = randomRange(-radius * 0.22, radius * 0.22);
  let x = baseX + nx * jitter;
  let y = baseY + ny * jitter;

  const ox = x - centerX;
  const oy = y - centerY;
  const dist = Math.hypot(ox, oy);
  const cap = radius * 0.9;
  if (dist > cap) {
    const scale = cap / dist;
    x = centerX + ox * scale;
    y = centerY + oy * scale;
  }

  return { x, y };
}

function buildArc(centerX, centerY, radius) {
  const startAngle = randomRange(0, TAU);
  const sweep = randomRange(Math.PI * 0.45, Math.PI * 1.25);
  const endAngle = startAngle + (Math.random() < 0.5 ? sweep : -sweep);
  const start = makePerimeterPoint(centerX, centerY, radius, startAngle);
  const end = makePerimeterPoint(centerX, centerY, radius, endAngle);
  const segmentCount = Math.random() < 0.45 ? 2 : 3;
  const segments = [];
  let from = start;

  for (let i = 1; i <= segmentCount; i += 1) {
    const to = i === segmentCount
      ? end
      : makeJitteredInnerPoint(centerX, centerY, start, end, radius, i / segmentCount);
    const c1 = makeControlPoint(centerX, centerY, from, to, radius);
    const c2 = makeControlPoint(centerX, centerY, from, to, radius);
    segments.push({
      c1x: c1.x,
      c1y: c1.y,
      c2x: c2.x,
      c2y: c2.y,
      x: to.x,
      y: to.y,
    });
    from = to;
  }

  return {
    startX: start.x,
    startY: start.y,
    segments,
    width: randomRange(1.2, 2.5),
    flickerPhase: randomRange(0, TAU),
  };
}

function resetSparkle(sparkle) {
  let speed = randomRange(0.45, 1.25);
  if (Math.random() < 0.5) speed *= -1;
  sparkle.angle = randomRange(0, TAU);
  sparkle.speed = speed;
  sparkle.size = randomRange(2, 5);
  sparkle.orbitOffset = randomRange(-10, 8);
  sparkle.twinkleRate = randomRange(0.005, 0.015);
  sparkle.twinklePhase = randomRange(0, TAU);
  sparkle.orbitJitterPhase = randomRange(0, TAU);
  sparkle.orbitJitterRate = randomRange(0.003, 0.009);
  sparkle.colorIndex = Math.floor(randomRange(0, SPARKLE_PALETTE.length));
}

function resetBurstParticle(particle) {
  particle.active = false;
  particle.x = 0;
  particle.y = 0;
  particle.vx = 0;
  particle.vy = 0;
  particle.life = 0;
  particle.maxLife = 0;
  particle.size = 0;
  particle.colorIndex = 0;
}

function ensureShieldFxState(shieldState, now) {
  if (!shieldState.fx || typeof shieldState.fx !== 'object') {
    shieldState.fx = {};
  }
  const fx = shieldState.fx;

  if (!Array.isArray(fx.sparkles)) fx.sparkles = [];
  while (fx.sparkles.length < MAX_SPARKLES) {
    const sparkle = {};
    resetSparkle(sparkle);
    fx.sparkles.push(sparkle);
  }

  if (!Array.isArray(fx.burstParticles)) fx.burstParticles = [];
  while (fx.burstParticles.length < MAX_BURST_PARTICLES) {
    const particle = {};
    resetBurstParticle(particle);
    fx.burstParticles.push(particle);
  }

  if (!Array.isArray(fx.arcs)) fx.arcs = [];
  if (!Number.isFinite(fx.lastDrawAt)) fx.lastDrawAt = now;
  if (!Number.isFinite(fx.lastStartedAt)) fx.lastStartedAt = -Infinity;
  if (!Number.isFinite(fx.lastRippleAt)) fx.lastRippleAt = -Infinity;
  if (!Number.isFinite(fx.impactAngle)) fx.impactAngle = 0;
  if (!Number.isFinite(fx.impactPulseAt)) fx.impactPulseAt = -Infinity;
  if (!Number.isFinite(fx.nextArcRefreshAt)) fx.nextArcRefreshAt = now;
  if (!fx.impactGradientCache || typeof fx.impactGradientCache !== 'object') {
    fx.impactGradientCache = { key: '', gradient: null };
  }

  return fx;
}

function refreshArcs(fx, centerX, centerY, radius) {
  fx.arcs.length = 0;
  for (let i = 0; i < MAX_ARCS; i += 1) {
    fx.arcs.push(buildArc(centerX, centerY, radius));
  }
}

function spawnBurstParticles(fx, mode, centerX, centerY, radius, impactAngle = 0) {
  const minCount = mode === 'impact' ? 8 : 10;
  const maxCount = mode === 'impact' ? 12 : 12;
  const count = Math.floor(randomRange(minCount, maxCount + 1));

  for (let i = 0; i < fx.burstParticles.length; i += 1) {
    const particle = fx.burstParticles[i];
    if (i >= count) continue;

    if (mode === 'impact') {
      const originX = centerX + Math.cos(impactAngle) * radius;
      const originY = centerY + Math.sin(impactAngle) * radius;
      const direction = impactAngle + randomRange(-0.8, 0.8);
      const speed = randomRange(140, 300);
      particle.x = originX;
      particle.y = originY;
      particle.vx = Math.cos(direction) * speed;
      particle.vy = Math.sin(direction) * speed;
      particle.life = randomRange(0.12, 0.24);
      particle.maxLife = particle.life;
      particle.size = randomRange(2.4, 4.8);
      particle.colorIndex = Math.floor(randomRange(0, SPARKLE_PALETTE.length));
      particle.active = true;
      continue;
    }

    const angle = randomRange(0, TAU);
    const speed = randomRange(110, 240);
    particle.x = centerX;
    particle.y = centerY;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = randomRange(0.18, 0.36);
    particle.maxLife = particle.life;
    particle.size = randomRange(2.2, 4.2);
    particle.colorIndex = Math.floor(randomRange(0, SPARKLE_PALETTE.length));
    particle.active = true;
  }
}

function drawSparkles(ctx, fx, centerX, centerY, radius, now, dtSeconds, alpha, remainingRatio) {
  const activeCount = clamp(Math.round(6 + remainingRatio * 14), 6, MAX_SPARKLES);
  const brightnessScale = 0.45 + remainingRatio * 0.55;

  for (let i = 0; i < fx.sparkles.length; i += 1) {
    const sparkle = fx.sparkles[i];
    sparkle.angle += sparkle.speed * dtSeconds;
    if (sparkle.angle > TAU) sparkle.angle -= TAU;
    if (sparkle.angle < 0) sparkle.angle += TAU;
    if (i >= activeCount) continue;

    const orbitJitter = Math.sin(now * sparkle.orbitJitterRate + sparkle.orbitJitterPhase) * 3.2;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * sparkle.twinkleRate + sparkle.twinklePhase));
    const orbitRadius = radius + sparkle.orbitOffset + orbitJitter;
    const x = centerX + Math.cos(sparkle.angle) * orbitRadius;
    const y = centerY + Math.sin(sparkle.angle) * orbitRadius;
    const drawSize = sparkle.size * (0.5 + twinkle * 0.7);
    const drawAlpha = alpha * brightnessScale * twinkle;
    const color = SPARKLE_PALETTE[sparkle.colorIndex] || SPARKLE_PALETTE[0];

    ctx.fillStyle = colorToRgba(color, drawAlpha);
    ctx.beginPath();
    ctx.arc(x, y, drawSize, 0, TAU);
    ctx.fill();
  }
}

function drawBurstParticles(ctx, fx, dtSeconds, alpha) {
  for (let i = 0; i < fx.burstParticles.length; i += 1) {
    const particle = fx.burstParticles[i];
    if (!particle.active) continue;
    particle.life -= dtSeconds;
    if (particle.life <= 0 || particle.maxLife <= 0) {
      particle.active = false;
      continue;
    }

    particle.x += particle.vx * dtSeconds;
    particle.y += particle.vy * dtSeconds;
    particle.vx *= 0.94;
    particle.vy *= 0.94;

    const lifeRatio = clamp(particle.life / particle.maxLife, 0, 1);
    const glowAlpha = alpha * lifeRatio * 0.95;
    const color = SPARKLE_PALETTE[particle.colorIndex] || SPARKLE_PALETTE[0];

    ctx.fillStyle = colorToRgba(color, glowAlpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (0.4 + lifeRatio * 0.6), 0, TAU);
    ctx.fill();
  }
}

function getCachedImpactGradient(ctx, fx, centerX, centerY, outerRadius) {
  const canvasWidth = ctx.canvas?.width || 0;
  const canvasHeight = ctx.canvas?.height || 0;
  const key = [
    Math.round(centerX),
    Math.round(centerY),
    Math.round(outerRadius),
    canvasWidth,
    canvasHeight,
  ].join(':');

  if (fx.impactGradientCache.key === key && fx.impactGradientCache.gradient) {
    return fx.impactGradientCache.gradient;
  }

  const gradient = ctx.createRadialGradient(centerX, centerY, outerRadius * 0.22, centerX, centerY, outerRadius);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.72, 'rgba(120,220,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,120,140,0.5)');
  fx.impactGradientCache = { key, gradient };
  return gradient;
}

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
export function drawShield(ctx, cx, anchorY, state, now, qualityCaps = null) {
  const alpha = getShieldAlpha(state, now);
  if (alpha <= 0.001) return;

  const shieldState = state?.shield;
  if (!shieldState || typeof shieldState !== 'object') return;

  const fx = ensureShieldFxState(shieldState, now);
  const centerX = cx;
  const centerY = anchorY + 18;
  const radius = SHIELD.RADIUS_PX * (0.98 + 0.02 * Math.sin(now * 0.01));
  const elapsed = toNonNegativeFinite(now - shieldState.startedAt, 0);
  const remainingRatio = clamp((SHIELD.DURATION_MS - elapsed) / SHIELD.DURATION_MS, 0, 1);
  const palette = getShieldPalette(remainingRatio);
  const dtMs = clamp(toNonNegativeFinite(now - fx.lastDrawAt, 0), 0, 100);
  const dtSeconds = dtMs / 1000;
  fx.lastDrawAt = now;

  const shadowBlurCap = getShadowBlurCap(state, qualityCaps);
  const sparkleShadowBlur = shadowBlurCap > 0 ? Math.max(2, shadowBlurCap * 0.55) : 0;
  const electricShadowBlur = shadowBlurCap > 0 ? Math.max(2, shadowBlurCap * 0.8) : 0;

  // Activation burst on first frame after shield start.
  if (toFinite(shieldState.startedAt, -Infinity) > fx.lastStartedAt) {
    fx.lastStartedAt = shieldState.startedAt;
    spawnBurstParticles(fx, 'activation', centerX, centerY, radius);
  }

  // Impact burst + edge pulse when shield reports a new hit ripple.
  if (toFinite(shieldState.rippleAt, -Infinity) > fx.lastRippleAt) {
    fx.lastRippleAt = shieldState.rippleAt;
    fx.impactAngle = (shieldState.rippleAt * 0.014) % TAU;
    fx.impactPulseAt = shieldState.rippleAt;
    spawnBurstParticles(fx, 'impact', centerX, centerY, radius, fx.impactAngle);
  }

  if (now >= fx.nextArcRefreshAt) {
    refreshArcs(fx, centerX, centerY, radius);
    fx.nextArcRefreshAt = now + randomRange(ARC_REFRESH_MIN_MS, ARC_REFRESH_MAX_MS);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  ctx.fillStyle = colorToRgba(palette.fill, 0.16 * alpha);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.fill();

  ctx.fillStyle = colorToRgba([255, 255, 255], 0.08 * alpha * remainingRatio);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.7, 0, TAU);
  ctx.fill();

  if (remainingRatio < 0.25) {
    ctx.setLineDash([9, 7, 5, 8]);
    ctx.lineDashOffset = -now * 0.035;
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = colorToRgba(palette.border, 0.62 * alpha);
  ctx.lineWidth = lerp(1.8, 2.8, remainingRatio);
  ctx.shadowColor = colorToRgba(palette.electric, 0.85 * alpha);
  ctx.shadowBlur = shadowBlurCap;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * (0.985 + 0.015 * Math.sin(now * 0.018)), 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowBlur = sparkleShadowBlur;
  drawSparkles(ctx, fx, centerX, centerY, radius, now, dtSeconds, alpha, remainingRatio);

  const arcCount = clamp(Math.round(MIN_ARCS + remainingRatio * (MAX_ARCS - MIN_ARCS)), MIN_ARCS, MAX_ARCS);
  for (let arcIndex = 0; arcIndex < arcCount; arcIndex += 1) {
    const arc = fx.arcs[arcIndex];
    if (!arc) continue;
    const flicker = 0.5 + 0.5 * Math.sin(now * 0.05 + arc.flickerPhase);
    const arcAlpha = alpha * (0.14 + 0.56 * remainingRatio) * (0.55 + flicker * 0.45);
    ctx.strokeStyle = colorToRgba(palette.electric, arcAlpha);
    ctx.lineWidth = arc.width * (0.75 + remainingRatio * 0.5);
    ctx.shadowColor = colorToRgba(palette.electric, arcAlpha);
    ctx.shadowBlur = electricShadowBlur;
    ctx.beginPath();
    ctx.moveTo(arc.startX, arc.startY);
    for (let segmentIndex = 0; segmentIndex < arc.segments.length; segmentIndex += 1) {
      const segment = arc.segments[segmentIndex];
      ctx.bezierCurveTo(
        segment.c1x,
        segment.c1y,
        segment.c2x,
        segment.c2y,
        segment.x,
        segment.y,
      );
    }
    ctx.stroke();
  }

  const rippleAge = now - shieldState.rippleAt;
  if (rippleAge >= 0 && rippleAge <= RIPPLE_WINDOW_MS) {
    const t = rippleAge / RIPPLE_WINDOW_MS;
    const rippleRadius = radius * (0.22 + t * 0.86);
    const rippleAlpha = (1 - t) * 0.55 * alpha;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colorToRgba([210, 255, 255], rippleAlpha);
    ctx.lineWidth = 3 - t * 1.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleRadius, 0, TAU);
    ctx.stroke();
  }

  const impactAge = now - fx.impactPulseAt;
  if (impactAge >= 0 && impactAge <= IMPACT_FLASH_MS && ctx.canvas) {
    const edgePulse = 1 - impactAge / IMPACT_FLASH_MS;
    const pulseRadius = Math.max(ctx.canvas.width, ctx.canvas.height);
    const impactGradient = getCachedImpactGradient(ctx, fx, centerX, centerY, pulseRadius);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = edgePulse * alpha;
    ctx.fillStyle = impactGradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = sparkleShadowBlur;
  drawBurstParticles(ctx, fx, dtSeconds, alpha);

  ctx.restore();
}
