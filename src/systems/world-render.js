import { SCENE } from '../constants.js';

/**
 * World scenery renderer — sky, stars, hills, barn, ground, grass.
 * Extracted from main.js (S7R-080). Purely presentational; no game-logic side effects.
 */

// ── State factory ────────────────────────────────────────────────

/**
 * Create the mutable world-render state object.
 * Kept internal to the caller; passed back into every public function.
 */
export function initWorldState() {
  return {
    stars: [],
    gradientCache: {
      key: '',
      sky: null,
      hillFar: null,
      hillMid: null,
      hillNear: null,
      barnBody: null,
      doorGlow: null,
      ground: null,
      groundTop: 0,
      barnW: 0,
      barnH: 0,
      barnX: 0,
      barnY: 0,
      doorW: 0,
      doorH: 0,
      doorX: 0,
      doorY: 0,
    },
  };
}

// ── Stars ────────────────────────────────────────────────────────

/**
 * Rebuild the starfield array.  Called on resize.
 * @param {object} ws  - world state from initWorldState()
 * @param {number} w   - viewport width  (wCSS)
 * @param {number} h   - viewport height (hCSS)
 * @param {function} rng - seeded random() from main.js
 */
export function rebuildWorldStars(ws, w, h, rng) {
  const count = Math.max(
    SCENE.STAR_COUNT_MIN,
    Math.min(SCENE.STAR_COUNT_MAX, Math.floor((w * h) / SCENE.STAR_DENSITY_DIVISOR))
  );
  ws.stars = [];
  for (let i = 0; i < count; i++) {
    ws.stars.push({
      x: rng() * w,
      y: rng() * (h * SCENE.STAR_HEIGHT_RATIO),
      r: 0.6 + rng() * 1.7,
      a: 0.2 + rng() * 0.75,
      tw: 0.0012 + rng() * 0.0024,
      phase: rng() * Math.PI * 2,
    });
  }
}

// ── Gradient cache reset ─────────────────────────────────────────

/**
 * Invalidate the cached gradients (called on resize).
 */
export function resetWorldCache(ws) {
  ws.gradientCache.key = '';
}

// ── Gradient builder ─────────────────────────────────────────────

/**
 * Build (or return cached) world gradients for the current frame.
 * @param {object} ws          - world state
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w           - viewport width
 * @param {number} h           - viewport height
 * @param {number} elapsedMs   - ms since game start
 * @returns {object} gradientCache reference
 */
