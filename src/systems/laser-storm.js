import { SCENE, MAX_ACTIVE_LASER_BEAMS, MAX_LASER_SMOKE } from '../constants.js';
import { clamp } from '../utils/math.js';
import { quantize } from '../utils/math.js';

/**
 * Laser storm system — beam physics, gradient caching, smoke particles, rendering.
 * Extracted from main.js (S7R-082). No global state; all mutable data passed in.
 */

// ── Internal gradient caches ────────────────────────────────────

const laserBeamGradientCache = [];
const laserSourceGradientCache = [];

// ── Internal helpers ────────────────────────────────────────────

function removeBySwapPop(list, index) {
  list[index] = list[list.length - 1];
  list.pop();
}

function getCachedLaserSourceGradient(ctx, index, x, y, radius, srcGlow, hue) {
  const qX = quantize(x, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qY = quantize(y, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qRadius = Math.max(2, quantize(radius, 2));
  const qGlow = clamp(quantize(srcGlow, SCENE.LASER_GRADIENT_ALPHA_STEP), 0, 1);
  const qHue = ((quantize(hue, SCENE.LASER_GRADIENT_HUE_STEP) % 360) + 360) % 360;
  const key = `${qX}|${qY}|${qRadius}|${qGlow}|${qHue}`;

  let cached = laserSourceGradientCache[index];
  if (!cached || cached.key !== key) {
    const gradient = ctx.createRadialGradient(qX, qY, 0, qX, qY, qRadius);
    gradient.addColorStop(0, `rgba(255,255,255,${0.9 * qGlow})`);
    gradient.addColorStop(0.5, `hsla(${qHue},100%,70%,${0.46 * qGlow})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    cached = { key, gradient };
    laserSourceGradientCache[index] = cached;
  }
  return cached.gradient;
}

function getCachedLaserBeamGradient(ctx, index, srcX, srcY, endX, endY, hue, alpha, inertFactor) {
  const qSrcX = quantize(srcX, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qSrcY = quantize(srcY, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qEndX = quantize(endX, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qEndY = quantize(endY, SCENE.LASER_GRADIENT_POS_STEP_PX);
  const qHue = ((quantize(hue, SCENE.LASER_GRADIENT_HUE_STEP) % 360) + 360) % 360;
  const qAlpha = clamp(quantize(alpha, SCENE.LASER_GRADIENT_ALPHA_STEP), 0, 1);
  const qInert = clamp(quantize(inertFactor, SCENE.LASER_GRADIENT_ALPHA_STEP), 0, 1);
  const key = `${qSrcX}|${qSrcY}|${qEndX}|${qEndY}|${qHue}|${qAlpha}|${qInert}`;

  let cached = laserBeamGradientCache[index];
  if (!cached || cached.key !== key) {
    const gradient = ctx.createLinearGradient(qSrcX, qSrcY, qEndX, qEndY);
    gradient.addColorStop(0, `hsla(${qHue},100%,90%,${0.94 * qAlpha * qInert})`);
    gradient.addColorStop(0.25, `hsla(${(qHue + 28) % 360},100%,70%,${0.7 * qAlpha * qInert})`);
    gradient.addColorStop(1, `hsla(${(qHue + 55) % 360},100%,62%,${0.22 * qAlpha * qInert})`);
    cached = { key, gradient };
    laserBeamGradientCache[index] = cached;
  }
  return cached.gradient;
}

function updateLaserBounceTip(beam, dt, sourceX, sourceY) {
  if (!beam.bouncePath || beam.bouncePath.length < 2) {
    beam.life -= dt * SCENE.LASER_BOUNCE_FADE_RATE;
    return;
  }

  beam.inertElapsed += dt;
  const segCount = beam.bouncePath.length - 1;
  const tNorm = clamp(beam.inertElapsed / beam.inertDuration, 0, 1);
  const travel = tNorm * segCount;
  const seg = Math.min(segCount - 1, Math.floor(travel));
  const localT = travel - seg;
  const p0 = beam.bouncePath[seg];
  const p1 = beam.bouncePath[seg + 1];
  beam.tipX = p0.x + (p1.x - p0.x) * localT;
  beam.tipY = p0.y + (p1.y - p0.y) * localT;

  if (seg !== beam.bounceStage) {
    beam.bounceStage = seg;
    beam.bouncesRemaining = Math.max(0, SCENE.LASER_BOUNCE_SEGMENTS - (seg + 1));
  }

  if (beam.inertElapsed >= beam.inertDuration) {
    beam.life -= dt * SCENE.LASER_BOUNCE_OVERDRIVE_FADE_RATE;
  }

  beam.angle = Math.atan2(beam.tipY - sourceY, beam.tipX - sourceX);
}

function getInertBeamPolylinePoints(beam) {
  if (!beam.bouncePath || beam.bouncePath.length < 2) return null;
  const segCount = beam.bouncePath.length - 1;
  const tNorm = clamp(beam.inertElapsed / Math.max(0.0001, beam.inertDuration), 0, 1);
  const travel = tNorm * segCount;
  const seg = Math.min(segCount - 1, Math.floor(travel));
  const localT = travel - seg;
  const p0 = beam.bouncePath[seg];
  const p1 = beam.bouncePath[seg + 1];
  const tip = {
    x: p0.x + (p1.x - p0.x) * localT,
    y: p0.y + (p1.y - p0.y) * localT,
  };

  const points = [{ x: beam.sourceX, y: beam.sourceY }, beam.bouncePath[0]];
  for (let i = 1; i <= seg; i++) points.push(beam.bouncePath[i]);
  points.push(tip);
  return points;
}

// ── Exported functions ──────────────────────────────────────────

/**
 * Trigger post-hit bounce animation on a beam.
 * Called from main.js when a beam accumulates enough hits.
 */
export function startLaserPostHitBounce(beam, sourceX, sourceY, { wCSS, hCSS, rng }) {
  if (beam.inert) return;
  beam.inert = true;
  beam.bouncesRemaining = SCENE.LASER_BOUNCE_SEGMENTS;
  beam.inertElapsed = 0;
  beam.inertDuration = SCENE.LASER_BOUNCE_INERT_DURATION;
  beam.bounceStage = -1;

  const startX = clamp(sourceX + Math.cos(beam.angle) * beam.length * SCENE.LASER_BOUNCE_CLAMP_INERT, 0, wCSS);
  const startY = clamp(sourceY + Math.sin(beam.angle) * beam.length * SCENE.LASER_BOUNCE_CLAMP_INERT, 0, hCSS);
  const sides = ['left', 'top', 'right', 'bottom'];
  const offset = (rng() * 4) | 0;
  const ordered = [
    sides[offset],
    sides[(offset + 1) % 4],
    sides[(offset + 2) % 4],
    sides[(offset + 3) % 4],
  ];
  const points = [{ x: startX, y: startY }];
  for (let i = 0; i < ordered.length; i++) {
    const side = ordered[i];
    if (side === 'left') points.push({ x: 0, y: rng() * hCSS });
    else if (side === 'right') points.push({ x: wCSS, y: rng() * hCSS });
    else if (side === 'top') points.push({ x: rng() * wCSS, y: 0 });
    else points.push({ x: rng() * wCSS, y: hCSS });
  }

  beam.bouncePath = points;
  beam.tipX = startX;
  beam.tipY = startY;
  beam.life = Math.max(beam.life, SCENE.LASER_BOUNCE_LIFE_MIN);
}

/**
 * Update all laser beams and populate segments for collision detection.
 */
export function updateLaserStorm(laserStorm, {
  now, dt, wCSS, hCSS, rng,
  badguysRenderReady, badguysLightAnchors, getScreenPoint,
  getAdaptiveCapValue,
}) {
  laserStorm.segments.length = 0;
  laserStorm.sourceBurst = Math.max(0, laserStorm.sourceBurst - dt * SCENE.LASER_SOURCE_BURST_DECAY);

  if (!(laserStorm.enabled && badguysRenderReady)) return;
  const maxLaserBeams = Math.max(
    2,
    Math.floor(getAdaptiveCapValue('maxActiveLaserBeams', MAX_ACTIVE_LASER_BEAMS))
  );

  const fallbackAnchors = [{ x: 0.5, y: 0.69 }];
  const anchors = badguysLightAnchors.length ? badguysLightAnchors : fallbackAnchors;
  laserStorm.spawnCarry += dt * (SCENE.LASER_SPAWN_RATE_BASE + anchors.length * SCENE.LASER_SPAWN_RATE_PER_ANCHOR);

  while (laserStorm.spawnCarry >= 1 && laserStorm.beams.length < maxLaserBeams) {
    laserStorm.spawnCarry -= 1;
    const anchorIndex = (rng() * anchors.length) | 0;
    const idx = ((anchorIndex % anchors.length) + anchors.length) % anchors.length;
    const src = getScreenPoint(anchors[idx]);
    const baseAngle =
      rng() < SCENE.LASER_BEAM_BASE_ANGLE_DOWN_BIAS
        ? Math.PI / 2 + (rng() - 0.5) * SCENE.LASER_BEAM_BASE_ANGLE_SPREAD
        : rng() * Math.PI * 2;
    const jitterFreq = SCENE.LASER_BEAM_JITTER_FREQ_MIN + rng() * SCENE.LASER_BEAM_JITTER_FREQ_RANGE;
    const jitterAmp = SCENE.LASER_BEAM_JITTER_AMP_MIN + rng() * SCENE.LASER_BEAM_JITTER_AMP_RANGE;
    const sweepVel = (rng() - 0.5) * (SCENE.LASER_BEAM_SWEEP_VEL_BASE + rng() * SCENE.LASER_BEAM_SWEEP_VEL_RANGE);
    const length = Math.hypot(wCSS, hCSS) * (SCENE.LASER_BEAM_LENGTH_MULT_MIN + rng() * SCENE.LASER_BEAM_LENGTH_MULT_RANGE);
    const life = SCENE.LASER_BEAM_LIFE_MIN + rng() * SCENE.LASER_BEAM_LIFE_RANGE;

    laserStorm.beams.push({
      anchorIndex,
      sourceX: src.x,
      sourceY: src.y,
      angle: baseAngle,
      angVel: sweepVel,
      targetVel: sweepVel,
      nextJoltAt: now + 120 + rng() * 360,
      jitterFreq,
      jitterAmp,
      jitterPhase: rng() * Math.PI * 2,
      length,
      life,
      lifeMax: life,
      hue: (now * SCENE.LASER_BEAM_HUE_SPEED + rng() * 360) % 360,
      width: SCENE.LASER_BEAM_WIDTH_MIN + rng() * SCENE.LASER_BEAM_WIDTH_RANGE,
      power: SCENE.LASER_BEAM_POWER_MIN + rng() * SCENE.LASER_BEAM_POWER_RANGE,
      hitCount: 0,
      nextHitAt: 0,
      inert: false,
      bouncesRemaining: 0,
      inertElapsed: 0,
      inertDuration: SCENE.LASER_BOUNCE_INERT_DURATION,
      bounceStage: -1,
      bouncePath: null,
      tipX: src.x + Math.cos(baseAngle) * length,
      tipY: src.y + Math.sin(baseAngle) * length,
    });
  }
  if (laserStorm.beams.length > maxLaserBeams) {
    const overflow = laserStorm.beams.length - maxLaserBeams;
    for (let i = 0; i < overflow; i++) {
      laserStorm.beams[i].life = Math.min(laserStorm.beams[i].life, 0.08);
    }
  }
  if (laserStorm.beams.length >= maxLaserBeams) {
    laserStorm.spawnCarry = Math.min(laserStorm.spawnCarry, 0.5);
  }

  for (let i = laserStorm.beams.length - 1; i >= 0; i--) {
    const b = laserStorm.beams[i];
    const aIdx = ((b.anchorIndex % anchors.length) + anchors.length) % anchors.length;
    const src = getScreenPoint(anchors[aIdx]);
    b.sourceX = src.x;
    b.sourceY = src.y;
    b.life -= dt;

    if (!b.inert) {
      if (now >= b.nextJoltAt) {
        b.targetVel = (rng() - 0.5) * (SCENE.LASER_JOLT_VEL_BASE + rng() * SCENE.LASER_JOLT_VEL_RANGE);
        b.nextJoltAt = now + SCENE.LASER_JOLT_INTERVAL_MIN + rng() * SCENE.LASER_JOLT_INTERVAL_RANGE;
      }
      const velEase = Math.min(1, dt * SCENE.LASER_VEL_EASE_FACTOR);
      b.angVel += (b.targetVel - b.angVel) * velEase;
      const jitter = Math.sin(now * b.jitterFreq + b.jitterPhase) * b.jitterAmp;
      b.angle += (b.angVel + jitter) * dt;
      b.tipX = src.x + Math.cos(b.angle) * b.length;
      b.tipY = src.y + Math.sin(b.angle) * b.length;
    } else {
      updateLaserBounceTip(b, dt, src.x, src.y);
    }

    if (!b.inert) {
      laserStorm.segments.push({
        x1: src.x,
        y1: src.y,
        x2: b.tipX,
        y2: b.tipY,
        sourceX: src.x,
        sourceY: src.y,
        hue: b.hue,
        power: b.power,
        width: b.width,
        beam: b,
      });
    }

    if (b.life <= 0) {
      laserStorm.beams.splice(i, 1);
    }
  }
}

/**
 * Render laser beams and source glows.
 */
export function drawLaserStorm(laserStorm, {
  now, ctx, badguysRenderReady, badguysLightAnchors, getScreenPoint,
  getAdaptiveShadowBlurCaps,
}) {
  if (!laserStorm.enabled || !badguysRenderReady) return;
  if (!laserStorm.beams.length && laserStorm.sourceBurst <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const blurCaps = getAdaptiveShadowBlurCaps();

  const pulse = 0.45 + 0.55 * Math.sin(now * 0.018);
  const srcGlow = laserStorm.sourceBurst > 0 ? laserStorm.sourceBurst : 0.16 + pulse * 0.22;
  for (let i = 0; i < badguysLightAnchors.length; i++) {
    const p = getScreenPoint(badguysLightAnchors[i]);
    const glowR = 5 + srcGlow * 16;
    const hue = (now * 0.2 + i * 41) % 360;
    ctx.fillStyle = getCachedLaserSourceGradient(ctx, i, p.x, p.y, glowR, srcGlow, hue);
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < laserStorm.beams.length; i++) {
    const b = laserStorm.beams[i];
    const srcX = b.sourceX;
    const srcY = b.sourceY;
    const alpha = clamp(b.life / Math.max(0.01, b.lifeMax), 0, 1);
    const inertFactor = b.inert ? 0.42 : 1;
    const hue = (b.hue + Math.sin(now * 0.014 + i * 1.7) * 28 + 360) % 360;

    const drawPts = b.inert ? getInertBeamPolylinePoints(b) : null;
    const endX = drawPts ? drawPts[drawPts.length - 1].x : b.tipX;
    const endY = drawPts ? drawPts[drawPts.length - 1].y : b.tipY;
    ctx.strokeStyle = getCachedLaserBeamGradient(
      ctx,
      i,
      srcX,
      srcY,
      endX,
      endY,
      hue,
      alpha,
      inertFactor
    );
    ctx.lineWidth = b.width * (b.inert ? 0.8 : 1.45);
    ctx.lineCap = 'round';
    ctx.shadowColor = `hsla(${hue},100%,72%,${0.65 * alpha * inertFactor})`;
    ctx.shadowBlur = blurCaps.enabled
      ? Math.min(blurCaps.maxShadowBlur, 14 + b.width * 5)
      : 0;
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    if (drawPts) {
      for (let j = 1; j < drawPts.length; j++) ctx.lineTo(drawPts[j].x, drawPts[j].y);
    } else {
      ctx.lineTo(b.tipX, b.tipY);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `hsla(${(hue + 10) % 360},100%,95%,${0.65 * alpha * inertFactor})`;
    ctx.lineWidth = Math.max(1.1, b.width * (b.inert ? 0.18 : 0.28));
    ctx.beginPath();
    ctx.moveTo(srcX, srcY);
    if (drawPts) {
      for (let j = 1; j < drawPts.length; j++) ctx.lineTo(drawPts[j].x, drawPts[j].y);
    } else {
      ctx.lineTo(b.tipX, b.tipY);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Spawn a laser smoke puff at the given position.
 */
export function spawnLaserSmoke(laserStorm, x, y, strength, {
  rng, isLowGraphics, getAdaptiveCapValue,
}) {
  if (isLowGraphics && rng() > SCENE.LASER_SMOKE_LOW_GRAPHICS_CHANCE) return;

  const smokeCap = Math.max(
    SCENE.LASER_SMOKE_MIN_CAP,
    Math.floor(
      getAdaptiveCapValue(
        'maxLaserSmoke',
        isLowGraphics ? Math.floor(MAX_LASER_SMOKE * 0.35) : MAX_LASER_SMOKE
      )
    )
  );
  if (laserStorm.smokePuffs.length >= smokeCap) {
    laserStorm.smokePuffs.splice(0, laserStorm.smokePuffs.length - smokeCap + 1);
  }

  const smokeRateScale = getAdaptiveCapValue('laserSmokeSpawnScale', 1);
  const smokeStrength = (isLowGraphics ? strength * SCENE.LASER_SMOKE_LOW_GRAPHICS_STRENGTH : strength) * smokeRateScale;
  laserStorm.smokePuffs.push({
    x: x + (rng() - 0.5) * 8,
    y: y - 6 + (rng() - 0.5) * 6,
    vx: (rng() - 0.5) * SCENE.LASER_SMOKE_VX_SPREAD * smokeStrength,
    vy: -(SCENE.LASER_SMOKE_VY_BASE + rng() * SCENE.LASER_SMOKE_VY_RANGE * smokeStrength),
    r: SCENE.LASER_SMOKE_R_MIN + rng() * SCENE.LASER_SMOKE_R_RANGE * smokeStrength,
    life: SCENE.LASER_SMOKE_LIFE_MIN + rng() * SCENE.LASER_SMOKE_LIFE_RANGE,
    lifeMax: SCENE.LASER_SMOKE_LIFE_MIN + rng() * SCENE.LASER_SMOKE_LIFE_RANGE,
    grow: SCENE.LASER_SMOKE_GROW_MIN + rng() * SCENE.LASER_SMOKE_GROW_RANGE,
  });
}

/**
 * Update smoke puff positions and lifetimes.
 */
export function updateLaserSmoke(laserStorm, dt) {
  for (let i = laserStorm.smokePuffs.length - 1; i >= 0; i--) {
    const s = laserStorm.smokePuffs[i];
    s.vx *= SCENE.LASER_SMOKE_DRAG;
    s.vy -= SCENE.LASER_SMOKE_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.r += s.grow * dt;
    s.life -= dt;
    if (s.life <= 0) removeBySwapPop(laserStorm.smokePuffs, i);
  }
}

/**
 * Render laser smoke puffs.
 */
export function drawLaserSmoke(laserStorm, ctx) {
  if (!laserStorm.smokePuffs.length) return;
  ctx.save();
  for (let i = 0; i < laserStorm.smokePuffs.length; i++) {
    const s = laserStorm.smokePuffs[i];
    const a = clamp(s.life / Math.max(0.01, s.lifeMax), 0, 1);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, `rgba(205,205,205,${0.35 * a})`);
    g.addColorStop(0.5, `rgba(128,128,128,${0.22 * a})`);
    g.addColorStop(1, 'rgba(80,80,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
