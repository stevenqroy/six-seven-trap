// Danger beam system — oscillation, rendering, geometry, ember/sizzle particles.
// Extracted from main.js (S7R-083).

import { SCENE } from '../constants.js';
import { clamp, quantize } from '../utils/math.js';
import { hitVisibleCharacterPixel, estimateCharacterNormal } from '../utils/sprite.js';

function removeBySwapPop(list, index) {
  list[index] = list[list.length - 1];
  list.pop();
}

// ── Oscillation (internal) ──────────────────────────────────────────

function getDangerBeamOscillation(now, dangerBeam) {
  const quantizedNow = quantize(now, SCENE.DANGER_BEAM_OSC_STEP_MS);
  const widthMod =
    1 +
    Math.sin(quantizedNow * dangerBeam.speedA + dangerBeam.phaseA) * dangerBeam.widthAmp * SCENE.DANGER_BEAM_WIDTH_AMP_A +
    Math.sin(quantizedNow * dangerBeam.speedB + dangerBeam.phaseB) * dangerBeam.widthAmp * SCENE.DANGER_BEAM_WIDTH_AMP_B;
  const lenOsc =
    0.5 +
    0.5 *
      (Math.sin(quantizedNow * (dangerBeam.speedA * SCENE.DANGER_BEAM_LEN_OSC_A_MULT) + dangerBeam.phaseB) * SCENE.DANGER_BEAM_LEN_OSC_A_WEIGHT +
        Math.sin(quantizedNow * (dangerBeam.speedB * SCENE.DANGER_BEAM_LEN_OSC_B_MULT) + dangerBeam.phaseA) * SCENE.DANGER_BEAM_LEN_OSC_B_WEIGHT);
  const lengthFactor = clamp(
    dangerBeam.lengthMin + (dangerBeam.lengthMax - dangerBeam.lengthMin) * lenOsc,
    dangerBeam.lengthMin,
    dangerBeam.lengthMax
  );
  return {
    widthMod,
    lengthFactor,
    tSec: quantizedNow * 0.001,
    bottomWidthScale:
      SCENE.DANGER_BEAM_BOTTOM_WIDTH_BASE +
      SCENE.DANGER_BEAM_BOTTOM_WIDTH_MOD * (widthMod - 1) +
      SCENE.DANGER_BEAM_BOTTOM_WIDTH_SIN * Math.sin(quantizedNow * 0.0025 + 1.3),
  };
}

// ── Geometry (exported for beam harvest) ────────────────────────────

export function getDangerBeamGeometry(now, { badguysRender, dangerBeam, hCSS }) {
  if (!badguysRender.ready || !dangerBeam.enabled) return null;
  const originX = badguysRender.x + badguysRender.w * 0.5 + dangerBeam.offsetX;
  const originY = badguysRender.y + badguysRender.h * SCENE.DANGER_BEAM_ORIGIN_Y_RATIO + dangerBeam.offsetY;
  const oscillation = getDangerBeamOscillation(now, dangerBeam);
  const lengthFactor = oscillation.lengthFactor;
  const beamBottom = originY + (hCSS - originY) * lengthFactor;
  const beamHeight = beamBottom - originY;
  if (beamHeight <= 0) return null;
  const topWidth = badguysRender.w * dangerBeam.widthRatio;
  const bottomWidth = topWidth * oscillation.bottomWidthScale;
  return { originX, originY, beamBottom, beamHeight, topWidth, bottomWidth };
}

// ── Draw danger beam ────────────────────────────────────────────────