export function getWorldGradients(ws, ctx, w, h, elapsedMs) {
  const stepMs =
    Math.floor(Math.max(0, elapsedMs) / SCENE.GRADIENT_STEP_MS) * SCENE.GRADIENT_STEP_MS;
  const cacheKey = `${w}x${h}@${stepMs}`;
  const gc = ws.gradientCache;
  if (gc.key === cacheKey) return gc;

  const dayProgress = Math.max(0, Math.min(1, stepMs / SCENE.DAY_CYCLE_DURATION_MS));
  const SG = SCENE.SKY_GRADIENT_BASE;
  const skyTopR = Math.round(SG.topR + dayProgress * SG.dayDeltaTopR);
  const skyTopG = Math.round(SG.topG + dayProgress * SG.dayDeltaTopG);
  const skyTopB = Math.round(SG.topB + dayProgress * SG.dayDeltaTopB);
  const skyBottomR = Math.round(SG.bottomR - dayProgress * SG.dayDeltaBottomR);
  const skyBottomG = Math.round(SG.bottomG - dayProgress * SG.dayDeltaBottomG);
  const skyBottomB = Math.round(SG.bottomB - dayProgress * SG.dayDeltaBottomB);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `rgb(${skyTopR}, ${skyTopG}, ${skyTopB})`);
  sky.addColorStop(
    0.52,
    `rgba(${Math.round(skyTopR + SG.midOffsetR)}, ${Math.round(skyTopG + SG.midOffsetG)}, ${Math.round(skyTopB + SG.midOffsetB)}, 0.98)`
  );
  sky.addColorStop(1, `rgb(${skyBottomR}, ${skyBottomG}, ${skyBottomB})`);

  const farBaseY = h * SCENE.HILL_FAR.baseY;
  const midBaseY = h * SCENE.HILL_MID.baseY;
  const nearBaseY = h * SCENE.HILL_NEAR.baseY;
  const hillFar = ctx.createLinearGradient(0, farBaseY - SCENE.HILL_FAR.gradTopOffset, 0, h + 8);
  hillFar.addColorStop(0, 'rgba(95, 132, 88, 0.72)');
  hillFar.addColorStop(1, 'rgba(58, 88, 60, 0.92)');

  const hillMid = ctx.createLinearGradient(0, midBaseY - SCENE.HILL_MID.gradTopOffset, 0, h + 8);
  hillMid.addColorStop(0, 'rgba(112, 154, 94, 0.82)');
  hillMid.addColorStop(1, 'rgba(65, 100, 62, 0.98)');

  const hillNear = ctx.createLinearGradient(0, nearBaseY - SCENE.HILL_NEAR.gradTopOffset, 0, h + 8);
  hillNear.addColorStop(0, 'rgba(124, 168, 88, 0.86)');
  hillNear.addColorStop(1, 'rgba(78, 116, 58, 0.98)');

  const groundTop = h - SCENE.GROUND_OFFSET_Y;
  const barnW = Math.max(SCENE.BARN_WIDTH_MIN, Math.min(SCENE.BARN_WIDTH_MAX, w * SCENE.BARN_WIDTH_RATIO));
  const barnH = barnW * SCENE.BARN_HEIGHT_RATIO;
  const barnX = w * 0.5 - barnW * 0.5;
  const barnY = groundTop - barnH + SCENE.BARN_FLOOR_LIFT;
  const barnBody = ctx.createLinearGradient(0, barnY, 0, barnY + barnH);
  barnBody.addColorStop(0, '#b34f42');
  barnBody.addColorStop(1, '#7f2f2b');

  const doorW = barnW * SCENE.BARN_DOOR_WIDTH_RATIO;
  const doorH = barnH * SCENE.BARN_DOOR_HEIGHT_RATIO;
  const doorX = barnX + barnW * 0.5 - doorW * 0.5;
  const doorY = barnY + barnH - doorH;
  const doorGlow = ctx.createRadialGradient(
    doorX + doorW * 0.5,
    doorY + doorH * SCENE.BARN_DOOR_GLOW_CENTER_Y_RATIO,
    0,
    doorX + doorW * 0.5,
    doorY + doorH * SCENE.BARN_DOOR_GLOW_CENTER_Y_RATIO,
    doorW * SCENE.BARN_DOOR_GLOW_RADIUS_RATIO
  );
  doorGlow.addColorStop(0, 'rgba(255, 224, 140, 0.85)');
  doorGlow.addColorStop(1, 'rgba(255, 190, 95, 0)');

  const ground = ctx.createLinearGradient(0, groundTop, 0, h);
  ground.addColorStop(0, '#3f7d3f');
  ground.addColorStop(0.46, '#2f5f2e');
  ground.addColorStop(1, '#1f3821');

  gc.key = cacheKey;
  gc.sky = sky;
  gc.hillFar = hillFar;
  gc.hillMid = hillMid;
  gc.hillNear = hillNear;
  gc.barnBody = barnBody;
  gc.doorGlow = doorGlow;
  gc.ground = ground;
  gc.groundTop = groundTop;
  gc.barnW = barnW;
  gc.barnH = barnH;
  gc.barnX = barnX;
  gc.barnY = barnY;
  gc.doorW = doorW;
  gc.doorH = doorH;
  gc.doorX = doorX;
  gc.doorY = doorY;

  return gc;
}

// ── Hill helper (private) ────────────────────────────────────────

function drawHillLayer(ctx, w, h, baseY, amp, freq, phase, parallax, px, fillStyle) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-SCENE.HILL_PAD_PX, h + 8);
  for (let x = -SCENE.HILL_PAD_PX; x <= w + SCENE.HILL_PAD_PX; x += SCENE.HILL_STEP_PX) {
    const xOff = x + parallax * px;
    const y =
      baseY +
      Math.sin(xOff * freq + phase) * amp +
      Math.sin(xOff * SCENE.HILL_SECONDARY_PX_RATIO * freq * SCENE.HILL_SECONDARY_FREQ_RATIO + phase * SCENE.HILL_SECONDARY_PHASE_RATIO) *
        amp *
        SCENE.HILL_SECONDARY_AMP_RATIO;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + SCENE.HILL_PAD_PX, h + 8);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

