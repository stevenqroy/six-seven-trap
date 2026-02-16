// Beam harvest system — regular beam portal: capture 6/7s, charge, erupt.
// Extracted from main.js (S7R-084).

import { clamp } from '../utils/math.js';
import { getDangerBeamGeometry } from './danger-beam.js';

// ── Portal state query ──────────────────────────────────────────────

export function isGoodBeamNumber(n) {
  return !n.isTrap && (n.txt === '6' || n.txt === '7');
}

export function getRegularBeamPortalState(now, {
  bossPhase, dangerBeam, isDangerDanger, badguysRender,
  regularBeamHarvest, hCSS,
}) {
  if (bossPhase < 2) return null;
  if (!dangerBeam.enabled || isDangerDanger || !badguysRender.ready) return null;
  const geo = getDangerBeamGeometry(now, { badguysRender, dangerBeam, hCSS });
  if (!geo) return null;
  const chargeRatio = clamp(regularBeamHarvest.charge / regularBeamHarvest.target, 0, 1);
  return {
    geo,
    x: geo.originX,
    y: geo.originY + Math.max(7, geo.topWidth * 0.1),
    chargeRatio,
    snapRadius: Math.max(12, geo.topWidth * (0.055 + chargeRatio * 0.03)),
  };
}

export function isNumberInsideRegularBeam(n, portalState) {
  const geo = portalState.geo;
  if (n.y < geo.originY - 10 || n.y > geo.beamBottom + 12) return false;
  const yFrac = clamp((n.y - geo.originY) / Math.max(1, geo.beamHeight), 0, 1);
  const widthAtY = geo.topWidth + (geo.bottomWidth - geo.topWidth) * yFrac;
  const beamInner = widthAtY * (0.42 + portalState.chargeRatio * 0.1);
  return Math.abs(n.x - geo.originX) <= beamInner;
}

// ── Eruption ────────────────────────────────────────────────────────

export function triggerRegularBeamEruption(now, portalState, {
  regularBeamHarvest, badguysRender, rng, onErupt,
}) {
  if (!badguysRender.ready) return;
  const eruptionCount = Math.max(
    regularBeamHarvest.target,
    regularBeamHarvest.charge,
    regularBeamHarvest.capturedDigits.length
  );
  const digits = regularBeamHarvest.capturedDigits.splice(0, eruptionCount);
  while (digits.length < eruptionCount) {
    digits.push(rng() < 0.5 ? '6' : '7');
  }

  const mouthX = badguysRender.x + badguysRender.w * 0.5;
  const mouthY = badguysRender.y + Math.max(8, badguysRender.h * 0.08);

  for (let i = 0; i < eruptionCount; i++) {
    const txt = digits[i];
    const col = txt === '6' ? '#ff7eb3' : '#7afcff';
    const angle = -Math.PI / 2 + (rng() - 0.5) * 1.28;
    const speed = 300 + rng() * 440;
    regularBeamHarvest.eruptionNumbers.push({
      txt,
      col,
      x: mouthX + (rng() - 0.5) * badguysRender.w * 0.12,
      y: mouthY - rng() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (80 + rng() * 90),
      size: 46 + rng() * 24,
      rot: rng() * Math.PI * 2,
      rotVel: (rng() - 0.5) * 6.2,
      alpha: 1,
      bounces: 0,
      life: 8.2,
    });
  }

  regularBeamHarvest.charge = 0;
  regularBeamHarvest.capturedDigits.length = 0;
  regularBeamHarvest.flash = 1;
  regularBeamHarvest.eruptionFlash = 1;

  // Delegate side effects to main.js callback
  if (onErupt) {
    onErupt({
      x: portalState?.x ?? mouthX,
      y: (portalState?.y ?? mouthY) + 8,
      mouthX,
      mouthY,
    });
  }
}

// ── Capture ─────────────────────────────────────────────────────────

export function registerRegularBeamCapture(n, now, portalState, {
  regularBeamHarvest, rng, onCapture, onErupt,
  badguysRender,
}) {
  regularBeamHarvest.capturedDigits.push(n.txt);
  if (regularBeamHarvest.capturedDigits.length > regularBeamHarvest.target * 2) {
    regularBeamHarvest.capturedDigits.shift();
  }
  regularBeamHarvest.charge += 1;
  regularBeamHarvest.flash = 1;
  if (onCapture) onCapture(n);
  if (regularBeamHarvest.charge >= regularBeamHarvest.target) {
    triggerRegularBeamEruption(now, portalState, {
      regularBeamHarvest, badguysRender, rng, onErupt,
    });
  }
}

// ── Update eruption numbers physics ─────────────────────────────────

export function updateRegularBeamHarvest(dt, {
  regularBeamHarvest, floorY, wallPad, wCSS, hCSS, rng,
}) {
  regularBeamHarvest.flash = Math.max(0, regularBeamHarvest.flash - dt * 2.6);
  regularBeamHarvest.eruptionFlash = Math.max(0, regularBeamHarvest.eruptionFlash - dt * 1.1);

  for (let i = regularBeamHarvest.eruptionNumbers.length - 1; i >= 0; i--) {
    const n = regularBeamHarvest.eruptionNumbers[i];
    let bounced = false;

    n.vy += 620 * dt;
    n.vx *= 0.997;
    n.rot += n.rotVel * dt;
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    n.life -= dt;

    const sidePad = Math.max(22, wallPad - 2);
    if (n.x < sidePad) {
      n.x = sidePad;
      n.vx = Math.abs(n.vx) * 0.82;
      bounced = true;
    } else if (n.x > wCSS - sidePad) {
      n.x = wCSS - sidePad;
      n.vx = -Math.abs(n.vx) * 0.82;
      bounced = true;
    }

    if (n.y > floorY) {
      n.y = floorY;
      const bounceLoss = Math.max(0.26, 0.62 - n.bounces * 0.06);
      n.vy = -Math.abs(n.vy) * bounceLoss;
      n.vx *= 0.9;
      if (Math.abs(n.vy) < 90) n.vy = -(90 + rng() * 60);
      bounced = true;
    }

    if (bounced) n.bounces++;
    if (n.bounces > 0) {
      n.alpha -= dt * (0.34 + Math.min(0.6, n.bounces * 0.1));
    } else {
      n.alpha -= dt * 0.03;
    }

    if (n.alpha <= 0 || n.life <= 0 || n.bounces > 10 || n.y > hCSS + 120) {
      regularBeamHarvest.eruptionNumbers.splice(i, 1);
    }
  }
}

// ── Draw eruption numbers ───────────────────────────────────────────

export function drawRegularBeamEruptionNumbers(ctx, regularBeamHarvest) {
  if (!regularBeamHarvest.eruptionNumbers.length) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const n of regularBeamHarvest.eruptionNumbers) {
    const alpha = clamp(n.alpha, 0, 1);
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rot);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = n.col;
    ctx.shadowBlur = 22 * alpha;
    ctx.font = `bold ${Math.round(n.size)}px Arial`;
    ctx.fillStyle = n.col;
    ctx.fillText(n.txt, 0, 0);

    if (alpha > 0.38) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
      ctx.font = `bold ${Math.round(n.size * 0.56)}px Arial`;
      ctx.fillText(n.txt, 0, 0);
    }
    ctx.restore();
  }

  ctx.restore();
}