export function drawDangerBeam(now, {
  ctx, badguysRender, dangerBeam, hCSS, isDangerDanger,
  regularBeamHarvest, getAdaptiveCapValue,
}) {
  if (!badguysRender.ready || !dangerBeam.enabled) return;

  const originX = badguysRender.x + badguysRender.w * 0.5 + dangerBeam.offsetX;
  const originY = badguysRender.y + badguysRender.h * SCENE.DANGER_BEAM_ORIGIN_Y_RATIO + dangerBeam.offsetY;
  const oscillation = getDangerBeamOscillation(now, dangerBeam);
  const { lengthFactor, tSec } = oscillation;
  const beamBottom = originY + (hCSS - originY) * lengthFactor;
  const beamHeight = beamBottom - originY;
  if (beamHeight <= 0) return;

  const isDangerBeam = isDangerDanger;
  const baseColor = isDangerBeam ? { r: 255, g: 45, b: 45 } : { r: 90, g: 225, b: 255 };
  const pulse = 0.8 + 0.2 * Math.sin(now * 0.006);
  const topWidth = badguysRender.w * dangerBeam.widthRatio;
  const bottomWidth = topWidth * oscillation.bottomWidthScale;
  const hueShift = 18 * Math.sin(tSec * 1.7 + dangerBeam.huePhase);
  const gBase = clamp(baseColor.g + hueShift, 0, 255);
  const bBase = clamp(baseColor.b + hueShift * 1.2, 0, 255);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Main tapered beam body.
  const beamGradient = ctx.createLinearGradient(originX, originY, originX, beamBottom);
  beamGradient.addColorStop(0, `rgba(${baseColor.r}, ${gBase}, ${bBase}, ${0.5 * pulse})`);
  beamGradient.addColorStop(
    0.25,
    `rgba(${baseColor.r}, ${Math.max(0, gBase - 35)}, ${Math.max(0, bBase - 35)}, ${0.34 * pulse})`
  );
  beamGradient.addColorStop(
    0.68,
    `rgba(${baseColor.r}, ${Math.max(0, gBase - 65)}, ${Math.max(0, bBase - 65)}, ${0.2 * pulse})`
  );
  beamGradient.addColorStop(1, `rgba(${baseColor.r}, ${Math.max(0, gBase - 90)}, ${Math.max(0, bBase - 90)}, 0)`);
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(originX - topWidth / 2, originY);
  ctx.lineTo(originX + topWidth / 2, originY);
  ctx.lineTo(originX + bottomWidth / 2, beamBottom);
  ctx.lineTo(originX - bottomWidth / 2, beamBottom);
  ctx.closePath();
  ctx.fill();

  // Inner core.
  const coreGradient = ctx.createLinearGradient(originX, originY, originX, beamBottom);
  coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.52 * pulse})`);
  coreGradient.addColorStop(0.32, `rgba(${baseColor.r}, ${gBase}, ${bBase}, ${0.38 * pulse})`);
  coreGradient.addColorStop(
    1,
    `rgba(${baseColor.r}, ${Math.max(0, gBase - 45)}, ${Math.max(0, bBase - 45)}, 0)`
  );
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.moveTo(originX - topWidth * 0.18, originY);
  ctx.lineTo(originX + topWidth * 0.18, originY);
  ctx.lineTo(originX + bottomWidth * 0.22, beamBottom);
  ctx.lineTo(originX - bottomWidth * 0.22, beamBottom);
  ctx.closePath();
  ctx.fill();

  // Soft side aura.
  const auraGradient = ctx.createRadialGradient(originX, originY + beamHeight * 0.4, 0, originX, originY + beamHeight * 0.4, bottomWidth * 0.9);
  auraGradient.addColorStop(0, `rgba(${baseColor.r}, ${gBase}, ${bBase}, 0.16)`);
  auraGradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = auraGradient;
  ctx.beginPath();
  ctx.ellipse(originX, originY + beamHeight * 0.42, bottomWidth * 0.85, beamHeight * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!isDangerBeam) {
    // Portal under the ship: brightness ramps with captured 6/7 charge.
    const chargeRatio = clamp(regularBeamHarvest.charge / regularBeamHarvest.target, 0, 1);
    const portalY = originY + Math.max(SCENE.DANGER_BEAM_PORTAL_Y_MIN, topWidth * 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(tSec * (5.4 + chargeRatio * 2.8));
    const flash = regularBeamHarvest.flash * 0.36 + regularBeamHarvest.eruptionFlash * 0.82;
    const coreR = topWidth * (0.09 + chargeRatio * 0.2 + flash * 0.12) * (0.9 + pulse * 0.2);
    const outerR = topWidth * (0.28 + chargeRatio * 0.56 + flash * 0.24);

    const portalGlow = ctx.createRadialGradient(originX, portalY, 0, originX, portalY, outerR);
    portalGlow.addColorStop(0, `rgba(185,245,255,${0.74 + chargeRatio * 0.22})`);
    portalGlow.addColorStop(0.45, `rgba(109,219,255,${0.36 + chargeRatio * 0.34})`);
    portalGlow.addColorStop(1, 'rgba(80,210,255,0)');
    ctx.fillStyle = portalGlow;
    ctx.beginPath();
    ctx.arc(originX, portalY, outerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${0.8 + chargeRatio * 0.2})`;
    ctx.beginPath();
    ctx.arc(originX, portalY, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(1.2, topWidth * 0.018);
    ctx.strokeStyle = `rgba(154,236,255,${0.5 + chargeRatio * 0.35})`;
    ctx.beginPath();
    ctx.arc(originX, portalY, coreR * 1.65, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sparkles and particles (beam only).
  const particleCount = Math.max(
    10,
    Math.floor(
      getAdaptiveCapValue(
        isDangerBeam ? 'dangerBeamSparkles' : 'regularBeamSparkles',
        isDangerBeam ? 170 : 78
      )
    )
  );
  for (let i = 0; i < particleCount; i++) {
    const yFrac = (tSec * (0.48 + (i % 5) * 0.04) + i * 0.031) % 1;
    const y = originY + yFrac * beamHeight;
    const widthAtY = topWidth + (bottomWidth - topWidth) * yFrac;
    const drift = Math.sin(tSec * (2.2 + (i % 7) * 0.15) + i * 6.9) * widthAtY * 0.28;
    const x = originX + drift;
    const sizeBoost = isDangerBeam ? 1.28 : 1;
    const size = (0.8 + 2.7 * (1 - yFrac) * (0.6 + 0.4 * Math.sin(tSec * 6 + i))) * sizeBoost;
    const aBoost = isDangerBeam ? 0.18 : 0;
    const a = 0.08 + 0.24 * (1 - yFrac) * (0.5 + 0.5 * Math.sin(tSec * 5.3 + i * 0.9)) + aBoost;
    const g = Math.min(255, gBase + ((i * 19) % 65));
    const b = Math.min(255, bBase + ((i * 23) % 80));
    ctx.fillStyle = `rgba(${baseColor.r}, ${g}, ${b}, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (i % 11 === 0) {
      const twinkleA = 0.22 + 0.28 * Math.abs(Math.sin(tSec * 9 + i));
      const twinkleR = size * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${twinkleA})`;
      ctx.beginPath();
      ctx.arc(x, y, twinkleR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Ember / sizzle particles ────────────────────────────────────────

export function updateDangerBeamEmbers(now, dt, {
  dangerBeam, dangerEmbers, dangerSizzles, dangerEmberSpawnCarry,
  isDangerDanger, badguysRender, hCSS, wCSS,
  targets, rng, getAdaptiveCapValue,
}) {
  if (!(dangerBeam.enabled && isDangerDanger)) {
    dangerEmbers.length = 0;
    dangerSizzles.length = 0;
    return { dangerEmberSpawnCarry: 0 };
  }
  const geo = getDangerBeamGeometry(now, { badguysRender, dangerBeam, hCSS });
  if (!geo) return { dangerEmberSpawnCarry };
  const spawnCeiling = geo.originY + Math.max(6, geo.topWidth * 0.08);
  const emberSpawnRate = getAdaptiveCapValue('dangerEmberSpawnRate', 280);
  const emberCap = Math.max(SCENE.DANGER_EMBER_CAP_MIN, Math.floor(getAdaptiveCapValue('maxDangerEmbers', 300)));
  const sizzleCap = Math.max(SCENE.DANGER_SIZZLE_CAP_MIN, Math.floor(getAdaptiveCapValue('maxDangerSizzles', 150)));

  let carry = dangerEmberSpawnCarry + dt * emberSpawnRate;
  while (carry >= 1 && dangerEmbers.length < emberCap) {
    carry -= 1;
    const yFrac = SCENE.DANGER_EMBER_SPAWN_Y_MIN + rng() * SCENE.DANGER_EMBER_SPAWN_Y_RANGE;
    const y = geo.originY + geo.beamHeight * yFrac;
    const widthAtY = geo.topWidth + (geo.bottomWidth - geo.topWidth) * yFrac;
    const x = geo.originX + (rng() - 0.5) * widthAtY * (SCENE.DANGER_EMBER_SPAWN_X_BASE + rng() * SCENE.DANGER_EMBER_SPAWN_X_RANGE);
    const life = SCENE.DANGER_EMBER_LIFE_MIN + rng() * SCENE.DANGER_EMBER_LIFE_RANGE;
    dangerEmbers.push({
      x,
      y,
      vx: (rng() - 0.5) * (SCENE.DANGER_EMBER_VX_SPREAD_BASE + rng() * SCENE.DANGER_EMBER_VX_SPREAD_RANGE),
      vy: SCENE.DANGER_EMBER_VY_BASE + rng() * SCENE.DANGER_EMBER_VY_RANGE,
      r: SCENE.DANGER_EMBER_R_MIN + rng() * SCENE.DANGER_EMBER_R_RANGE,
      life,
      lifeMax: life,
      hue: SCENE.DANGER_EMBER_HUE_MIN + rng() * SCENE.DANGER_EMBER_HUE_RANGE,
      driftAmp: 20 + rng() * 34,
      driftSpeed: 0.004 + rng() * 0.01,
      driftPhase: rng() * Math.PI * 2,
      ceilingY: spawnCeiling,
      bounce: 0,
    });
  }
  if (dangerEmbers.length >= emberCap) {
    carry = Math.min(carry, 0.9);
  }

  for (let i = dangerEmbers.length - 1; i >= 0; i--) {
    const e = dangerEmbers[i];
    const prevX = e.x;
    const prevY = e.y;
    e.vy += SCENE.DANGER_EMBER_GRAVITY * dt;
    e.vx += Math.sin(now * e.driftSpeed + e.driftPhase) * e.driftAmp * dt;
    e.vx *= SCENE.DANGER_EMBER_DRAG;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.life -= dt * (0.62 + e.bounce * 0.12);

    // Keep embers below the spacecraft/beam origin region.
    if (e.y < e.ceilingY) {
      if (e.vy < 0) {
        removeBySwapPop(dangerEmbers, i);
        continue;
      }
      e.y = e.ceilingY;
    }

    if (hitVisibleCharacterPixel(e.x, e.y, targets)) {
      const moveX = e.x - prevX;
      const moveY = e.y - prevY;
      const { nx, ny } = estimateCharacterNormal(e.x, e.y, targets, moveX, moveY);
      const dot = e.vx * nx + e.vy * ny;
      e.vx -= 2 * dot * nx;
      e.vy -= 2 * dot * ny;
      e.vx *= SCENE.DANGER_EMBER_BOUNCE_VX_DAMP;
      e.vy *= SCENE.DANGER_EMBER_BOUNCE_VY_DAMP;
      e.vx += (rng() - 0.5) * SCENE.DANGER_EMBER_BOUNCE_VX_JITTER;
      e.vy -= SCENE.DANGER_EMBER_BOUNCE_VY_MIN + rng() * SCENE.DANGER_EMBER_BOUNCE_VY_RANGE;
      if (e.vy < SCENE.DANGER_EMBER_BOUNCE_VY_CAP) e.vy = SCENE.DANGER_EMBER_BOUNCE_VY_CAP;
      e.x = prevX;
      e.y = prevY;
      e.hue = clamp(e.hue + (rng() - 0.5) * 10, 18, 65);
      e.bounce++;
      const sizzleCount = SCENE.DANGER_SIZZLE_COUNT_BASE + Math.floor(rng() * SCENE.DANGER_SIZZLE_COUNT_RANGE);
      for (let s = 0; s < sizzleCount; s++) {
        const ang = rng() * Math.PI * 2;
        const speed = SCENE.DANGER_SIZZLE_SPEED_BASE + rng() * SCENE.DANGER_SIZZLE_SPEED_RANGE;
        dangerSizzles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 16,
          r: SCENE.DANGER_SIZZLE_R_MIN + rng() * SCENE.DANGER_SIZZLE_R_RANGE,
          life: SCENE.DANGER_SIZZLE_LIFE_MIN + rng() * SCENE.DANGER_SIZZLE_LIFE_RANGE,
          hue: SCENE.DANGER_SIZZLE_HUE_MIN + rng() * SCENE.DANGER_SIZZLE_HUE_RANGE,
        });
      }
      if (dangerSizzles.length > sizzleCap) {
        dangerSizzles.splice(0, dangerSizzles.length - sizzleCap);
      }
    }

    // Let embers arc to the ground and fizzle quickly near the bottom.
    if (e.y > hCSS * SCENE.DANGER_EMBER_BOTTOM_FADE_RATIO) {
      e.life -= dt * SCENE.DANGER_EMBER_BOTTOM_FADE_RATE;
    }

    if (e.life <= 0 || e.y > hCSS + SCENE.DANGER_EMBER_OFFSCREEN_PAD || e.x < -SCENE.DANGER_EMBER_OFFSCREEN_PAD || e.x > wCSS + SCENE.DANGER_EMBER_OFFSCREEN_PAD || e.bounce > SCENE.DANGER_EMBER_MAX_BOUNCES) {
      removeBySwapPop(dangerEmbers, i);
    }
  }

  for (let i = dangerSizzles.length - 1; i >= 0; i--) {
    const s = dangerSizzles[i];
    s.vy += SCENE.DANGER_SIZZLE_GRAVITY * dt;
    s.vx *= SCENE.DANGER_SIZZLE_VX_DRAG;
    s.vy *= SCENE.DANGER_SIZZLE_VY_DRAG;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) removeBySwapPop(dangerSizzles, i);
  }

  return { dangerEmberSpawnCarry: carry };
}

// ── Draw embers / sizzles ───────────────────────────────────────────

export function drawDangerBeamEmbers(ctx, dangerEmbers, dangerSizzles) {
  if (!dangerEmbers.length && !dangerSizzles.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of dangerEmbers) {
    const glowR = e.r * (1.9 + e.bounce * 0.12);
    const alpha = clamp(e.life, 0, 1);
    ctx.fillStyle = `hsla(${e.hue + 6}, 100%, 56%, ${0.32 * alpha})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${e.hue}, 100%, 78%, ${0.72 * alpha})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, Math.max(1.2, e.r * 0.95), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,245,210,${0.85 * alpha})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, Math.max(0.8, e.r * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of dangerSizzles) {
    const a = clamp(s.life * 6.5, 0, 1);
    const outer = s.r * 2.1;
    ctx.fillStyle = `hsla(${s.hue + 8}, 100%, 52%, ${0.26 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, outer, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${s.hue}, 100%, 86%, ${0.75 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(0.8, s.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