// ── Main draw entry point ────────────────────────────────────────

/**
 * Draw the full world scene: sky, stars, hills, barn, ground, grass.
 * @param {object} ws           - world state
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w            - viewport width
 * @param {number} h            - viewport height
 * @param {number} now          - current timestamp (ms)
 * @param {number} cx           - camera X position
 * @param {number} gameStartTime - S.gameStartTime
 */
export function drawWorld(ws, ctx, w, h, now, cx, gameStartTime) {
  const elapsed = Math.max(0, now - gameStartTime);
  const dayProgress = Math.max(0, Math.min(1, elapsed / SCENE.DAY_CYCLE_DURATION_MS));
  const parallax = ((cx - w * 0.5) / Math.max(1, w * 0.5)) * SCENE.PARALLAX_FACTOR;
  const gradients = getWorldGradients(ws, ctx, w, h, elapsed);

  // Sky
  ctx.fillStyle = gradients.sky;
  ctx.fillRect(0, 0, w, h);

  // Stars
  ctx.save();
  const starFade = 1 - dayProgress * SCENE.STAR_FADE_FACTOR;
  for (let i = 0; i < ws.stars.length; i++) {
    const s = ws.stars[i];
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * s.tw + s.phase));
    ctx.globalAlpha = s.a * twinkle * starFade;
    ctx.fillStyle = '#f6f1ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Hills
  const HF = SCENE.HILL_FAR;
  const HM = SCENE.HILL_MID;
  const HN = SCENE.HILL_NEAR;
  drawHillLayer(ctx, w, h, h * HF.baseY, HF.amp, HF.freq, now * HF.speed + HF.phaseOffset, parallax, HF.px, gradients.hillFar);
  drawHillLayer(ctx, w, h, h * HM.baseY, HM.amp, HM.freq, now * HM.speed + HM.phaseOffset, parallax, HM.px, gradients.hillMid);
  drawHillLayer(ctx, w, h, h * HN.baseY, HN.amp, HN.freq, now * HN.speed + HN.phaseOffset, parallax, HN.px, gradients.hillNear);

  // Barn body
  const { groundTop, barnW, barnH, barnX, barnY } = gradients;
  ctx.fillStyle = gradients.barnBody;
  ctx.fillRect(barnX, barnY, barnW, barnH);

  // Barn trim
  ctx.strokeStyle = 'rgba(255, 220, 185, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(barnX + 1, barnY + 1, barnW - 2, barnH - 2);

  // Barn roof
  ctx.fillStyle = '#6f2723';
  ctx.beginPath();
  ctx.moveTo(barnX - SCENE.BARN_ROOF_OVERHANG, barnY + 2);
  ctx.lineTo(barnX + barnW + SCENE.BARN_ROOF_OVERHANG, barnY + 2);
  ctx.lineTo(barnX + barnW * 0.5, barnY - barnH * SCENE.BARN_ROOF_HEIGHT_RATIO);
  ctx.closePath();
  ctx.fill();

  // Barn door
  const { doorW, doorH, doorX, doorY } = gradients;
  ctx.fillStyle = gradients.doorGlow;
  ctx.fillRect(doorX - doorW * 0.7, doorY - doorH * 0.6, doorW * 2.4, doorH * 1.9);
  ctx.fillStyle = '#3b2016';
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.strokeStyle = 'rgba(255, 214, 165, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(doorX, doorY, doorW, doorH);

  // Ground
  ctx.fillStyle = gradients.ground;
  ctx.fillRect(0, groundTop, w, h - groundTop);

  // Grass blades
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 190, 120, 0.2)';
  ctx.lineWidth = 1;
  for (let x = -SCENE.GRASS_SPACING_PX; x < w + SCENE.GRASS_SPACING_PX; x += SCENE.GRASS_SPACING_PX) {
    const y = groundTop + SCENE.GRASS_TOP_OFFSET + Math.sin(x * SCENE.GRASS_WAVE_FREQ + now * SCENE.GRASS_WAVE_SPEED) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + SCENE.GRASS_BLADE_DX, y + SCENE.GRASS_BLADE_DY);
    ctx.stroke();
  }
  ctx.restore();
}
