import {
  GRAVITY,
  HAND_BOUNCE,
  FLOOR_BOUNCE,
  INITIAL_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  TRAP_SPAWN_CHANCE_START,
  TRAP_SPAWN_CHANCE_MAX,
  MAX_ACTIVE_NUMS,
  MAX_ACTIVE_LASER_BEAMS,
  MAX_LASER_SMOKE,
  TEMP_NO_LOSE,
  BADGUYS_SPRITE_SHEET,
  HAND_TUNING,
  SCOWL_OVERLAY,
  BADGUYS_OVERLAY_DEFAULT,
  DANGER_BEAM_TUNING,
  POWER,
  SHIELD,
  PROJECTILE,
  SWAT,
  MAGNET,
  ULTIMATE,
  MOBILE,
  POLISH,
  ADAPTIVE_QUALITY,
} from './constants.js';
import S from './state.js';
import {
  clamp as _clamp,
  distPointToSegmentSq as _distPointToSegmentSq,
  edgeBiasedUnit as _edgeBiasedUnit,
} from './utils/math.js';
import {
  getTransparentSprite as _getTransparentSprite,
  drawImageWithTransparencyKey as _drawImageWithTransparencyKey,
  getSpriteAlphaData as _getSpriteAlphaData,
  sampleSpriteAlpha as _sampleSpriteAlpha,
  isVisibleOnBody as _isVisibleOnBody,
  isVisibleOnHand as _isVisibleOnHand,
  hitVisibleCharacterPixel as _hitVisibleCharacterPixel,
  sampleVisibleCharacter as _sampleVisibleCharacter,
  estimateCharacterNormal as _estimateCharacterNormal,
} from './utils/sprite.js';
import {
  resetLives,
  isInvincible,
  loseLife,
  checkExtraLife,
  getInvincibilityAlpha,
} from './systems/lives.js';
import {
  resetShip,
  damageShip,
  updateBossPhase,
  getShipHPRatio,
  getPhaseSpeedMultiplier,
  getPhaseSpawnMultiplier,
  getPhaseTrapChanceBoost,
  getPhaseEffects,
} from './systems/progression.js';
import {
  resetPower,
  chargePower,
  canAfford,
  spendPower,
  drainPower,
} from './systems/power.js';
import { createTelemetrySystem } from './systems/telemetry.js';
import { createAdaptiveQualityGovernor } from './systems/adaptive-quality.js';
import { loadDefaultEnemyRegistry } from './systems/enemy-registry.js';
import { createEnemyStateMachineRuntime } from './systems/enemy-state-machine.js';
import { createInputSystem } from './core/input.js';
import {
  activateShield,
  updateShield,
  isShieldActive,
  drawShield,
} from './game-objects/shield.js';
import {
  fireProjectile,
  updateProjectiles,
  drawProjectiles,
} from './game-objects/projectile.js';
import { initFlags, getFlag } from './config/flags.js';
import { initDebugPanel } from './config/debug-panel.js';
import { createAccessibilitySettingsController } from './config/accessibility-settings.js';
import { createSettingsPanel } from './ui/settings-panel.js';
import { createActionBar } from './ui/action-bar.js';
import { createActionBarButtons } from './ui/action-bar-config.js';
import { createActionRouter } from './ui/action-router.js';
import { createHudUpdater } from './ui/hud-updates.js';
import { createRunRngTracker } from './core/run-rng.js';

(() => {
  // Initialize feature flags system (S7R-001)
  initFlags();
  initDebugPanel();

  const runRngTracker = createRunRngTracker({
    getDeterministicFlag: () => getFlag('deterministicRNG'),
  });
  const telemetry = createTelemetrySystem({
    enabled: () => getFlag('telemetry'),
  });
  const adaptiveQualityGovernor = createAdaptiveQualityGovernor({
    enabled: () => getFlag('adaptiveQuality'),
    initialTier: ADAPTIVE_QUALITY.DEFAULT_TIER,
    downgradeAvgMs: ADAPTIVE_QUALITY.DOWNGRADE_AVG_MS,
    downgradeWindowMs: ADAPTIVE_QUALITY.DOWNGRADE_WINDOW_MS,
    upgradeAvgMs: ADAPTIVE_QUALITY.UPGRADE_AVG_MS,
    upgradeWindowMs: ADAPTIVE_QUALITY.UPGRADE_WINDOW_MS,
    minTierDwellMs: ADAPTIVE_QUALITY.MIN_TIER_DWELL_MS,
    tiers: ADAPTIVE_QUALITY.TIERS,
  });
  const enemyStateMachineRuntime = createEnemyStateMachineRuntime({
    enabled: () => getFlag('enemyStateMachine'),
    getRegistry: () => S.enemyRegistry,
  });

  let accessibilitySettingsEnabled = getFlag('accessibilitySettings');
  const accessibilitySettingsController = createAccessibilitySettingsController({
    enabled: accessibilitySettingsEnabled,
  });
  let accessibilitySettings = accessibilitySettingsController.getSettings();

  accessibilitySettingsController.subscribe((nextSettings) => {
    accessibilitySettings = nextSettings;
  });

  function isReducedMotionEnabled() {
    return accessibilitySettingsEnabled && accessibilitySettings.reducedMotion;
  }

  function isLowGraphicsModeEnabled() {
    return accessibilitySettingsEnabled && accessibilitySettings.lowGraphicsMode;
  }

  function getMotionScale() {
    return isReducedMotionEnabled() ? 0.28 : 1;
  }

  function getAdaptiveQualityCaps() {
    if (!getFlag('adaptiveQuality')) return null;
    const caps = adaptiveQualityGovernor.getCaps();
    if (!isLowGraphicsModeEnabled()) return caps;

    const lowCaps = ADAPTIVE_QUALITY.TIERS.low;
    const merged = { ...caps };
    const keys = Object.keys(lowCaps);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const lowValue = lowCaps[key];
      const currentValue = merged[key];
      if (Number.isFinite(lowValue) && Number.isFinite(currentValue)) {
        merged[key] = Math.min(currentValue, lowValue);
      }
    }
    merged.shadowBlurEnabled = false;
    merged.maxShadowBlur = 0;
    return merged;
  }

  function getAdaptiveCapValue(name, fallback) {
    const caps = getAdaptiveQualityCaps();
    if (!caps) return fallback;
    return Number.isFinite(caps[name]) ? caps[name] : fallback;
  }

  function getAdaptiveShadowBlurCaps() {
    const caps = getAdaptiveQualityCaps();
    const maxShadowBlur = Number.isFinite(caps?.maxShadowBlur)
      ? Math.max(0, caps.maxShadowBlur)
      : 18;
    const shadowBlurEnabled =
      typeof caps?.shadowBlurEnabled === 'boolean'
        ? caps.shadowBlurEnabled
        : maxShadowBlur > 0;
    return {
      enabled: shadowBlurEnabled && maxShadowBlur > 0,
      maxShadowBlur,
    };
  }

  function updateAdaptiveQuality(frameMs, now) {
    const transition = adaptiveQualityGovernor.onFrame(frameMs, now);
    S.qualityTier = adaptiveQualityGovernor.getTier();
    if (transition) {
      telemetry.onQualityTierChange(transition);
    }
  }

  function resetAdaptiveQuality(now = performance.now()) {
    adaptiveQualityGovernor.reset({
      tier: ADAPTIVE_QUALITY.DEFAULT_TIER,
      atMs: now,
    });
    S.qualityTier = adaptiveQualityGovernor.getTier();
  }

  function syncEnemyRuntimeSnapshot(now = performance.now()) {
    S.enemyRuntime = enemyStateMachineRuntime.getDebugState(now);
  }

  function resetEnemyStateMachine(now = performance.now()) {
    enemyStateMachineRuntime.reset({ atMs: now });
    syncEnemyRuntimeSnapshot(now);
  }

  function updateEnemyStateMachine(frameMs, now) {
    enemyStateMachineRuntime.onFrame(frameMs, now);
    syncEnemyRuntimeSnapshot(now);
  }

  function applyEnemyRegistryFlag({ failHard = false } = {}) {
    if (!getFlag('enemyRegistry')) {
      S.enemyRegistry = null;
      S.enemyRegistryError = null;
      return true;
    }

    try {
      S.enemyRegistry = loadDefaultEnemyRegistry();
      S.enemyRegistryError = null;
      return true;
    } catch (error) {
      const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics : [];
      S.enemyRegistry = null;
      S.enemyRegistryError = {
        message:
          typeof error?.message === 'string'
            ? error.message
            : '[EnemyRegistry] Unknown manifest validation failure.',
        diagnostics,
      };
      console.error(S.enemyRegistryError.message);
      if (failHard) throw error;
      return false;
    }
  }

  function spawnEnemyLifecycleShadow(now = performance.now()) {
    if (!getFlag('enemyStateMachine')) return null;
    if (!S.enemyRegistry || typeof S.enemyRegistry.getAll !== 'function') return null;
    const enemies = S.enemyRegistry.getAll();
    if (!Array.isArray(enemies) || enemies.length === 0) return null;
    const selected = enemies[Math.floor(random() * enemies.length)];
    if (!selected || typeof selected.id !== 'string') return null;
    return enemyStateMachineRuntime.spawnFromRegistry(selected.id, {
      atMs: now,
      source: 'trap-spawn',
      metadata: {
        trapChance: S.trapChance,
      },
    });
  }

  function getParticleBurstCount(count) {
    const safeCount = Math.max(0, Math.floor(count));
    if (safeCount === 0) return 0;
    const adaptiveCaps = getAdaptiveQualityCaps();
    if (adaptiveCaps) {
      return Math.max(1, Math.round(safeCount * adaptiveCaps.particleSpawnScale));
    }
    if (!isLowGraphicsModeEnabled()) return safeCount;
    return Math.max(1, Math.round(safeCount * 0.45));
  }

  function getParticleCap() {
    return Math.max(
      24,
      Math.floor(
        getAdaptiveCapValue(
          'maxParticles',
          isLowGraphicsModeEnabled() ? 180 : 450
        )
      )
    );
  }

  function startRngRun(reason = 'run-start') {
    const run = runRngTracker.start(reason);
    resetAdaptiveQuality(performance.now());
    S.runSeed = run.seed;
    S.runDeterministicRng = run.deterministic;
    S.runRngDrawCount = run.drawCount;
    telemetry.beginRun({
      seed: run.seed,
      deterministic: run.deterministic,
      startedAtMs: performance.now(),
      reason,
    });
  }

  function random() {
    const value = runRngTracker.random();
    S.runRngDrawCount = runRngTracker.getDrawCount();
    return value;
  }

  function logRunSummary(reason, now = performance.now()) {
    if (S.isTitleScreen || S.gameStartTime <= 0) return;
    const elapsedMs = Math.max(0, now - S.gameStartTime);
    telemetry.setRngDraws(S.runRngDrawCount);
    runRngTracker.logSummary({
      reason,
      seed: S.runSeed,
      deterministic: S.runDeterministicRng,
      drawCount: S.runRngDrawCount,
      score: S.score,
      bestCombo: S.bestCombo,
      elapsedMs,
    });
    const runMetrics = telemetry.finalizeRun({
      reason,
      endedAtMs: now,
      score: S.score,
      bestCombo: S.bestCombo,
      rngDraws: S.runRngDrawCount,
    });
    telemetry.dumpRun(runMetrics);
  }

  applyEnemyRegistryFlag({ failHard: true });
  resetEnemyStateMachine(performance.now());

  startRngRun('boot');

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: true });
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const comboEl = document.getElementById('combo');
  const resetBtn = document.getElementById('resetBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const idiotModal = document.getElementById('idiotModal');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const restartBigBtn = document.getElementById('restartBigBtn');
  const fsBtn = document.getElementById('fsBtn');
  const iconExpand = document.getElementById('iconExpand');
  const iconCompress = document.getElementById('iconCompress');
  const livesEl = document.getElementById('lives');
  const shipHpFill = document.getElementById('shipHpFill');
  const shipHpText = document.getElementById('shipHpText');
  const powerFill = document.getElementById('powerFill');
  const powerText = document.getElementById('powerText');
  const phaseIndicator = document.getElementById('phaseIndicator');
  const victoryModal = document.getElementById('victoryModal');
  const victoryPlayAgain = document.getElementById('victoryPlayAgain');
  const hudEl = document.getElementById('hud');
  const shipHpBar = document.getElementById('shipHpBar');
  const powerBar = document.getElementById('powerBar');
  const titleScreen = document.getElementById('titleScreen');
  const titleBest = document.getElementById('titleBest');
  const startGameBtn = document.getElementById('startGameBtn');
  let settingsPanel = null;
  let settingsOpenedWhileRunning = false;
  let actionBar = null;

  // HUD updater (S7R-046)
  const hudUpdater = createHudUpdater({
    livesEl,
    shipHpFill,
    shipHpText,
    powerFill,
    powerText,
    powerBar,
    highScoreEl,
    titleBest,
    hudEl,
    shipHpBar,
  });

  // Core loading UI
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingSubtitle = document.getElementById('loadingSubtitle');
  const loadingFill = document.getElementById('loadingFill');
  const loadingText = document.getElementById('loadingText');

  // Load image assets
  const avatar = new Image();
  const leftHandImg = new Image();
  const rightHandImg = new Image();
  const scowlImg = new Image();
  const badguysRawImg = new Image();
  const badguysCleanImg = new Image();

  const base = import.meta.env.BASE_URL;
  const trackedImageAssets = [
    { img: avatar, src: `${base}assets/center-avatar.png?v=2`, label: 'Guardian' },
    { img: leftHandImg, src: `${base}assets/left-hand.png?v=3`, label: 'Left hand' },
    { img: rightHandImg, src: `${base}assets/right-hand.png?v=3`, label: 'Right hand' },
    { img: scowlImg, src: `${base}assets/scowl.png?v=1`, label: 'Scowl overlay' },
    { img: badguysRawImg, src: `${base}assets/test-sheet-raw.png?v=2`, label: 'Ship sprites (raw)' },
    { img: badguysCleanImg, src: `${base}assets/test-sheet-best.png?v=2`, label: 'Ship sprites (clean)' },
  ];

  function updateLoadingProgress(loaded, total, label = '') {
    const safeTotal = Math.max(1, total);
    const ratio = clamp(loaded / safeTotal, 0, 1);
    if (loadingFill) loadingFill.style.width = String(Math.round(ratio * 100)) + '%';
    if (loadingText) {
      loadingText.textContent = 'Loading ' + loaded + '/' + total + (label ? ' • ' + label : '');
    }
  }

  function waitForImageLoad(img) {
    return new Promise((resolve) => {
      let settled = false;
      const finalize = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      if (img.complete) {
        finalize(img.naturalWidth > 0);
        return;
      }

      const onLoad = () => finalize(true);
      const onError = () => finalize(false);
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });
  }

  async function preloadCoreAssets() {
    const total = trackedImageAssets.length;
    let loaded = 0;
    let failed = 0;
    updateLoadingProgress(loaded, total);

    const loads = trackedImageAssets.map(async ({ img, src, label }) => {
      img.src = src;
      const ok = await waitForImageLoad(img);
      loaded += 1;
      if (!ok) failed += 1;
      updateLoadingProgress(loaded, total, label);
      if (ok) {
        console.log(label + ' loaded successfully');
      } else {
        console.error(label + ' failed to load');
      }
      return ok;
    });

    await Promise.all(loads);

    if (loadingSubtitle) {
      if (failed > 0) {
        const suffix = failed === 1 ? 'asset' : 'assets';
        loadingSubtitle.textContent = 'Loaded with ' + failed + ' missing ' + suffix;
      } else {
        loadingSubtitle.textContent = 'Ready';
      }
    }
  }

  function hideLoadingScreen() {
    if (!loadingScreen) return;
    loadingScreen.classList.add('hidden');
    window.setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 340);
  }

  const badguysSpriteSheet = BADGUYS_SPRITE_SHEET;

  function getActiveBadguysSpriteImage() {
    return S.badguysSpriteVariant === 'clean' ? badguysCleanImg : badguysRawImg;
  }

  // Toggle Fullscreen
  function updateIcon() {
    if (document.fullscreenElement) {
      iconExpand.style.display = 'none';
      iconCompress.style.display = 'block';
    } else {
      iconExpand.style.display = 'block';
      iconCompress.style.display = 'none';
    }
  }
  fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        window.scrollTo(0, 1);
        resize();
      });
    } else {
      document.exitFullscreen();
    }
  };
  document.addEventListener('fullscreenchange', updateIcon);

  // Resize & Setup
  let wCSS = 0,
    hCSS = 0;
  let worldStars = [];
  const WORLD_GRADIENT_STEP_MS = 500;
  const LASER_GRADIENT_POS_STEP_PX = 6;
  const LASER_GRADIENT_HUE_STEP = 12;
  const LASER_GRADIENT_ALPHA_STEP = 0.05;
  const DANGER_BEAM_OSC_STEP_MS = 33;

  const worldGradientCache = {
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
  };
  const laserBeamGradientCache = [];
  const laserSourceGradientCache = [];

  function quantize(value, step) {
    if (!Number.isFinite(value)) return 0;
    if (!Number.isFinite(step) || step <= 0) return value;
    return Math.round(value / step) * step;
  }

  function rebuildWorldStars() {
    const count = Math.max(36, Math.min(96, Math.floor((wCSS * hCSS) / 18000)));
    worldStars = [];
    for (let i = 0; i < count; i++) {
      worldStars.push({
        x: random() * wCSS,
        y: random() * (hCSS * 0.62),
        r: 0.6 + random() * 1.7,
        a: 0.2 + random() * 0.75,
        tw: 0.0012 + random() * 0.0024,
        phase: random() * Math.PI * 2,
      });
    }
  }

  function getWorldGradients(elapsedMs) {
    const stepMs = Math.floor(Math.max(0, elapsedMs) / WORLD_GRADIENT_STEP_MS) * WORLD_GRADIENT_STEP_MS;
    const cacheKey = `${wCSS}x${hCSS}@${stepMs}`;
    if (worldGradientCache.key === cacheKey) return worldGradientCache;

    const dayProgress = Math.max(0, Math.min(1, stepMs / 180000));
    const skyTopR = Math.round(20 + dayProgress * 22);
    const skyTopG = Math.round(14 + dayProgress * 12);
    const skyTopB = Math.round(58 + dayProgress * 48);
    const skyBottomR = Math.round(255 - dayProgress * 28);
    const skyBottomG = Math.round(160 - dayProgress * 38);
    const skyBottomB = Math.round(110 - dayProgress * 16);

    const sky = ctx.createLinearGradient(0, 0, 0, hCSS);
    sky.addColorStop(0, `rgb(${skyTopR}, ${skyTopG}, ${skyTopB})`);
    sky.addColorStop(
      0.52,
      `rgba(${Math.round(skyTopR + 8)}, ${Math.round(skyTopG + 6)}, ${Math.round(skyTopB + 16)}, 0.98)`
    );
    sky.addColorStop(1, `rgb(${skyBottomR}, ${skyBottomG}, ${skyBottomB})`);

    const farBaseY = hCSS * 0.67;
    const midBaseY = hCSS * 0.74;
    const nearBaseY = hCSS * 0.8;
    const hillFar = ctx.createLinearGradient(0, farBaseY - 31.2, 0, hCSS + 8);
    hillFar.addColorStop(0, 'rgba(95, 132, 88, 0.72)');
    hillFar.addColorStop(1, 'rgba(58, 88, 60, 0.92)');

    const hillMid = ctx.createLinearGradient(0, midBaseY - 40.8, 0, hCSS + 8);
    hillMid.addColorStop(0, 'rgba(112, 154, 94, 0.82)');
    hillMid.addColorStop(1, 'rgba(65, 100, 62, 0.98)');

    const hillNear = ctx.createLinearGradient(0, nearBaseY - 21.6, 0, hCSS + 8);
    hillNear.addColorStop(0, 'rgba(124, 168, 88, 0.86)');
    hillNear.addColorStop(1, 'rgba(78, 116, 58, 0.98)');

    const groundTop = hCSS - 108;
    const barnW = Math.max(180, Math.min(260, wCSS * 0.3));
    const barnH = barnW * 0.62;
    const barnX = wCSS * 0.5 - barnW * 0.5;
    const barnY = groundTop - barnH + 8;
    const barnBody = ctx.createLinearGradient(0, barnY, 0, barnY + barnH);
    barnBody.addColorStop(0, '#b34f42');
    barnBody.addColorStop(1, '#7f2f2b');

    const doorW = barnW * 0.28;
    const doorH = barnH * 0.52;
    const doorX = barnX + barnW * 0.5 - doorW * 0.5;
    const doorY = barnY + barnH - doorH;
    const doorGlow = ctx.createRadialGradient(
      doorX + doorW * 0.5,
      doorY + doorH * 0.68,
      0,
      doorX + doorW * 0.5,
      doorY + doorH * 0.68,
      doorW * 0.95
    );
    doorGlow.addColorStop(0, 'rgba(255, 224, 140, 0.85)');
    doorGlow.addColorStop(1, 'rgba(255, 190, 95, 0)');

    const ground = ctx.createLinearGradient(0, groundTop, 0, hCSS);
    ground.addColorStop(0, '#3f7d3f');
    ground.addColorStop(0.46, '#2f5f2e');
    ground.addColorStop(1, '#1f3821');

    worldGradientCache.key = cacheKey;
    worldGradientCache.sky = sky;
    worldGradientCache.hillFar = hillFar;
    worldGradientCache.hillMid = hillMid;
    worldGradientCache.hillNear = hillNear;
    worldGradientCache.barnBody = barnBody;
    worldGradientCache.doorGlow = doorGlow;
    worldGradientCache.ground = ground;
    worldGradientCache.groundTop = groundTop;
    worldGradientCache.barnW = barnW;
    worldGradientCache.barnH = barnH;
    worldGradientCache.barnX = barnX;
    worldGradientCache.barnY = barnY;
    worldGradientCache.doorW = doorW;
    worldGradientCache.doorH = doorH;
    worldGradientCache.doorX = doorX;
    worldGradientCache.doorY = doorY;

    return worldGradientCache;
  }

  function resize() {
    wCSS = window.innerWidth;
    hCSS = window.innerHeight;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.floor(wCSS * dpr);
    canvas.height = Math.floor(hCSS * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildWorldStars();
    worldGradientCache.key = '';
    laserBeamGradientCache.length = 0;
    laserSourceGradientCache.length = 0;
  }
  window.addEventListener('resize', resize);
  resize();

  // Input
  let touchX = wCSS / 2;
  let lastX = touchX;
  let handVelX = 0;
  function setInput(x) {
    lastX = touchX;
    touchX = x;
    handVelX = touchX - lastX;
  }

  function getResponsiveScale() {
    const shortEdge = Math.max(320, Math.min(wCSS, hCSS));
    return clamp(shortEdge / MOBILE.BASE_SHORT_EDGE, MOBILE.MIN_SCALE, MOBILE.MAX_SCALE);
  }

  function getGuardianLayout() {
    const scale = getResponsiveScale();
    return {
      scale,
      sidePad: MOBILE.SIDE_PAD * scale,
      anchorY: hCSS - MOBILE.ANCHOR_OFFSET_Y * scale,
      wristOffset: MOBILE.WRIST_OFFSET * scale,
      handW: MOBILE.HAND_W * scale,
      handH: MOBILE.HAND_H * scale,
      floorY: hCSS - MOBILE.FLOOR_OFFSET_Y * scale,
      wallPad: MOBILE.WALL_PAD_X * scale,
      hitZoneX: MOBILE.HIT_ZONE_X * scale,
      hitZoneY: MOBILE.HIT_ZONE_Y * scale,
      numberFont: Math.round(MOBILE.NUM_FONT * scale),
      beamFont: Math.round(MOBILE.BEAM_FONT * scale),
    };
  }

  // Game config/state references
  const nums = S.nums;
  const particles = S.particles;
  const projectiles = S.projectiles;
  const scorePopups = S.scorePopups;
  const dangerEmbers = S.dangerEmbers;
  const dangerSizzles = S.dangerSizzles;
  const regularBeamHarvest = S.regularBeamHarvest;
  const laserStorm = S.laserStorm;

  function getGuardianPose() {
    const layout = getGuardianLayout();
    return {
      cx: Math.max(layout.sidePad, Math.min(wCSS - layout.sidePad, touchX)),
      anchorY: layout.anchorY,
    };
  }

  function getHandCenters(pose) {
    const layout = getGuardianLayout();
    const wristOffset = layout.wristOffset;
    const handW = layout.handW;
    const handH = layout.handH;
    return {
      left: {
        x: pose.cx - wristOffset - handW / 2 + HAND_TUNING.left.x,
        y: pose.anchorY + HAND_TUNING.left.y + handH / 2,
      },
      right: {
        x: pose.cx + wristOffset + handW / 2 + HAND_TUNING.right.x,
        y: pose.anchorY + HAND_TUNING.right.y + handH / 2,
      },
    };
  }

  function findNearestNumberToTap(tapX, tapY) {
    const maxDistSq = SWAT.RANGE * SWAT.RANGE;
    let nearest = null;
    let nearestDistSq = Infinity;
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      const dx = n.x - tapX;
      const dy = n.y - tapY;
      const distSq = dx * dx + dy * dy;
      if (distSq <= maxDistSq && distSq < nearestDistSq) {
        nearest = n;
        nearestDistSq = distSq;
      }
    }
    return nearest;
  }

  function tryStartPoweredSwat(targetNumber, now) {
    if (!targetNumber) return false;
    if (now - S.swat.lastAt < SWAT.COOLDOWN) return false;

    const pose = getGuardianPose();
    const centers = getHandCenters(pose);
    const dxL = targetNumber.x - centers.left.x;
    const dyL = targetNumber.y - centers.left.y;
    const dxR = targetNumber.x - centers.right.x;
    const dyR = targetNumber.y - centers.right.y;
    const distL = dxL * dxL + dyL * dyL;
    const distR = dxR * dxR + dyR * dyR;

    S.swat.hand = distL <= distR ? 'left' : 'right';
    S.swat.lastAt = now;
    S.swat.stretchUntil = now + SWAT.STRETCH_DURATION;
    return true;
  }

  const inputSystem = createInputSystem(canvas, {
    mode: getFlag('gestureArbitration') ? 'state-chart' : 'legacy',
  });
  inputSystem.setHandlers({
    onMove: (x) => setInput(x),
    onTap: ({ x, y }) => {
      if (S.isTitleScreen || S.isGameOver || S.isPaused || S.isVictory || S.ultimate.active) return;
      const now = performance.now();

      const swatTarget = findNearestNumberToTap(x, y);
      if (swatTarget) {
        tryStartPoweredSwat(swatTarget, now);
        return;
      }

      if (!canAfford(S, POWER.SHIELD_COST)) return;
      if (!activateShield(S, now)) return;
      spendPower(S, POWER.SHIELD_COST);
      telemetry.onAbilityUsed('shield');
      hudUpdater.updatePowerBar(S);
    },
    onDoubleTap: () => {
      if (S.isTitleScreen || S.isGameOver || S.isPaused || S.isVictory || S.ultimate.active) return;
      if (!canAfford(S, POWER.PROJECTILE_COST)) return;
      const pose = getGuardianPose();
      if (!fireProjectile(S, pose.cx, pose.anchorY - 50)) return;
      spendPower(S, POWER.PROJECTILE_COST);
      telemetry.onAbilityUsed('projectile');
      hudUpdater.updatePowerBar(S);
    },
    onHoldStart: () => {
      if (S.isTitleScreen || S.isGameOver || S.isPaused || S.isVictory || S.ultimate.active) return;
      if (!canAfford(S, 1)) return;
      S.magnet.active = true;
      telemetry.onAbilityUsed('magnet');
    },
    onHoldEnd: () => {
      S.magnet.active = false;
    },
    onSwipeUp: () => {
      if (S.isTitleScreen || S.isGameOver || S.isPaused || S.isVictory || S.ultimate.active) return;
      if (!canAfford(S, POWER.SLAM_COST)) return;

      const now = performance.now();
      const pose = getGuardianPose();
      const originX = pose.cx;
      const originY = pose.anchorY + 8;

      spendPower(S, POWER.SLAM_COST);
      telemetry.onAbilityUsed('slam');
      hudUpdater.updatePowerBar(S);

      S.slam.shockwave = {
        x: originX,
        y: originY,
        radius: 10,
        maxRadius: Math.hypot(wCSS, hCSS),
        startedAt: now,
        flash: 1,
      };

      const removed = clearAllTraps(12);

      if (removed > 0) {
        S.combo = 0;
        comboEl.classList.remove('active');
      }

      S.cameraShake = Math.max(S.cameraShake, 25);
    },
  });


  function showTitleScreen() {
    S.isTitleScreen = true;
    S.isPaused = false;
    S.isGameOver = false;
    S.isVictory = false;
    if (settingsPanel) settingsPanel.close({ restoreFocus: false });
    if (victoryTimeoutId) {
      clearTimeout(victoryTimeoutId);
      victoryTimeoutId = null;
    }
    pauseOverlay.classList.remove('active');
    idiotModal.style.display = 'none';
    victoryModal.style.display = 'none';
    S.ultimate.active = false;
    S.ultimate.pendingTrigger = false;
    laser(false);
    dangerdanger(false);
    toggleDangerBeam(false);
    hudUpdater.setGameplayUiVisible(false);
    if (titleScreen) titleScreen.classList.add('active');
    S.gameStartTime = performance.now();
    hudUpdater.syncBestDisplays(S);
  }

  function startGameFromTitle() {
    if (!S.isTitleScreen) return;
    if (titleScreen) titleScreen.classList.remove('active');
    hudUpdater.setGameplayUiVisible(true);
    resetGame();
  }

  hudUpdater.syncBestDisplays(S);

  // Initialize HUD displays (S7R-046)
  hudUpdater.updateLivesDisplay(S);

  function drawWorld(now, cx) {
    const elapsed = Math.max(0, now - S.gameStartTime);
    const dayProgress = Math.max(0, Math.min(1, elapsed / 180000));
    const parallax = ((cx - wCSS * 0.5) / Math.max(1, wCSS * 0.5)) * 14;
    const gradients = getWorldGradients(elapsed);

    ctx.fillStyle = gradients.sky;
    ctx.fillRect(0, 0, wCSS, hCSS);

    ctx.save();
    const starFade = 1 - dayProgress * 0.58;
    for (let i = 0; i < worldStars.length; i++) {
      const s = worldStars[i];
      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * s.tw + s.phase));
      ctx.globalAlpha = s.a * twinkle * starFade;
      ctx.fillStyle = '#f6f1ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    function drawHillLayer(baseY, amp, freq, phase, px, fillStyle) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-32, hCSS + 8);
      for (let x = -32; x <= wCSS + 32; x += 24) {
        const y =
          baseY +
          Math.sin((x + parallax * px) * freq + phase) * amp +
          Math.sin((x + parallax * px * 1.3) * (freq * 0.53) + phase * 1.7) * amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(wCSS + 32, hCSS + 8);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.restore();
    }

    drawHillLayer(
      hCSS * 0.67,
      26,
      0.0082,
      now * 0.00016 + 1.4,
      0.35,
      gradients.hillFar
    );
    drawHillLayer(
      hCSS * 0.74,
      34,
      0.0106,
      now * 0.0002 + 0.2,
      0.68,
      gradients.hillMid
    );
    drawHillLayer(
      hCSS * 0.8,
      18,
      0.0124,
      now * 0.00024 + 2.2,
      0.95,
      gradients.hillNear
    );

    const groundTop = gradients.groundTop;
    const barnW = gradients.barnW;
    const barnH = gradients.barnH;
    const barnX = gradients.barnX;
    const barnY = gradients.barnY;

    ctx.fillStyle = gradients.barnBody;
    ctx.fillRect(barnX, barnY, barnW, barnH);

    ctx.strokeStyle = 'rgba(255, 220, 185, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(barnX + 1, barnY + 1, barnW - 2, barnH - 2);

    ctx.fillStyle = '#6f2723';
    ctx.beginPath();
    ctx.moveTo(barnX - 16, barnY + 2);
    ctx.lineTo(barnX + barnW + 16, barnY + 2);
    ctx.lineTo(barnX + barnW * 0.5, barnY - barnH * 0.45);
    ctx.closePath();
    ctx.fill();

    const doorW = gradients.doorW;
    const doorH = gradients.doorH;
    const doorX = gradients.doorX;
    const doorY = gradients.doorY;
    ctx.fillStyle = gradients.doorGlow;
    ctx.fillRect(doorX - doorW * 0.7, doorY - doorH * 0.6, doorW * 2.4, doorH * 1.9);

    ctx.fillStyle = '#3b2016';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = 'rgba(255, 214, 165, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(doorX, doorY, doorW, doorH);

    ctx.fillStyle = gradients.ground;
    ctx.fillRect(0, groundTop, wCSS, hCSS - groundTop);

    ctx.save();
    ctx.strokeStyle = 'rgba(120, 190, 120, 0.2)';
    ctx.lineWidth = 1;
    for (let x = -20; x < wCSS + 20; x += 20) {
      const y = groundTop + 6 + Math.sin(x * 0.15 + now * 0.0016) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMagnetPullLines(cx, anchorY, now) {
    if (!S.magnet.active) return;
    const maxDistSq = MAGNET.RANGE * MAGNET.RANGE;
    const targetY = anchorY - 8;
    const pulse = 0.75 + 0.25 * Math.sin(now * 0.01);
    let drawn = 0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      if (n.isTrap) continue;

      const dx = cx - n.x;
      const dy = targetY - n.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxDistSq) continue;

      const dist = Math.sqrt(distSq);
      const strength = Math.max(0, 1 - dist / MAGNET.RANGE);
      const bend = (Math.sin(now * 0.013 + i * 0.7) * 18 + handVelX * 0.4) * (0.45 + strength * 0.6);
      const midX = n.x + dx * 0.5 + bend;
      const midY = n.y + dy * 0.5 - 16 * strength;

      ctx.strokeStyle = `rgba(110, 245, 255, ${0.15 + strength * 0.45})`;
      ctx.lineWidth = 1 + strength * 2.6;
      ctx.shadowColor = 'rgba(110, 245, 255, 0.9)';
      ctx.shadowBlur = 8 + strength * 18 * pulse;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.quadraticCurveTo(midX, midY, cx, targetY);
      ctx.stroke();

      drawn++;
      if (drawn >= 18) break;
    }
    ctx.restore();
  }

  function updateSlamShockwave(dt) {
    const shockwave = S.slam.shockwave;
    if (!shockwave) return;
    shockwave.radius += 1320 * dt;
    shockwave.flash = Math.max(0, shockwave.flash - dt * 3.2);
    if (shockwave.radius >= shockwave.maxRadius) {
      S.slam.shockwave = null;
    }
  }

  function drawSlamShockwave(now) {
    const shockwave = S.slam.shockwave;
    if (!shockwave) return;

    const age = Math.max(0, now - shockwave.startedAt);
    const lifeRatio = Math.max(0, 1 - shockwave.radius / shockwave.maxRadius);
    const alpha = Math.min(0.9, lifeRatio * 0.9);
    if (alpha <= 0.01) return;

    ctx.save();
    if (shockwave.flash > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 * shockwave.flash})`;
      ctx.fillRect(0, 0, wCSS, hCSS);
    }

    const lineWidth = Math.max(1.5, 14 * lifeRatio);
    const hueShift = 180 + Math.sin(age * 0.02) * 26;
    ctx.strokeStyle = `hsla(${hueShift}, 100%, 82%, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = `hsla(${hueShift + 20}, 100%, 72%, 0.95)`;
    ctx.shadowBlur = 24 * lifeRatio + 8;
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawUltimate(now, cx, anchorY) {
    if (!S.ultimate.active || S.ultimate.phase <= 0) return;
    const shipCx = badguysRender.ready ? badguysRender.x + badguysRender.w * 0.5 : cx;
    const shipCy = badguysRender.ready ? badguysRender.y + badguysRender.h * 0.55 : hCSS * 0.22;
    const phase = S.ultimate.phase;
    const flash = S.ultimate.flash;

    ctx.save();
    if (phase === 1) {
      const pulse = 0.75 + 0.25 * Math.sin(now * 0.018);
      const width = 16 + pulse * 10;
      const g = ctx.createLinearGradient(cx, anchorY, shipCx, shipCy);
      g.addColorStop(0, 'rgba(145,255,255,0.15)');
      g.addColorStop(0.5, 'rgba(255,245,170,0.72)');
      g.addColorStop(1, 'rgba(255,255,255,0.95)');

      ctx.strokeStyle = g;
      ctx.lineWidth = width;
      ctx.shadowColor = 'rgba(180, 255, 255, 0.95)';
      ctx.shadowBlur = 32 + 18 * pulse;
      ctx.beginPath();
      ctx.moveTo(cx, anchorY - 8);
      ctx.lineTo(shipCx, shipCy);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, width * 0.24);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(cx, anchorY - 8);
      ctx.lineTo(shipCx, shipCy);
      ctx.stroke();
    } else if (phase === 2) {
      const r = 40 + Math.sin(now * 0.028) * 8;
      const rg = ctx.createRadialGradient(shipCx, shipCy, 0, shipCx, shipCy, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)');
      rg.addColorStop(0.4, 'rgba(255,220,130,0.65)');
      rg.addColorStop(1, 'rgba(255,140,80,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(shipCx, shipCy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (phase === 3) {
      const r = 26 + Math.sin(now * 0.02) * 6;
      ctx.fillStyle = 'rgba(125, 235, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(shipCx, shipCy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (flash > 0.01) {
      ctx.fillStyle = `rgba(180, 235, 255, ${Math.min(0.18, flash * 0.16)})`;
      ctx.fillRect(0, 0, wCSS, hCSS);
    }
    ctx.restore();
  }

  function updatePhaseIndicator() {
    const phase = S.bossPhase;
    if (phase <= 0) {
      phaseIndicator.textContent = '';
    } else {
      const labels = ['', '', 'P2', 'P3!', 'P4!!'];
      phaseIndicator.textContent = labels[phase] || '';
      phaseIndicator.style.color = phase >= 3 ? '#ff4444' : '#ffd700';
    }
  }

  // Apply boss phase effects — activates/deactivates the existing visual systems
  function applyPhaseEffects(phase) {
    const fx = getPhaseEffects(phase);

    // Danger beam (tractor beam) — always on from phase 1
    toggleDangerBeam(fx.dangerBeam);

    // Beam harvest portal — Phase 2+ (gated in getRegularBeamPortalState, reset charge on downgrade)
    if (!fx.beamHarvest) {
      regularBeamHarvest.charge = 0;
      regularBeamHarvest.capturedDigits.length = 0;
    }

    // Laser storm — phase 3+
    laser(fx.laserStorm);

    // Danger mode (red strobe) — phase 3+
    dangerdanger(fx.dangerMode);

    // Phase 4: widen the danger beam
    if (fx.wideDangerBeam) {
      dangerBeam.widthRatio = 0.48; // wider than default 0.33
    } else {
      dangerBeam.widthRatio = DANGER_BEAM_TUNING.widthRatio;
    }

    updatePhaseIndicator();
  }

  hudUpdater.updateShipHpBar(S);
  hudUpdater.updatePowerBar(S);
  updatePhaseIndicator();

  function updateShipRecoil(dt) {
    if (
      Math.abs(S.shipRecoilX) < 0.01 &&
      Math.abs(S.shipRecoilY) < 0.01 &&
      Math.abs(S.shipRecoilVX) < 0.01 &&
      Math.abs(S.shipRecoilVY) < 0.01
    ) {
      S.shipRecoilX = 0;
      S.shipRecoilY = 0;
      S.shipRecoilVX = 0;
      S.shipRecoilVY = 0;
      return;
    }

    S.shipRecoilVX += -S.shipRecoilX * POLISH.SHIP_RECOIL_SPRING * dt;
    S.shipRecoilVY += -S.shipRecoilY * POLISH.SHIP_RECOIL_SPRING * dt;
    const damping = Math.pow(POLISH.SHIP_RECOIL_DAMPING, dt * 60);
    S.shipRecoilVX *= damping;
    S.shipRecoilVY *= damping;
    S.shipRecoilX += S.shipRecoilVX * dt;
    S.shipRecoilY += S.shipRecoilVY * dt;
    S.shipRecoilX = Math.max(-POLISH.SHIP_RECOIL_MAX_X, Math.min(POLISH.SHIP_RECOIL_MAX_X, S.shipRecoilX));
    S.shipRecoilY = Math.max(-POLISH.SHIP_RECOIL_MAX_Y, Math.min(POLISH.SHIP_RECOIL_MAX_Y, S.shipRecoilY));
  }

  function applyShipDamage(amount, hitX = null, hitY = null, source = 'unknown') {
    if (!Number.isFinite(amount) || amount <= 0 || S.shipHP <= 0 || S.isVictory) return false;

    const hpBefore = S.shipHP;
    damageShip(S, amount);
    if (S.shipHP >= hpBefore) return false;

    const now = performance.now();
    const burstScale = now - S.lastShipHitFxAt < 42 ? 0.45 : 1;
    S.lastShipHitFxAt = now;

    const shipCx = badguysRender.ready ? badguysRender.x + badguysRender.w * 0.5 : wCSS * 0.5;
    const shipCy = badguysRender.ready ? badguysRender.y + badguysRender.h * 0.5 : hCSS * 0.22;
    const fromX = Number.isFinite(hitX) ? hitX : shipCx;
    const fromY = Number.isFinite(hitY) ? hitY : shipCy + 1;
    const dx = shipCx - fromX;
    const dy = shipCy - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const impulse = (98 + Math.min(12, amount) * 9) * burstScale;

    S.shipRecoilVX += (dx / len) * impulse;
    S.shipRecoilVY += (dy / len) * impulse * 0.72 - 20 * burstScale;
    S.shipDamageFlash = Math.max(S.shipDamageFlash, Math.min(1, 0.55 + amount * 0.06));
    telemetry.onShipDamage(amount, source);
    S.cameraShake = Math.max(S.cameraShake, 4 + Math.min(14, amount));
    return true;
  }

  function pushScorePopup(x, y, text, color = '#fff', size = 24) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !text) return;
    const ttl = POLISH.SCORE_POPUP_LIFE_SEC + random() * 0.24;
    scorePopups.push({
      x,
      y,
      text,
      color,
      size,
      vx: (random() - 0.5) * 24,
      vy: -(72 + random() * 24),
      life: ttl,
      maxLife: ttl,
    });
    if (scorePopups.length > POLISH.SCORE_POPUP_MAX) scorePopups.splice(0, scorePopups.length - POLISH.SCORE_POPUP_MAX);
  }

  function removeBySwapPop(list, index) { list[index] = list[list.length - 1]; list.pop(); }

  function updateScorePopups(dt) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const p = scorePopups[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 96 * dt;
      p.life -= dt;
      if (p.life <= 0) removeBySwapPop(scorePopups, i);
    }
  }

  function drawScorePopups() {
    if (!scorePopups.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < scorePopups.length; i++) {
      const p = scorePopups[i];
      const lifeRatio = Math.max(0, Math.min(1, p.life / Math.max(0.001, p.maxLife)));
      if (lifeRatio <= 0.01) continue;
      const alpha = Math.min(1, lifeRatio * 1.35);
      const size = Math.max(12, Math.round(p.size * (0.92 + (1 - lifeRatio) * 0.16)));
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14 * alpha;
      ctx.fillStyle = p.color;
      ctx.font = `900 ${size}px Arial`;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Particle system
  function createParticles(x, y, color, count = 8) {
    const burstCount = getParticleBurstCount(count);
    const particleCap = getParticleCap();

    if (particles.length + burstCount > particleCap) {
      particles.splice(0, particles.length + burstCount - particleCap);
    }

    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * (3 + random() * 3),
        vy: Math.sin(angle) * (3 + random() * 3) - 2,
        life: 1,
        color,
      });
    }
  }

  function updateParticles() {
    const particleCap = getParticleCap();
    if (particles.length > particleCap) {
      particles.splice(0, particles.length - particleCap);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.02;

      if (p.life <= 0) {
        removeBySwapPop(particles, i);
      }
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function createNumber(
    txt,
    col,
    isTrap = false,
    spawnX = null,
    spawnY = null,
    launchDx = null,
    launchDy = null
  ) {
    if (nums.length >= MAX_ACTIVE_NUMS) {
      let removed = false;
      for (let i = 0; i < nums.length; i++) {
        if (!nums[i].isTrap) {
          nums.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (!removed) nums.shift();
    }

    return {
      txt,
      col,
      isTrap,
      x: spawnX === null ? random() * (wCSS - 120) + 60 : spawnX,
      y: spawnY === null ? -100 : spawnY,
      dx: launchDx === null ? (random() - 0.5) * 4 : launchDx,
      dy: launchDy === null ? 0 : launchDy,
      cooldown: 0,
      glow: isTrap ? 1 : 0,
      bornAt: performance.now(),
      floorBounces: 0,
    };
  }

  function getBadguysSpawnPoint() {
    if (!badguysRender.ready) {
      updateBadguysState(performance.now(), 0.016);
    }

    if (badguysRender.ready) {
      const spread = badguysRender.w * 0.42;
      const left = badguysRender.x + (badguysRender.w - spread) / 2;
      const centeredT = (random() + random()) / 2;
      return {
        x: left + centeredT * spread,
        y: badguysRender.y + badguysRender.h + 8,
      };
    }

    if (badguysFlight.initialized) {
      return { x: badguysFlight.x + 120, y: badguysFlight.y + 80 };
    }

    return { x: wCSS / 2, y: badguysOverlay.y + 80 };
  }

  function getSpawnLaunchVector() {
    return {
      dx: (random() - 0.5) * 2.4,
      dy: 0.8 + random() * 1.6,
    };
  }

  function spawnTrap() {
    const badNums = ['2', '3', '4', '5', '8', '9'];
    const txt = badNums[Math.floor(random() * badNums.length)];
    const spawn = getBadguysSpawnPoint();
    const launch = getSpawnLaunchVector();
    nums.push(createNumber(txt, '#ff3333', true, spawn.x, spawn.y, launch.dx, launch.dy));
    spawnEnemyLifecycleShadow(performance.now());
  }

  function spawnGood() {
    const goodNums = ['6', '7'];
    const txt = goodNums[Math.floor(random() * goodNums.length)];
    const col = txt === '6' ? '#ff7eb3' : '#7afcff';
    const spawn = getBadguysSpawnPoint();
    const launch = getSpawnLaunchVector();
    nums.push(createNumber(txt, col, false, spawn.x, spawn.y, launch.dx, launch.dy));
  }

  function clearAllTraps(particleCount = 10) {
    let removed = 0;
    for (let i = nums.length - 1; i >= 0; i--) {
      if (!nums[i].isTrap) continue;
      createParticles(nums[i].x, nums[i].y, nums[i].col, particleCount);
      nums.splice(i, 1);
      removed++;
    }
    return removed;
  }

  function spawnUltimateBonusRain(count = ULTIMATE.BONUS_RAIN_COUNT) {
    for (let i = 0; i < count; i++) {
      const txt = random() < 0.5 ? '6' : '7';
      const col = txt === '6' ? '#ff7eb3' : '#7afcff';
      const x = 44 + random() * Math.max(20, wCSS - 88);
      const y = -40 - random() * 160;
      const dx = (random() - 0.5) * 3;
      const dy = 1 + random() * 2;
      nums.push(createNumber(txt, col, false, x, y, dx, dy));
    }
  }

  function startUltimate(now, cx, anchorY) {
    if (S.ultimate.active || S.isVictory || S.isGameOver) return false;
    S.ultimate.pendingTrigger = false;
    S.ultimate.active = true;
    telemetry.onAbilityUsed('ultimate');
    S.ultimate.startedAt = now;
    S.ultimate.phase = 1;
    S.ultimate.flash = 1;
    S.ultimate.nextTrapSweepAt = now;
    S.ultimate.rainSpawned = false;
    S.ultimate.explosionCarry = 0;
    S.magnet.active = false;
    S.slam.shockwave = null;

    S.power = 0;
    hudUpdater.updatePowerBar(S);

    const removed = clearAllTraps(10);
    if (removed > 0) {
      S.combo = 0;
      comboEl.classList.remove('active');
    }

    if (S.shipHP > 0 && !S.isVictory) {
      if (badguysRender.ready) {
        const hitX = badguysRender.x + badguysRender.w * 0.5;
        const hitY = badguysRender.y + badguysRender.h * 0.52;
        applyShipDamage(ULTIMATE.DAMAGE, hitX, hitY, 'ultimate');
        createParticles(hitX, hitY, '#ffe89a', 28);
      } else {
        applyShipDamage(ULTIMATE.DAMAGE, null, null, 'ultimate');
      }
      hudUpdater.updateShipHpBar(S);
    }

    createParticles(cx, anchorY - 12, '#9dfcff', 18);
    S.cameraShake = Math.max(S.cameraShake, 18);
    return true;
  }

  function updateUltimate(now, dt) {
    if (!S.ultimate.active) return;
    const elapsed = now - S.ultimate.startedAt;

    if (elapsed < ULTIMATE.BEAM_MS) {
      S.ultimate.phase = 1;
    } else if (elapsed < ULTIMATE.EXPLOSION_MS) {
      S.ultimate.phase = 2;
    } else if (elapsed < ULTIMATE.RAIN_MS) {
      if (S.ultimate.phase !== 3) {
        S.ultimate.phase = 3;
      }
    } else {
      S.ultimate.active = false;
      S.ultimate.phase = 0;
      S.ultimate.flash = 0;
      return;
    }

    if (now >= S.ultimate.nextTrapSweepAt) {
      const removed = clearAllTraps(6);
      if (removed > 0) {
        S.combo = 0;
        comboEl.classList.remove('active');
      }
      S.ultimate.nextTrapSweepAt = now + 90;
    }

    if (S.ultimate.phase === 2 && badguysRender.ready) {
      S.ultimate.explosionCarry += dt * 48;
      while (S.ultimate.explosionCarry >= 1) {
        S.ultimate.explosionCarry -= 1;
        const ex = badguysRender.x + random() * badguysRender.w;
        const ey = badguysRender.y + random() * badguysRender.h * 0.8;
        createParticles(ex, ey, '#ffc97a', 3);
      }
    }

    if (S.ultimate.phase === 3 && !S.ultimate.rainSpawned) {
      S.ultimate.rainSpawned = true;
      spawnUltimateBonusRain(ULTIMATE.BONUS_RAIN_COUNT);
      createParticles(wCSS * 0.5, hCSS * 0.2, '#7afcff', 20);
    }

    const flashDecay = S.ultimate.phase === 1 ? 2.2 : 1.0;
    S.ultimate.flash = Math.max(0, S.ultimate.flash - dt * flashDecay);
    S.cameraShake = Math.max(S.cameraShake, S.ultimate.phase === 1 ? 18 : 14);
  }

  function resetGame() {
    logRunSummary('reset');
    startRngRun('new-run');
    if (settingsPanel) settingsPanel.close({ restoreFocus: false });

    S.isTitleScreen = false;
    S.score = 0;
    S.combo = 0;
    S.bestCombo = 0;
    S.isGameOver = false;
    S.isPaused = false;
    if (victoryTimeoutId) { clearTimeout(victoryTimeoutId); victoryTimeoutId = null; }
    resetLives(S);
    resetShip(S);
    resetPower(S);
    S.scorePopups.length = 0;
    S.lifeLossFlash = 0;
    S.slowMoTimer = 0;
    S.shipRecoilX = 0;
    S.shipRecoilY = 0;
    S.shipRecoilVX = 0;
    S.shipRecoilVY = 0;
    S.lastShipHitFxAt = -Infinity;
    S.shield.active = false;
    S.shield.startedAt = 0;
    S.shield.lastUsedAt = -Infinity;
    S.shield.rippleAt = -Infinity;
    S.swat.lastAt = -Infinity;
    S.swat.hand = null;
    S.swat.stretchUntil = 0;
    S.magnet.active = false;
    S.slam.shockwave = null;
    S.ultimate.active = false;
    S.ultimate.pendingTrigger = false;
    S.ultimate.startedAt = 0;
    S.ultimate.phase = 0;
    S.ultimate.flash = 0;
    S.ultimate.nextTrapSweepAt = 0;
    S.ultimate.rainSpawned = false;
    S.ultimate.explosionCarry = 0;
    S.dangerBeam.speedA = 0.0016 + random() * 0.0012;
    S.dangerBeam.speedB = 0.0027 + random() * 0.0017;
    S.dangerBeam.phaseA = random() * Math.PI * 2;
    S.dangerBeam.phaseB = random() * Math.PI * 2;
    S.dangerBeam.huePhase = random() * Math.PI * 2;
    hudUpdater.updateLivesDisplay(S);
    hudUpdater.updateShipHpBar(S);
    hudUpdater.updatePowerBar(S);
    scoreEl.textContent = S.score;
    comboEl.textContent = '';
    comboEl.classList.remove('active');
    livesEl.classList.remove('hit', 'gain');
    idiotModal.style.display = 'none';
    victoryModal.style.display = 'none';
    pauseOverlay.classList.remove('active');
    S.lastTrapTime = performance.now();
    S.lastGoodTime = performance.now();
    S.gameStartTime = performance.now();
    S.spawnInterval = INITIAL_SPAWN_INTERVAL;
    S.trapChance = TRAP_SPAWN_CHANCE_START;
    S.cameraShake = 0;
    resetEnemyStateMachine(performance.now());
    particles.length = 0;
    projectiles.length = 0;
    dangerEmbers.length = 0;
    S.dangerEmberSpawnCarry = 0;
    dangerSizzles.length = 0;
    regularBeamHarvest.charge = 0;
    regularBeamHarvest.capturedDigits.length = 0;
    regularBeamHarvest.flash = 0;
    regularBeamHarvest.eruptionFlash = 0;
    regularBeamHarvest.eruptionNumbers.length = 0;
    laserStorm.beams.length = 0;
    laserStorm.segments.length = 0;
    laserStorm.smokePuffs.length = 0;
    laserStorm.spawnCarry = 0;
    laserStorm.sourceBurst = 0;
    badguysFlight.initialized = false;
    badguysRender.ready = false;
    updateBadguysState(performance.now(), 0.016);

    nums.length = 0;
    for (let i = 0; i < 3; i++) spawnGood();

    // Apply phase 1 effects (beam on, lasers/danger off)
    applyPhaseEffects(1);
  }

  let victoryTimeoutId = null;

  function triggerVictory(now) {
    logRunSummary('victory', now);

    // S.isVictory is already set by updateBossPhase() in progression.js
    S.ultimate.active = false;
    S.ultimate.pendingTrigger = false;
    S.ultimate.phase = 0;
    S.ultimate.flash = 0;
    S.cameraShake = Math.max(S.cameraShake, 30);
    // Massive celebration particles
    for (let i = 0; i < 40; i++) {
      const x = random() * wCSS;
      const y = random() * hCSS * 0.5;
      const colors = ['#ffd700', '#ff7eb3', '#7afcff', '#00ff88', '#ff44ff'];
      createParticles(x, y, colors[i % colors.length], 4);
    }
    // Turn off all hostile effects
    laser(false);
    dangerdanger(false);
    toggleDangerBeam(false);

    // Show victory modal
    const survivalTime = Math.floor((now - S.gameStartTime) / 1000);
    document.getElementById('victoryScore').textContent = S.score;
    document.getElementById('victoryCombo').textContent = S.bestCombo;
    document.getElementById('victoryTime').textContent = survivalTime;

    if (S.score > S.highScore) {
      S.highScore = S.score;
      localStorage.setItem('highScore', S.highScore);
      hudUpdater.syncBestDisplays(S);
    }

    hudUpdater.updateShipHpBar(S);
    updatePhaseIndicator();
    // Delay showing the modal to let the explosion play
    victoryTimeoutId = setTimeout(() => {
      victoryModal.style.display = 'flex';
      victoryTimeoutId = null;
    }, 1200);
  }

  function togglePause() {
    if (S.isTitleScreen || S.isGameOver || S.isVictory) return;
    S.isPaused = !S.isPaused;
    pauseOverlay.classList.toggle('active', S.isPaused);
  }

  function usePower(cost) {
    if (!canAfford(S, cost)) return false;
    spendPower(S, cost);
    hudUpdater.updatePowerBar(S);
    return true;
  }

  function beforeOpenSettingsPanel() {
    if (S.isTitleScreen || S.isGameOver || S.isVictory) return false;
    settingsOpenedWhileRunning = !S.isPaused;
    if (settingsOpenedWhileRunning) {
      S.isPaused = true;
      pauseOverlay.classList.add('active');
    }
    return true;
  }

  function afterCloseSettingsPanel() {
    if (settingsOpenedWhileRunning && S.isPaused) {
      S.isPaused = false;
      pauseOverlay.classList.remove('active');
    }
    settingsOpenedWhileRunning = false;
  }

  settingsPanel = createSettingsPanel({
    controller: accessibilitySettingsController,
    enabled: accessibilitySettingsEnabled,
    beforeOpen: beforeOpenSettingsPanel,
    afterClose: afterCloseSettingsPanel,
  });

  // Action Bar UI (S7R-046)
  let actionRouter = null;
  actionBar = createActionBar({
    enabled: getFlag('actionBar'),
    buttons: createActionBarButtons(),
    beforeActivate: (buttonId) => Boolean(actionRouter && actionRouter.handleActivation(buttonId)),
  });
  actionRouter = createActionRouter({ S, actionBar, activateShield, fireProjectile, getGuardianPose, telemetry, usePower });

  window.addEventListener('flagchange', (event) => {
    const detail = event.detail;
    if (!detail) return;

    if (detail.flagName === 'accessibilitySettings') {
      accessibilitySettingsEnabled = Boolean(detail.newValue);
      accessibilitySettingsController.setEnabled(accessibilitySettingsEnabled);
      if (settingsPanel) settingsPanel.setEnabled(accessibilitySettingsEnabled);
    }

    if (detail.flagName === 'adaptiveQuality' && !detail.newValue) {
      resetAdaptiveQuality(performance.now());
    }

    if (detail.flagName === 'enemyRegistry') {
      applyEnemyRegistryFlag();
      resetEnemyStateMachine(performance.now());
    }

    if (detail.flagName === 'enemyStateMachine') {
      resetEnemyStateMachine(performance.now());
    }

    if (detail.flagName === 'actionBar') {
      if (actionBar) actionBar.setEnabled(Boolean(detail.newValue));
    }
  });

  window.addEventListener('flagsreset', () => {
    accessibilitySettingsEnabled = Boolean(getFlag('accessibilitySettings'));
    accessibilitySettingsController.setEnabled(accessibilitySettingsEnabled);
    if (settingsPanel) settingsPanel.setEnabled(accessibilitySettingsEnabled);
    if (actionBar) actionBar.setEnabled(Boolean(getFlag('actionBar')));
    resetAdaptiveQuality(performance.now());
    applyEnemyRegistryFlag();
    resetEnemyStateMachine(performance.now());
  });

  resetBtn.onclick = resetGame;
  restartBigBtn.onclick = showTitleScreen;
  victoryPlayAgain.onclick = showTitleScreen;
  pauseBtn.onclick = togglePause;
  resumeBtn.onclick = togglePause;
  if (startGameBtn) startGameBtn.onclick = startGameFromTitle;
  if (titleScreen) titleScreen.addEventListener('pointerdown', startGameFromTitle);
  window.addEventListener('keydown', (e) => {
    if (!S.isTitleScreen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startGameFromTitle();
    }
  });

  const handTuning = HAND_TUNING;
  const scowlOverlay = SCOWL_OVERLAY;
  const badguysOverlay = S.badguysOverlay;
  const defaultBadguysOverlay = { ...BADGUYS_OVERLAY_DEFAULT };
  const badguysMotionPausedForLightSetup = S.badguysMotionPausedForLightSetup;
  const badguysFlight = S.badguysFlight;
  const badguysRender = S.badguysRender;
  const badguysLightAnchors = S.badguysLightAnchors;
  const badguysLightSetup = S.badguysLightSetup;
  const badguysLightVisual = S.badguysLightVisual;
  const dangerBeam = S.dangerBeam;
  const badguysEditor = S.badguysEditor;

  const badguysHud = document.createElement('div');
  badguysHud.style.position = 'absolute';
  badguysHud.style.right = '12px';
  badguysHud.style.bottom = '12px';
  badguysHud.style.zIndex = '2000';
  badguysHud.style.padding = '10px 12px';
  badguysHud.style.font = '12px/1.4 monospace';
  badguysHud.style.whiteSpace = 'pre';
  badguysHud.style.color = '#fff';
  badguysHud.style.background = 'rgba(0,0,0,0.6)';
  badguysHud.style.border = '1px solid rgba(255,255,255,0.35)';
  badguysHud.style.borderRadius = '10px';
  badguysHud.style.backdropFilter = 'blur(4px)';
  document.body.appendChild(badguysHud);

  function roundedBadguysOverlay() {
    return {
      scale: Math.round(badguysOverlay.scale * 1000) / 1000,
      y: Math.round(badguysOverlay.y * 100) / 100,
    };
  }

  function badguysOverlaySnippet() {
    const b = roundedBadguysOverlay();
    return `const badguysOverlay = { scale: ${b.scale}, y: ${b.y} };`;
  }

  function roundedBadguysLightAnchors() {
    return badguysLightAnchors.map((p) => ({
      x: Math.round(p.x * 10000) / 10000,
      y: Math.round(p.y * 10000) / 10000,
    }));
  }

  function badguysLightAnchorsSnippet() {
    const points = roundedBadguysLightAnchors();
    if (!points.length) return 'const badguysLightAnchors = [];';
    const body = points.map((p) => `  { x: ${p.x}, y: ${p.y} },`).join('\n');
    return `const badguysLightAnchors = [\n${body}\n];`;
  }

  function roundedDangerBeam() {
    return {
      widthRatio: Math.round(dangerBeam.widthRatio * 1000) / 1000,
      lengthMin: Math.round(dangerBeam.lengthMin * 1000) / 1000,
      lengthMax: Math.round(dangerBeam.lengthMax * 1000) / 1000,
      offsetX: Math.round(dangerBeam.offsetX * 100) / 100,
      offsetY: Math.round(dangerBeam.offsetY * 100) / 100,
    };
  }

  function dangerBeamSnippet() {
    const d = roundedDangerBeam();
    return (
      `const dangerBeamTuning = {\n` +
      `  widthRatio: ${d.widthRatio},\n` +
      `  lengthMin: ${d.lengthMin},\n` +
      `  lengthMax: ${d.lengthMax},\n` +
      `  offsetX: ${d.offsetX},\n` +
      `  offsetY: ${d.offsetY},\n` +
      `};`
    );
  }

  function updateBadguysHud(message = '') {
    if (!badguysEditor.enabled || !badguysEditor.visible) {
      badguysHud.style.display = 'none';
      return;
    }
    badguysHud.style.display = 'block';
    const b = roundedBadguysOverlay();
    badguysHud.textContent =
      `Badguys Editor (temp)\n` +
      `+/- resize | Shift = bigger step\n` +
      `Click craft add light | Shift+Click remove\n` +
      `U undo | X clear | T lights on/off\n` +
      `D toggle dangerdanger (red strobe)\n` +
      `B toggle danger beam\n` +
      `Z toggle laser storm\n` +
      `G toggle sprite sheet (clean/raw)\n` +
      `I/K beam up/down | J/L beam left/right\n` +
      `Shift = bigger beam nudge | O reset beam offset\n` +
      `[ ] resize lights | Shift bigger step\n` +
      `R reset size | C copy code | V toggle image\n` +
      `H hide HUD | F8 disable editor\n` +
      `scale=${b.scale} y=${b.y}\n` +
      `flight=(${Math.round(badguysFlight.x)}, ${Math.round(badguysFlight.y)})\n` +
      `lightSize=${badguysLightVisual.size}\n` +
      `dangerMode=${S.isDangerDanger}\n` +
      `beam=${dangerBeam.enabled}\n` +
      `portalCharge=${regularBeamHarvest.charge}/${regularBeamHarvest.target}\n` +
      `laser=${laserStorm.enabled} beams=${laserStorm.beams.length}\n` +
      `sprite=${S.badguysSpriteVariant}\n` +
      `beamOffset=(${Math.round(dangerBeam.offsetX)}, ${Math.round(dangerBeam.offsetY)})\n` +
      `lights=${badguysLightAnchors.length}/${badguysLightSetup.max} setup=${badguysLightSetup.enabled}\n` +
      `visible=${S.badguysVisible}\n` +
      (message ? `\n${message}` : '');
  }

  function dangerdanger(forceState = null) {
    if (typeof forceState === 'boolean') {
      S.isDangerDanger = forceState;
    } else {
      S.isDangerDanger = !S.isDangerDanger;
    }
    S.scowlVisible = S.isDangerDanger;
    updateBadguysHud(S.isDangerDanger ? 'Danger mode enabled' : 'Danger mode disabled');
    return S.isDangerDanger;
  }
  window.dangerdanger = dangerdanger;

  function toggleDangerBeam(forceState = null) {
    if (typeof forceState === 'boolean') {
      dangerBeam.enabled = forceState;
    } else {
      dangerBeam.enabled = !dangerBeam.enabled;
    }
    updateBadguysHud(dangerBeam.enabled ? 'Danger beam enabled' : 'Danger beam disabled');
    return dangerBeam.enabled;
  }
  window.toggleDangerBeam = toggleDangerBeam;
  window.particlebeam = toggleDangerBeam;

  function laser(forceState = null) {
    if (typeof forceState === 'boolean') {
      laserStorm.enabled = forceState;
    } else {
      laserStorm.enabled = !laserStorm.enabled;
    }
    if (!laserStorm.enabled) {
      laserStorm.beams.length = 0;
      laserStorm.segments.length = 0;
      laserStorm.spawnCarry = 0;
      laserStorm.smokePuffs.length = 0;
    } else {
      laserStorm.sourceBurst = 1;
    }
    updateBadguysHud(laserStorm.enabled ? 'Laser storm enabled' : 'Laser storm disabled');
    return laserStorm.enabled;
  }
  window.laser = laser;

  function toggleBadguysSpriteVariant(forceVariant = null) {
    if (forceVariant === 'clean' || forceVariant === 'raw') {
      S.badguysSpriteVariant = forceVariant;
    } else {
      S.badguysSpriteVariant = S.badguysSpriteVariant === 'clean' ? 'raw' : 'clean';
    }
    updateBadguysHud(
      S.badguysSpriteVariant === 'clean' ? 'Using cleaned sprite sheet' : 'Using original sprite sheet'
    );
    return S.badguysSpriteVariant;
  }
  window.toggleBadguysSpriteVariant = toggleBadguysSpriteVariant;

  function getBadguysScreenPoint(lightPoint) {
    return {
      x: badguysRender.x + lightPoint.x * badguysRender.w,
      y: badguysRender.y + lightPoint.y * badguysRender.h,
    };
  }

  function tryRemoveNearestBadguysLight(clientX, clientY) {
    if (!badguysRender.ready || !badguysLightAnchors.length) return false;
    let nearest = -1;
    let nearestDistSq = Infinity;
    for (let i = 0; i < badguysLightAnchors.length; i++) {
      const p = getBadguysScreenPoint(badguysLightAnchors[i]);
      const dx = p.x - clientX;
      const dy = p.y - clientY;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = i;
      }
    }
    if (nearest === -1 || nearestDistSq > badguysLightSetup.removeRadius * badguysLightSetup.removeRadius) {
      return false;
    }
    badguysLightAnchors.splice(nearest, 1);
    return true;
  }

  updateBadguysHud();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
      badguysEditor.enabled = !badguysEditor.enabled;
      updateBadguysHud(badguysEditor.enabled ? 'Editor enabled' : 'Editor disabled');
      return;
    }

    if (!badguysEditor.enabled) return;

    const scaleStep = e.shiftKey ? badguysEditor.scaleStepFast : badguysEditor.scaleStep;
    const lightStep = e.shiftKey ? badguysLightVisual.stepFast : badguysLightVisual.step;
    const beamStep = e.shiftKey ? dangerBeam.nudgeStepFast : dangerBeam.nudgeStep;
    let handled = true;
    let message = '';

    switch (e.key) {
      case '+':
      case '=':
        badguysOverlay.scale = Math.max(0.05, badguysOverlay.scale + scaleStep);
        break;
      case '-':
      case '_':
        badguysOverlay.scale = Math.max(0.05, badguysOverlay.scale - scaleStep);
        break;
      case '[':
      case '{':
        badguysLightVisual.size = Math.max(
          badguysLightVisual.minSize,
          badguysLightVisual.size - lightStep
        );
        message = 'Reduced light size';
        break;
      case ']':
      case '}':
        badguysLightVisual.size = Math.min(
          badguysLightVisual.maxSize,
          badguysLightVisual.size + lightStep
        );
        message = 'Increased light size';
        break;
      case 'r':
      case 'R':
        Object.assign(badguysOverlay, defaultBadguysOverlay);
        message = 'Reset badguys overlay';
        break;
      case 'u':
      case 'U':
        if (badguysLightAnchors.length) {
          badguysLightAnchors.pop();
          message = 'Removed last light';
        } else {
          message = 'No lights to remove';
        }
        break;
      case 'x':
      case 'X':
        badguysLightAnchors.length = 0;
        message = 'Cleared all light points';
        break;
      case 't':
      case 'T':
        badguysLightSetup.enabled = !badguysLightSetup.enabled;
        message = badguysLightSetup.enabled ? 'Light setup enabled' : 'Light setup disabled';
        break;
      case 'd':
      case 'D':
        dangerdanger();
        return;
      case 'b':
      case 'B':
        toggleDangerBeam();
        return;
      case 'z':
      case 'Z':
        laser();
        return;
      case 'g':
      case 'G':
        toggleBadguysSpriteVariant();
        return;
      case 'i':
      case 'I':
        dangerBeam.offsetY -= beamStep;
        message = 'Beam moved up';
        break;
      case 'k':
      case 'K':
        dangerBeam.offsetY += beamStep;
        message = 'Beam moved down';
        break;
      case 'j':
      case 'J':
        dangerBeam.offsetX -= beamStep;
        message = 'Beam moved left';
        break;
      case 'l':
      case 'L':
        dangerBeam.offsetX += beamStep;
        message = 'Beam moved right';
        break;
      case 'o':
      case 'O':
        dangerBeam.offsetX = 0;
        dangerBeam.offsetY = 0;
        message = 'Beam offset reset';
        break;
      case 'h':
      case 'H':
        badguysEditor.visible = !badguysEditor.visible;
        updateBadguysHud(badguysEditor.visible ? 'HUD shown' : 'HUD hidden');
        return;
      case 'v':
      case 'V':
        S.badguysVisible = !S.badguysVisible;
        updateBadguysHud(S.badguysVisible ? 'Image visible' : 'Image hidden');
        return;
      case 'c':
      case 'C': {
        const snippet = `${badguysOverlaySnippet()}\n${badguysLightAnchorsSnippet()}\n${dangerBeamSnippet()}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(snippet)
            .then(() => updateBadguysHud('Copied overlay + light points + beam snippet'))
            .catch(() => updateBadguysHud('Copy failed; see console'));
        } else {
          updateBadguysHud('Clipboard unavailable; see console');
        }
        console.log('\n' + snippet);
        return;
      }
      default:
        handled = false;
    }

    if (!handled) return;
    e.preventDefault();
    updateBadguysHud(message || 'Updated badguys size');
  });

  window.addEventListener('pointerdown', (e) => {
    if (!badguysEditor.enabled || !badguysLightSetup.enabled) return;
    if (e.button !== 0 || !badguysRender.ready) return;

    const inX = e.clientX >= badguysRender.x && e.clientX <= badguysRender.x + badguysRender.w;
    const inY = e.clientY >= badguysRender.y && e.clientY <= badguysRender.y + badguysRender.h;
    if (!inX || !inY) return;

    e.preventDefault();

    if (e.shiftKey) {
      const removed = tryRemoveNearestBadguysLight(e.clientX, e.clientY);
      updateBadguysHud(removed ? 'Removed nearest light' : 'No nearby light to remove');
      return;
    }

    if (badguysLightAnchors.length >= badguysLightSetup.max) {
      updateBadguysHud(`Max ${badguysLightSetup.max} lights reached`);
      return;
    }

    const x = clamp((e.clientX - badguysRender.x) / badguysRender.w, 0, 1);
    const y = clamp((e.clientY - badguysRender.y) / badguysRender.h, 0, 1);
    badguysLightAnchors.push({ x, y });
    updateBadguysHud(`Placed light ${badguysLightAnchors.length}/${badguysLightSetup.max}`);
  });

  // Sprite utilities delegated to utils/sprite.js
  // Bridge: create a Set of hand images for the transparency key thresholds
  // Some bridges aren't called yet — they exist for Phase B+ extraction
  /* eslint-disable no-unused-vars */
  const handImages = new Set([leftHandImg, rightHandImg]);
  function getTransparentSprite(img) { return _getTransparentSprite(img, handImages); }
  function drawImageWithTransparencyKey(img, x, y, w, h) { _drawImageWithTransparencyKey(ctx, img, x, y, w, h, handImages); }
  function getSpriteAlphaData(img) { return _getSpriteAlphaData(img, handImages); }
  // Pure pixel-test functions — delegated directly
  const sampleSpriteAlpha = _sampleSpriteAlpha;
  const isVisibleOnBody = _isVisibleOnBody;
  const isVisibleOnHand = _isVisibleOnHand;
  const hitVisibleCharacterPixel = _hitVisibleCharacterPixel;
  const sampleVisibleCharacter = _sampleVisibleCharacter;
  const estimateCharacterNormal = _estimateCharacterNormal;
  /* eslint-enable no-unused-vars */

  // Delegated to utils/math.js
  const clamp = _clamp;
  const distPointToSegmentSq = _distPointToSegmentSq;

  function getLaserBeamSource(beam, anchors) {
    const idx = ((beam.anchorIndex % anchors.length) + anchors.length) % anchors.length;
    return getBadguysScreenPoint(anchors[idx]);
  }

  function startLaserPostHitBounce(beam, sourceX, sourceY) {
    if (beam.inert) return;
    beam.inert = true;
    beam.bouncesRemaining = 4;
    beam.inertElapsed = 0;
    beam.inertDuration = 1;
    beam.bounceStage = -1;

    const startX = clamp(sourceX + Math.cos(beam.angle) * beam.length * 0.44, 0, wCSS);
    const startY = clamp(sourceY + Math.sin(beam.angle) * beam.length * 0.44, 0, hCSS);
    const sides = ['left', 'top', 'right', 'bottom'];
    const offset = (random() * 4) | 0;
    const ordered = [
      sides[offset],
      sides[(offset + 1) % 4],
      sides[(offset + 2) % 4],
      sides[(offset + 3) % 4],
    ];
    const points = [{ x: startX, y: startY }];
    for (let i = 0; i < ordered.length; i++) {
      const side = ordered[i];
      if (side === 'left') points.push({ x: 0, y: random() * hCSS });
      else if (side === 'right') points.push({ x: wCSS, y: random() * hCSS });
      else if (side === 'top') points.push({ x: random() * wCSS, y: 0 });
      else points.push({ x: random() * wCSS, y: hCSS });
    }

    beam.bouncePath = points;
    beam.tipX = startX;
    beam.tipY = startY;
    beam.life = Math.max(beam.life, 1.05);
  }

  function updateLaserBounceTip(beam, dt, sourceX, sourceY) {
    if (!beam.bouncePath || beam.bouncePath.length < 2) {
      beam.life -= dt * 4;
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
      beam.bouncesRemaining = Math.max(0, 4 - (seg + 1));
    }

    if (beam.inertElapsed >= beam.inertDuration) {
      beam.life -= dt * 4.2;
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

  function updateLaserStorm(now, dt) {
    laserStorm.segments.length = 0;
    laserStorm.sourceBurst = Math.max(0, laserStorm.sourceBurst - dt * 1.4);

    if (!(laserStorm.enabled && badguysRender.ready)) return;
    const maxLaserBeams = Math.max(
      2,
      Math.floor(getAdaptiveCapValue('maxActiveLaserBeams', MAX_ACTIVE_LASER_BEAMS))
    );

    const fallbackAnchors = [{ x: 0.5, y: 0.69 }];
    const anchors = badguysLightAnchors.length ? badguysLightAnchors : fallbackAnchors;
    laserStorm.spawnCarry += dt * (4.8 + anchors.length * 0.42);

    while (laserStorm.spawnCarry >= 1 && laserStorm.beams.length < maxLaserBeams) {
      laserStorm.spawnCarry -= 1;
      const anchorIndex = (random() * anchors.length) | 0;
      const src = getLaserBeamSource({ anchorIndex }, anchors);
      const baseAngle =
        random() < 0.66
          ? Math.PI / 2 + (random() - 0.5) * 1.9
          : random() * Math.PI * 2;
      const jitterFreq = 0.003 + random() * 0.009;
      const jitterAmp = 0.35 + random() * 0.55;
      const sweepVel = (random() - 0.5) * (2.8 + random() * 2.6);
      const length = Math.hypot(wCSS, hCSS) * (1.55 + random() * 0.35);
      const life = 1.85 + random() * 1.05;

      laserStorm.beams.push({
        anchorIndex,
        sourceX: src.x,
        sourceY: src.y,
        angle: baseAngle,
        angVel: sweepVel,
        targetVel: sweepVel,
        nextJoltAt: now + 120 + random() * 360,
        jitterFreq,
        jitterAmp,
        jitterPhase: random() * Math.PI * 2,
        length,
        life,
        lifeMax: life,
        hue: (now * 0.07 + random() * 360) % 360,
        width: 2.5 + random() * 2.6,
        power: 7.8 + random() * 6.4,
        hitCount: 0,
        nextHitAt: 0,
        inert: false,
        bouncesRemaining: 0,
        inertElapsed: 0,
        inertDuration: 1,
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
      const src = getLaserBeamSource(b, anchors);
      b.sourceX = src.x;
      b.sourceY = src.y;
      b.life -= dt;

      if (!b.inert) {
        if (now >= b.nextJoltAt) {
          b.targetVel = (random() - 0.5) * (2.8 + random() * 3.2);
          b.nextJoltAt = now + 110 + random() * 380;
        }
        const velEase = Math.min(1, dt * 7.2);
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

  function getCachedLaserSourceGradient(index, x, y, radius, srcGlow, hue) {
    const qX = quantize(x, LASER_GRADIENT_POS_STEP_PX);
    const qY = quantize(y, LASER_GRADIENT_POS_STEP_PX);
    const qRadius = Math.max(2, quantize(radius, 2));
    const qGlow = clamp(quantize(srcGlow, LASER_GRADIENT_ALPHA_STEP), 0, 1);
    const qHue = ((quantize(hue, LASER_GRADIENT_HUE_STEP) % 360) + 360) % 360;
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

  function getCachedLaserBeamGradient(index, srcX, srcY, endX, endY, hue, alpha, inertFactor) {
    const qSrcX = quantize(srcX, LASER_GRADIENT_POS_STEP_PX);
    const qSrcY = quantize(srcY, LASER_GRADIENT_POS_STEP_PX);
    const qEndX = quantize(endX, LASER_GRADIENT_POS_STEP_PX);
    const qEndY = quantize(endY, LASER_GRADIENT_POS_STEP_PX);
    const qHue = ((quantize(hue, LASER_GRADIENT_HUE_STEP) % 360) + 360) % 360;
    const qAlpha = clamp(quantize(alpha, LASER_GRADIENT_ALPHA_STEP), 0, 1);
    const qInert = clamp(quantize(inertFactor, LASER_GRADIENT_ALPHA_STEP), 0, 1);
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

  function drawLaserStorm(now) {
    if (!laserStorm.enabled || !badguysRender.ready) return;
    if (!laserStorm.beams.length && laserStorm.sourceBurst <= 0.01) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const blurCaps = getAdaptiveShadowBlurCaps();

    const pulse = 0.45 + 0.55 * Math.sin(now * 0.018);
    const srcGlow = laserStorm.sourceBurst > 0 ? laserStorm.sourceBurst : 0.16 + pulse * 0.22;
    for (let i = 0; i < badguysLightAnchors.length; i++) {
      const p = getBadguysScreenPoint(badguysLightAnchors[i]);
      const glowR = 5 + srcGlow * 16;
      const hue = (now * 0.2 + i * 41) % 360;
      ctx.fillStyle = getCachedLaserSourceGradient(i, p.x, p.y, glowR, srcGlow, hue);
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

  function applyLaserBrushToNumber(n, now) {
    if (!(laserStorm.enabled && laserStorm.segments.length)) return false;
    if (n.isTrap || !(n.txt === '6' || n.txt === '7')) return false;
    const hits = n.laserBrushHits || 0;
    if (hits >= 3) return false;
    if (now - (n.lastLaserBrushAt || -9999) < 95) return false;

    let bestSeg = null;
    let bestDistSq = Infinity;
    const radius = 26 + (3 - hits) * 4;
    const radiusSq = radius * radius;

    for (let i = 0; i < laserStorm.segments.length; i++) {
      const seg = laserStorm.segments[i];
      const beam = seg.beam;
      if (!beam || beam.inert || (beam.hitCount || 0) >= 3) continue;
      if (now < (beam.nextHitAt || 0)) continue;
      const dSq = distPointToSegmentSq(n.x, n.y, seg.x1, seg.y1, seg.x2, seg.y2);
      if (dSq <= radiusSq && dSq < bestDistSq) {
        bestDistSq = dSq;
        bestSeg = seg;
      }
    }
    if (!bestSeg) return false;

    const beam = bestSeg.beam;
    const base = Math.atan2(n.y - bestSeg.sourceY, n.x - bestSeg.sourceX);
    const knockAng = base + (random() - 0.5) * 1.05;
    const knock = bestSeg.power * 1.35 + (3 - hits) * 3.2 + random() * 7.2;
    n.dx += Math.cos(knockAng) * knock;
    n.dy += Math.sin(knockAng) * knock - (4.6 + random() * 7.2);
    n.dx = clamp(n.dx, -16.5, 16.5);
    n.dy = clamp(n.dy, -20, 18);
    n.laserBrushHits = hits + 1;
    n.lastLaserBrushAt = now;
    n.laserSmokeTime = Math.max(n.laserSmokeTime || 0, 2.2 + n.laserBrushHits * 0.8);
    n.laserSmokeCarry = n.laserSmokeCarry || 0;
    n.lasered = true;
    beam.hitCount = (beam.hitCount || 0) + 1;
    beam.nextHitAt = now + 36;
    if (beam.hitCount >= 3) {
      startLaserPostHitBounce(beam, beam.sourceX, beam.sourceY);
    }
    S.cameraShake = Math.max(S.cameraShake, 3.5);
    createParticles(n.x, n.y, n.col, 3);
    return true;
  }

  function bounceLaseredNumberOffShip(n) {
    if (!badguysRender.ready || !n.lasered) return;
    const r = 24;
    const left = badguysRender.x - r;
    const right = badguysRender.x + badguysRender.w + r;
    const top = badguysRender.y - r;
    const bottom = badguysRender.y + badguysRender.h + r;
    if (n.x < left || n.x > right || n.y < top || n.y > bottom) return;

    const dL = Math.abs(n.x - left);
    const dR = Math.abs(right - n.x);
    const dT = Math.abs(n.y - top);
    const dB = Math.abs(bottom - n.y);
    const minD = Math.min(dL, dR, dT, dB);

    if (minD === dL) {
      n.x = left;
      n.dx = -Math.abs(n.dx) * 0.9;
      n.dy += (random() - 0.5) * 1.4;
    } else if (minD === dR) {
      n.x = right;
      n.dx = Math.abs(n.dx) * 0.9;
      n.dy += (random() - 0.5) * 1.4;
    } else if (minD === dT) {
      n.y = top;
      n.dy = -Math.abs(n.dy) * 0.86;
      n.dx += (random() - 0.5) * 1.8;
    } else {
      n.y = bottom;
      n.dy = Math.abs(n.dy) * 0.76;
      n.dx += (random() - 0.5) * 1.6;
    }
  }

  function spawnLaserSmoke(x, y, strength = 1) {
    const lowGraphics = isLowGraphicsModeEnabled();
    if (lowGraphics && random() > 0.45) return;

    const smokeCap = Math.max(
      24,
      Math.floor(
        getAdaptiveCapValue(
          'maxLaserSmoke',
          lowGraphics ? Math.floor(MAX_LASER_SMOKE * 0.35) : MAX_LASER_SMOKE
        )
      )
    );
    if (laserStorm.smokePuffs.length >= smokeCap) {
      laserStorm.smokePuffs.splice(0, laserStorm.smokePuffs.length - smokeCap + 1);
    }

    const smokeRateScale = getAdaptiveCapValue('laserSmokeSpawnScale', 1);
    const smokeStrength = (lowGraphics ? strength * 0.68 : strength) * smokeRateScale;
    laserStorm.smokePuffs.push({
      x: x + (random() - 0.5) * 8,
      y: y - 6 + (random() - 0.5) * 6,
      vx: (random() - 0.5) * 22 * smokeStrength,
      vy: -(16 + random() * 30 * smokeStrength),
      r: 2.2 + random() * 3.2 * smokeStrength,
      life: 0.55 + random() * 0.5,
      lifeMax: 0.55 + random() * 0.5,
      grow: 10 + random() * 14,
    });
  }

  function updateLaserSmoke(dt) {
    for (let i = laserStorm.smokePuffs.length - 1; i >= 0; i--) {
      const s = laserStorm.smokePuffs[i];
      s.vx *= 0.96;
      s.vy -= 12 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.grow * dt;
      s.life -= dt;
      if (s.life <= 0) removeBySwapPop(laserStorm.smokePuffs, i);
    }
  }

  function drawLaserSmoke() {
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

  function drawBadguysLightAnchors(now) {
    if (!badguysRender.ready || !badguysLightAnchors.length) return;
    ctx.save();
    for (let i = 0; i < badguysLightAnchors.length; i++) {
      const p = getBadguysScreenPoint(badguysLightAnchors[i]);

      if (S.isDangerDanger) {
        // Fast sequential red chase with compact footprint.
        const lightCount = badguysLightAnchors.length;
        const leadIndex = Math.floor(now / 60) % lightCount;
        const diff = Math.abs(i - leadIndex);
        const ringDistance = Math.min(diff, lightCount - diff);
        const seqStrength =
          ringDistance === 0 ? 1 : ringDistance === 1 ? 0.58 : ringDistance === 2 ? 0.24 : 0.06;
        const microPulse = 0.9 + 0.1 * Math.sin(now * 0.01 + i * 0.5);
        const r = badguysLightVisual.size * (0.32 + seqStrength * 0.9) * microPulse;
        const outerR = r * (1.6 + seqStrength * 1.55);
        const ring = ((now * 0.006 + i * 0.08) % 1) * outerR;
        const hot = seqStrength > 0.9;
        ctx.strokeStyle = hot ? 'rgba(255,40,40,0.72)' : 'rgba(120,20,20,0.35)';
        ctx.lineWidth = hot ? 1.8 : 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
        ctx.stroke();

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
        g.addColorStop(0, `rgba(255,220,220,${0.3 + seqStrength * 0.68})`);
        g.addColorStop(0.2, `rgba(255,70,70,${0.25 + seqStrength * 0.62})`);
        g.addColorStop(1, 'rgba(140,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = `rgba(255,20,20,${0.5 + seqStrength * 0.45})`;
        ctx.shadowBlur = Math.max(8, r * (1.1 + seqStrength * 1.35));
        ctx.fillStyle = `rgba(255,95,95,${0.3 + seqStrength * 0.68})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,235,235,${0.2 + seqStrength * 0.74})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.5, r * 0.28), 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Regular mode: keep original colorful independent pulsing behavior.
        const pulse = 0.72 + 0.28 * Math.sin(now * 0.006 + i * 1.37);
        const hueJitter = 40 * Math.sin(now * 0.0012 + i * 2.03);
        const hue = (now * 0.04 + i * 47 + hueJitter + 360) % 360;
        const r = badguysLightVisual.size * pulse;
        const outerR = r * 3.1;

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
        g.addColorStop(0, `hsla(${hue}, 100%, 88%, 0.95)`);
        g.addColorStop(0.35, `hsla(${(hue + 18) % 360}, 100%, 65%, 0.65)`);
        g.addColorStop(1, `hsla(${(hue + 30) % 360}, 100%, 50%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.95)`;
        ctx.shadowBlur = Math.max(10, r * 2.2);
        ctx.fillStyle = `hsla(${(hue + 8) % 360}, 100%, 78%, 0.95)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.6, r * 0.34), 0, Math.PI * 2);
        ctx.fill();
      }

      // Setup placeholders hidden temporarily; keep only the glow visuals.
    }
    ctx.restore();
  }

  function getDangerBeamOscillation(now) {
    const quantizedNow = quantize(now, DANGER_BEAM_OSC_STEP_MS);
    const widthMod =
      1 +
      Math.sin(quantizedNow * dangerBeam.speedA + dangerBeam.phaseA) * dangerBeam.widthAmp * 0.65 +
      Math.sin(quantizedNow * dangerBeam.speedB + dangerBeam.phaseB) * dangerBeam.widthAmp * 0.35;
    const lenOsc =
      0.5 +
      0.5 *
        (Math.sin(quantizedNow * (dangerBeam.speedA * 0.72) + dangerBeam.phaseB) * 0.7 +
          Math.sin(quantizedNow * (dangerBeam.speedB * 0.53) + dangerBeam.phaseA) * 0.3);
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
        1.14 + 0.34 * (widthMod - 1) + 0.16 * Math.sin(quantizedNow * 0.0025 + 1.3),
    };
  }

  function drawDangerBeam(now) {
    if (!badguysRender.ready || !dangerBeam.enabled) return;

    const originX = badguysRender.x + badguysRender.w * 0.5 + dangerBeam.offsetX;
    const originY = badguysRender.y + badguysRender.h * 0.61 + dangerBeam.offsetY;
    const oscillation = getDangerBeamOscillation(now);
    const { lengthFactor, tSec } = oscillation;
    const beamBottom = originY + (hCSS - originY) * lengthFactor;
    const beamHeight = beamBottom - originY;
    if (beamHeight <= 0) return;

    const isDangerBeam = S.isDangerDanger;
    const baseColor = isDangerBeam ? { r: 255, g: 45, b: 45 } : { r: 90, g: 225, b: 255 };
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.006);
    // Keep top fixed to the ship; only bottom width/length breathe.
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
      const portalY = originY + Math.max(7, topWidth * 0.1);
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

  function getDangerBeamGeometry(now) {
    if (!badguysRender.ready || !dangerBeam.enabled) return null;
    const originX = badguysRender.x + badguysRender.w * 0.5 + dangerBeam.offsetX;
    const originY = badguysRender.y + badguysRender.h * 0.61 + dangerBeam.offsetY;
    const oscillation = getDangerBeamOscillation(now);
    const lengthFactor = oscillation.lengthFactor;
    const beamBottom = originY + (hCSS - originY) * lengthFactor;
    const beamHeight = beamBottom - originY;
    if (beamHeight <= 0) return null;
    const topWidth = badguysRender.w * dangerBeam.widthRatio;
    const bottomWidth = topWidth * oscillation.bottomWidthScale;
    return { originX, originY, beamBottom, beamHeight, topWidth, bottomWidth };
  }

  function isGoodBeamNumber(n) {
    return !n.isTrap && (n.txt === '6' || n.txt === '7');
  }

  function getRegularBeamPortalState(now) {
    // Beam harvest is only active in Phase 2+ (portal needs to be earned)
    if (S.bossPhase < 2) return null;
    if (!dangerBeam.enabled || S.isDangerDanger || !badguysRender.ready) return null;
    const geo = getDangerBeamGeometry(now);
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

  function isNumberInsideRegularBeam(n, portalState) {
    const geo = portalState.geo;
    if (n.y < geo.originY - 10 || n.y > geo.beamBottom + 12) return false;
    const yFrac = clamp((n.y - geo.originY) / Math.max(1, geo.beamHeight), 0, 1);
    const widthAtY = geo.topWidth + (geo.bottomWidth - geo.topWidth) * yFrac;
    const beamInner = widthAtY * (0.42 + portalState.chargeRatio * 0.1);
    return Math.abs(n.x - geo.originX) <= beamInner;
  }

  function triggerRegularBeamEruption(now, portalState) {
    if (!badguysRender.ready) return;
    const eruptionCount = Math.max(
      regularBeamHarvest.target,
      regularBeamHarvest.charge,
      regularBeamHarvest.capturedDigits.length
    );
    const digits = regularBeamHarvest.capturedDigits.splice(0, eruptionCount);
    while (digits.length < eruptionCount) {
      digits.push(random() < 0.5 ? '6' : '7');
    }

    const mouthX = badguysRender.x + badguysRender.w * 0.5;
    const mouthY = badguysRender.y + Math.max(8, badguysRender.h * 0.08);

    for (let i = 0; i < eruptionCount; i++) {
      const txt = digits[i];
      const col = txt === '6' ? '#ff7eb3' : '#7afcff';
      const angle = -Math.PI / 2 + (random() - 0.5) * 1.28;
      const speed = 300 + random() * 440;
      regularBeamHarvest.eruptionNumbers.push({
        txt,
        col,
        x: mouthX + (random() - 0.5) * badguysRender.w * 0.12,
        y: mouthY - random() * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (80 + random() * 90),
        size: 46 + random() * 24,
        rot: random() * Math.PI * 2,
        rotVel: (random() - 0.5) * 6.2,
        alpha: 1,
        bounces: 0,
        life: 8.2,
      });
    }

    regularBeamHarvest.charge = 0;
    regularBeamHarvest.capturedDigits.length = 0;
    regularBeamHarvest.flash = 1;
    regularBeamHarvest.eruptionFlash = 1;
    S.cameraShake = Math.max(S.cameraShake, 18);
    createParticles(
      portalState?.x ?? mouthX,
      (portalState?.y ?? mouthY) + 8,
      'rgba(166, 242, 255, 0.95)',
      22
    );

    // Beam harvest eruption damages the ship (portal overload)
    if (S.shipHP > 0 && !S.isVictory) {
      applyShipDamage(5, mouthX, mouthY, 'beam-eruption');
      hudUpdater.updateShipHpBar(S);
    }
  }

  function registerRegularBeamCapture(n, now, portalState) {
    regularBeamHarvest.capturedDigits.push(n.txt);
    if (regularBeamHarvest.capturedDigits.length > regularBeamHarvest.target * 2) {
      regularBeamHarvest.capturedDigits.shift();
    }
    regularBeamHarvest.charge += 1;
    regularBeamHarvest.flash = 1;
    createParticles(n.x, n.y, n.col, 4);
    if (regularBeamHarvest.charge >= regularBeamHarvest.target) {
      triggerRegularBeamEruption(now, portalState);
    }
  }

  function updateRegularBeamHarvest(dt) {
    regularBeamHarvest.flash = Math.max(0, regularBeamHarvest.flash - dt * 2.6);
    regularBeamHarvest.eruptionFlash = Math.max(0, regularBeamHarvest.eruptionFlash - dt * 1.1);

    const layout = getGuardianLayout();
    const floorY = layout.floorY;
    for (let i = regularBeamHarvest.eruptionNumbers.length - 1; i >= 0; i--) {
      const n = regularBeamHarvest.eruptionNumbers[i];
      let bounced = false;

      n.vy += 620 * dt;
      n.vx *= 0.997;
      n.rot += n.rotVel * dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life -= dt;

      const sidePad = Math.max(22, layout.wallPad - 2);
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
        if (Math.abs(n.vy) < 90) n.vy = -(90 + random() * 60);
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

  function drawRegularBeamEruptionNumbers() {
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

  function updateDangerBeamEmbers(now, dt, targets) {
    if (!(dangerBeam.enabled && S.isDangerDanger)) {
      dangerEmbers.length = 0;
      S.dangerEmberSpawnCarry = 0;
      dangerSizzles.length = 0;
      return;
    }
    const geo = getDangerBeamGeometry(now);
    if (!geo) return;
    const spawnCeiling = geo.originY + Math.max(6, geo.topWidth * 0.08);
    const emberSpawnRate = getAdaptiveCapValue('dangerEmberSpawnRate', 280);
    const emberCap = Math.max(40, Math.floor(getAdaptiveCapValue('maxDangerEmbers', 300)));
    const sizzleCap = Math.max(20, Math.floor(getAdaptiveCapValue('maxDangerSizzles', 150)));

    S.dangerEmberSpawnCarry += dt * emberSpawnRate;
    while (S.dangerEmberSpawnCarry >= 1 && dangerEmbers.length < emberCap) {
      S.dangerEmberSpawnCarry -= 1;
      // Emit mostly from the top of the beam.
      const yFrac = 0.03 + random() * 0.16;
      const y = geo.originY + geo.beamHeight * yFrac;
      const widthAtY = geo.topWidth + (geo.bottomWidth - geo.topWidth) * yFrac;
      const x = geo.originX + (random() - 0.5) * widthAtY * (0.34 + random() * 0.18);
      const life = 1.15 + random() * 1.25;
      dangerEmbers.push({
        x,
        y,
        vx: (random() - 0.5) * (42 + random() * 52),
        vy: 140 + random() * 170,
        r: 0.75 + random() * 1.55,
        life,
        lifeMax: life,
        hue: 28 + random() * 26,
        driftAmp: 20 + random() * 34,
        driftSpeed: 0.004 + random() * 0.01,
        driftPhase: random() * Math.PI * 2,
        ceilingY: spawnCeiling,
        bounce: 0,
      });
    }
    if (dangerEmbers.length >= emberCap) {
      S.dangerEmberSpawnCarry = Math.min(S.dangerEmberSpawnCarry, 0.9);
    }

    for (let i = dangerEmbers.length - 1; i >= 0; i--) {
      const e = dangerEmbers[i];
      const prevX = e.x;
      const prevY = e.y;
      e.vy += 480 * dt;
      e.vx += Math.sin(now * e.driftSpeed + e.driftPhase) * e.driftAmp * dt;
      e.vx *= 0.992;
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
        e.vx *= 0.88;
        e.vy *= 0.68;
        e.vx += (random() - 0.5) * 58;
        e.vy -= 85 + random() * 120;
        if (e.vy < -190) e.vy = -190;
        e.x = prevX;
        e.y = prevY;
        e.hue = clamp(e.hue + (random() - 0.5) * 10, 18, 65);
        e.bounce++;
        const sizzleCount = 2 + Math.floor(random() * 3);
        for (let s = 0; s < sizzleCount; s++) {
          const ang = random() * Math.PI * 2;
          const speed = 34 + random() * 54;
          dangerSizzles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed - 16,
            r: 0.55 + random() * 1.1,
            life: 0.12 + random() * 0.16,
            hue: 26 + random() * 24,
          });
        }
        if (dangerSizzles.length > sizzleCap) {
          dangerSizzles.splice(0, dangerSizzles.length - sizzleCap);
        }
      }

      // Let embers arc to the ground and fizzle quickly near the bottom.
      if (e.y > hCSS * 0.88) {
        e.life -= dt * 1.8;
      }

      if (e.life <= 0 || e.y > hCSS + 42 || e.x < -42 || e.x > wCSS + 42 || e.bounce > 8) {
        removeBySwapPop(dangerEmbers, i);
      }
    }

    for (let i = dangerSizzles.length - 1; i >= 0; i--) {
      const s = dangerSizzles[i];
      s.vy += 260 * dt;
      s.vx *= 0.94;
      s.vy *= 0.92;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) removeBySwapPop(dangerSizzles, i);
    }
  }

  function drawDangerBeamEmbers() {
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

  // Delegated to utils/math.js
  const edgeBiasedUnit = _edgeBiasedUnit;

  function getBadguysBounds(drawW, drawH) {
    const sidePad = Math.max(4, wCSS * 0.006);
    const minX = sidePad;
    const maxX = Math.max(minX, wCSS - drawW - sidePad);
    const minY = Math.max(6, badguysOverlay.y);
    const maxY = Math.max(minY, hCSS * 0.72 - drawH);
    return { minX, maxX, minY, maxY };
  }

  function pickBadguysTarget(bounds) {
    const xT = random() < 0.7 ? edgeBiasedUnit(1.65, random) : random();
    const yT = random() < 0.55 ? edgeBiasedUnit(1.9, random) : random();
    badguysFlight.targetX = bounds.minX + xT * (bounds.maxX - bounds.minX || 1);
    badguysFlight.targetY = bounds.minY + yT * (bounds.maxY - bounds.minY || 1);
  }

  function updateBadguysFlight(now, dt, drawW, drawH) {
    const bounds = getBadguysBounds(drawW, drawH);

    if (!badguysFlight.initialized) {
      badguysFlight.x = clamp((wCSS - drawW) / 2, bounds.minX, bounds.maxX);
      badguysFlight.y = clamp(bounds.minY + 8, bounds.minY, bounds.maxY);
      badguysFlight.vx = 0;
      badguysFlight.vy = 0;
      badguysFlight.currentSpeed = 180;
      badguysFlight.targetSpeed = 280;
      badguysFlight.swoopFreq = 0.0035 + random() * 0.0035;
      badguysFlight.swoopPhase = random() * Math.PI * 2;
      badguysFlight.swoopForce = 260 + random() * 220;
      pickBadguysTarget(bounds);
      badguysFlight.nextRetargetAt = now + 150 + random() * 420;
      badguysFlight.nextSpeedShiftAt = now + 180 + random() * 560;
      badguysFlight.initialized = true;
    }

    if (now >= badguysFlight.nextRetargetAt) {
      pickBadguysTarget(bounds);
      badguysFlight.nextRetargetAt = now + 150 + random() * 420;
    }

    if (now >= badguysFlight.nextSpeedShiftAt) {
      const speedMult = getPhaseSpeedMultiplier(S.bossPhase);
      badguysFlight.targetSpeed = (180 + random() * 280) * speedMult;
      badguysFlight.swoopFreq = (0.003 + random() * 0.0045) * (1 + (speedMult - 1) * 0.5);
      badguysFlight.swoopForce = (240 + random() * 280) * speedMult;
      badguysFlight.nextSpeedShiftAt = now + (180 + random() * 620) / speedMult;
    }

    const dx = badguysFlight.targetX - badguysFlight.x;
    const dy = badguysFlight.targetY - badguysFlight.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 24) {
      pickBadguysTarget(bounds);
    }

    const speedRamp = Math.min(1, dt * 3.2);
    badguysFlight.currentSpeed += (badguysFlight.targetSpeed - badguysFlight.currentSpeed) * speedRamp;
    const desiredSpeed = Math.min(540, Math.max(130, Math.min(dist * 2.2, badguysFlight.currentSpeed)));
    const dirX = dist > 0.001 ? dx / dist : 0;
    const dirY = dist > 0.001 ? dy / dist : 0;
    const desiredVx = dirX * desiredSpeed;
    const desiredVy = dirY * desiredSpeed;
    const smoothFactor = Math.min(1, 3.9 * dt);

    badguysFlight.vx += (desiredVx - badguysFlight.vx) * smoothFactor;
    badguysFlight.vy += (desiredVy - badguysFlight.vy) * smoothFactor;
    const swoopAccel = Math.sin(now * badguysFlight.swoopFreq + badguysFlight.swoopPhase) * badguysFlight.swoopForce;
    badguysFlight.vy += swoopAccel * dt;
    badguysFlight.vx += Math.cos(now * badguysFlight.swoopFreq * 0.7 + badguysFlight.swoopPhase) * 70 * dt;

    badguysFlight.x += badguysFlight.vx * dt;
    badguysFlight.y += badguysFlight.vy * dt;

    if (badguysFlight.x <= bounds.minX || badguysFlight.x >= bounds.maxX) {
      const hitLeft = badguysFlight.x <= bounds.minX;
      badguysFlight.x = clamp(badguysFlight.x, bounds.minX, bounds.maxX);
      const bounceBoost = 1.08 + random() * 0.08;
      const boostedVx = Math.min(560, Math.max(160, Math.abs(badguysFlight.vx)) * bounceBoost + 18);
      badguysFlight.vx = hitLeft ? boostedVx : -boostedVx;
      badguysFlight.vy += (random() - 0.5) * 95;
      pickBadguysTarget(bounds);
    }

    if (badguysFlight.y <= bounds.minY || badguysFlight.y >= bounds.maxY) {
      badguysFlight.y = clamp(badguysFlight.y, bounds.minY, bounds.maxY);
      badguysFlight.vy *= -0.82;
      badguysFlight.vx += (random() - 0.5) * 65;
      pickBadguysTarget(bounds);
    }
  }

  function updateBadguysState(now, dt) {
    const activeBadguysImg = getActiveBadguysSpriteImage();
    if (!(S.badguysVisible && activeBadguysImg.complete && activeBadguysImg.naturalWidth > 0)) {
      badguysRender.ready = false;
      return;
    }

    const badguysFrameW = badguysSpriteSheet.frameW;
    const badguysFrameH = badguysSpriteSheet.frameH;
    const badguysScale = badguysOverlay.scale * badguysSpriteSheet.scaleMultiplier;
    const badguysW = badguysFrameW * badguysScale;
    const badguysH = badguysFrameH * badguysScale;
    if (badguysMotionPausedForLightSetup) {
      const bounds = getBadguysBounds(badguysW, badguysH);
      badguysFlight.x = clamp((wCSS - badguysW) / 2, bounds.minX, bounds.maxX);
      badguysFlight.y = clamp(bounds.minY + 10, bounds.minY, bounds.maxY);
      badguysFlight.vx = 0;
      badguysFlight.vy = 0;
    } else {
      updateBadguysFlight(now, dt, badguysW, badguysH);
    }
    badguysRender.x = badguysFlight.x + S.shipRecoilX;
    badguysRender.y = badguysFlight.y + S.shipRecoilY;
    badguysRender.w = badguysW;
    badguysRender.h = badguysH;
    badguysRender.ready = true;
  }

  function drawTitlePreview(now, dt) {
    updateBadguysState(now, dt);
    const cx = wCSS * 0.5 + Math.sin(now * 0.0005) * wCSS * 0.12;

    ctx.clearRect(0, 0, wCSS, hCSS);
    ctx.save();
    drawWorld(now, cx);

    if (badguysRender.ready) {
      const activeBadguysImg = getActiveBadguysSpriteImage();
      const frameIndex = Math.floor((now * badguysSpriteSheet.fps) / 1000) % badguysSpriteSheet.frames;
      const frameCol = frameIndex % badguysSpriteSheet.cols;
      const frameRow = Math.floor(frameIndex / badguysSpriteSheet.cols);
      const srcX = frameCol * badguysSpriteSheet.frameW;
      const srcY = frameRow * badguysSpriteSheet.frameH;
      ctx.drawImage(
        activeBadguysImg,
        srcX,
        srcY,
        badguysSpriteSheet.frameW,
        badguysSpriteSheet.frameH,
        badguysRender.x,
        badguysRender.y,
        badguysRender.w,
        badguysRender.h
      );
      drawBadguysLightAnchors(now);
    }

    // Slight lower vignette to keep text readable over the preview.
    const vignette = ctx.createLinearGradient(0, hCSS * 0.45, 0, hCSS);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, wCSS, hCSS);
    ctx.restore();
  }

  let lastFrameAt = performance.now();

  // Main Loop
  function loop(now) {
    const rawDt = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    const slowMoActive = S.slowMoTimer > 0;
    if (slowMoActive) {
      S.slowMoTimer = Math.max(0, S.slowMoTimer - rawDt);
    }
    const slowMoMultiplier =
      slowMoActive && !isReducedMotionEnabled() ? POLISH.LIFE_LOSS_SLOW_MO_SCALE : 1;
    const dt = rawDt * slowMoMultiplier;
    S.lifeLossFlash = Math.max(0, S.lifeLossFlash - rawDt * POLISH.LIFE_LOSS_FLASH_DECAY);
    updateShipRecoil(dt);

    if (S.isTitleScreen) {
      drawTitlePreview(now, dt);
      requestAnimationFrame(loop);
      return;
    }

    // Victory state: keep rendering particles/shake but stop gameplay simulation
    if (S.isVictory) {
      if (S.shipDamageFlash > 0) S.shipDamageFlash = Math.max(0, S.shipDamageFlash - dt * 3);
      if (S.cameraShake > 0) {
        S.cameraShake *= 0.92;
        if (S.cameraShake < 0.1) S.cameraShake = 0;
      }
      updateParticles();
      updateScorePopups(dt);

      const shakeAmplitude = S.cameraShake * getMotionScale();
      const shakeX = (random() - 0.5) * shakeAmplitude;
      const shakeY = (random() - 0.5) * shakeAmplitude;
      ctx.clearRect(0, 0, wCSS, hCSS);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Draw the defeated ship (frozen frame)
      if (badguysRender.ready) {
        const activeBadguysImg = getActiveBadguysSpriteImage();
        const frameIndex =
          Math.floor((now * badguysSpriteSheet.fps) / 1000) % badguysSpriteSheet.frames;
        const frameCol = frameIndex % badguysSpriteSheet.cols;
        const frameRow = Math.floor(frameIndex / badguysSpriteSheet.cols);
        const srcX = frameCol * badguysSpriteSheet.frameW;
        const srcY = frameRow * badguysSpriteSheet.frameH;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(
          activeBadguysImg, srcX, srcY,
          badguysSpriteSheet.frameW, badguysSpriteSheet.frameH,
          badguysRender.x, badguysRender.y, badguysRender.w, badguysRender.h
        );
        ctx.globalAlpha = 1;
      }

      drawParticles();
      drawScorePopups();
      ctx.restore();
      requestAnimationFrame(loop);
      return;
    }

    if (!S.isGameOver && !S.isPaused) {
      telemetry.onFrame(rawDt * 1000);
      updateAdaptiveQuality(rawDt * 1000, now);
      updateEnemyStateMachine(rawDt * 1000, now);
      if (actionBar) actionBar.updateCooldowns(dt);
      updateBadguysState(now, dt);

      // Boss phase transitions
      const phaseResult = updateBossPhase(S);
      if (phaseResult.phaseChanged) {
        telemetry.onPhaseTransition(phaseResult.oldPhase, phaseResult.newPhase, now);
      }
      if (phaseResult.phaseChanged && !phaseResult.defeated) {
        applyPhaseEffects(phaseResult.newPhase);
        S.cameraShake = Math.max(S.cameraShake, 12);
      }
      if (phaseResult.defeated) {
        triggerVictory(now);
      }

      // Decay ship damage flash
      if (S.shipDamageFlash > 0) {
        S.shipDamageFlash = Math.max(0, S.shipDamageFlash - dt * 3);
      }

      // Progressive difficulty — modulated by boss phase
      const phase = S.bossPhase;
      const spawnMult = getPhaseSpawnMultiplier(phase);
      const trapBoost = getPhaseTrapChanceBoost(phase);
      const gameTime = (now - S.gameStartTime) / 1000;
      S.spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        (INITIAL_SPAWN_INTERVAL - gameTime * 30) * spawnMult
      );
      S.trapChance = Math.min(
        TRAP_SPAWN_CHANCE_MAX + trapBoost,
        TRAP_SPAWN_CHANCE_START + gameTime * 0.01 + trapBoost
      );

      // Smart spawning
      if (now - S.lastTrapTime > S.spawnInterval) {
        if (random() < S.trapChance) {
          spawnTrap();
          S.lastTrapTime = now;
        }
      }

      if (now - S.lastGoodTime > S.spawnInterval * 1.5) {
        spawnGood();
        S.lastGoodTime = now;
      }

      updateParticles();
      updateScorePopups(dt);
      updateRegularBeamHarvest(dt);
      updateLaserStorm(now, dt);
      updateLaserSmoke(dt);
      updateShield(S, now);
      updateSlamShockwave(dt);
      updateUltimate(now, dt);
      if (S.magnet.active) {
        const hasPower = drainPower(S, POWER.MAGNET_DRAIN, dt);
        hudUpdater.updatePowerBar(S);
        if (!hasPower) S.magnet.active = false;
      }
      const projectileHits = updateProjectiles(S, dt, badguysRender);
      if (projectileHits.length && S.shipHP > 0 && !S.isVictory) {
        for (let i = 0; i < projectileHits.length; i++) {
          const hit = projectileHits[i];
          applyShipDamage(PROJECTILE.DAMAGE, hit.x, hit.y, 'projectile');
          createParticles(hit.x, hit.y, '#ffd76a', 10);
          S.cameraShake = Math.max(S.cameraShake, 5);
          if (S.shipHP <= 0) break;
        }
        hudUpdater.updateShipHpBar(S);
      }

      // Camera shake
      if (S.cameraShake > 0) {
        S.cameraShake *= 0.9;
        if (S.cameraShake < 0.1) S.cameraShake = 0;
      }

      const shakeAmplitude = S.cameraShake * getMotionScale();
      const shakeX = (random() - 0.5) * shakeAmplitude;
      const shakeY = (random() - 0.5) * shakeAmplitude;

      ctx.clearRect(0, 0, wCSS, hCSS);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const layout = getGuardianLayout();
      const cx = Math.max(layout.sidePad, Math.min(wCSS - layout.sidePad, touchX));
      const time = now / 170;
      let bodyX = 0;
      let bodyY = 0;
      let bodyW = 0;
      let bodyH = 0;

      drawWorld(now, cx);

      // Invincibility flash — scoped to character only (body + scowl + hands)
      const invAlpha = getInvincibilityAlpha(S, now);
      ctx.save();
      if (invAlpha < 1) ctx.globalAlpha = invAlpha;

      // Draw Body
      if (avatar.complete && avatar.naturalWidth > 0) {
        const scale = 350 / avatar.height;
        bodyW = avatar.width * scale;
        bodyH = 350;
        bodyX = cx - bodyW / 2;
        bodyY = hCSS - bodyH + 60;
        drawImageWithTransparencyKey(avatar, bodyX, bodyY, bodyW, bodyH);
      }

      // Draw Scowl Overlay
      if (S.scowlVisible && bodyW > 0 && scowlImg.complete && scowlImg.naturalWidth > 0) {
        const overlayW = scowlImg.width * scowlOverlay.scale;
        const overlayH = scowlImg.height * scowlOverlay.scale;
        const drawX = bodyX + scowlOverlay.x;
        const drawY = bodyY + scowlOverlay.y;
        ctx.save();
        ctx.translate(drawX + overlayW / 2, drawY + overlayH / 2);
        ctx.rotate(scowlOverlay.rot);
        ctx.drawImage(scowlImg, -overlayW / 2, -overlayH / 2, overlayW, overlayH);
        ctx.restore();
      }

      // Draw Badguys Overlay (top-center of screen)
      if (badguysRender.ready) {
        // Ship should not inherit guardian invincibility alpha.
        ctx.save();
        ctx.globalAlpha = 1;
        const activeBadguysImg = getActiveBadguysSpriteImage();
        const frameIndex =
          Math.floor((now * badguysSpriteSheet.fps) / 1000) % badguysSpriteSheet.frames;
        const frameCol = frameIndex % badguysSpriteSheet.cols;
        const frameRow = Math.floor(frameIndex / badguysSpriteSheet.cols);
        const srcX = frameCol * badguysSpriteSheet.frameW;
        const srcY = frameRow * badguysSpriteSheet.frameH;
        ctx.drawImage(
          activeBadguysImg,
          srcX,
          srcY,
          badguysSpriteSheet.frameW,
          badguysSpriteSheet.frameH,
          badguysRender.x,
          badguysRender.y,
          badguysRender.w,
          badguysRender.h
        );

        const hpRatio = getShipHPRatio(S);
        const lowHpTint = Math.max(0, (1 - hpRatio) * 0.35);
        if (lowHpTint > 0.01) {
          ctx.save();
          ctx.globalAlpha = lowHpTint;
          ctx.fillStyle = '#5c1216';
          ctx.fillRect(badguysRender.x, badguysRender.y, badguysRender.w, badguysRender.h);
          ctx.restore();
        }

        // Ship damage flash overlay — bright flash when hit
        if (S.shipDamageFlash > 0.01) {
          ctx.save();
          ctx.globalAlpha = S.shipDamageFlash * 0.6;
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(badguysRender.x, badguysRender.y, badguysRender.w, badguysRender.h);
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        // Low-HP sparking particles on the ship
        if (S.bossPhase >= 3 && S.shipHP > 0) {
          const sparkChance = S.bossPhase >= 4 ? 0.3 : 0.12;
          if (random() < sparkChance) {
            const sparkX = badguysRender.x + random() * badguysRender.w;
            const sparkY = badguysRender.y + random() * badguysRender.h * 0.8;
            createParticles(sparkX, sparkY, '#ff8844', 2);
          }
        }

        drawDangerBeam(now);
        drawLaserStorm(now);
        drawBadguysLightAnchors(now);
        ctx.restore();
      }

      // Calculate Stretch
      let stretchL = 1.0 + Math.sin(time) * 0.35;
      let stretchR = 1.0 + Math.sin(time + Math.PI) * 0.35;
      if (now <= S.swat.stretchUntil) {
        const t = Math.max(0, Math.min(1, (S.swat.stretchUntil - now) / SWAT.STRETCH_DURATION));
        const swatBoost = SWAT.STRETCH_AMOUNT * t;
        if (S.swat.hand === 'left') stretchL += swatBoost;
        else if (S.swat.hand === 'right') stretchR += swatBoost;
      } else {
        S.swat.hand = null;
      }

      const anchorY = layout.anchorY;
      const wristOffset = layout.wristOffset;
      const handW = layout.handW;
      const handH = layout.handH;

      // Draw Left Hand
      if (leftHandImg.complete && leftHandImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(cx - wristOffset + handTuning.left.x, anchorY + handTuning.left.y);
        ctx.rotate(handTuning.left.rot);
        ctx.scale(1, stretchL);
        drawImageWithTransparencyKey(leftHandImg, -handW, 0, handW, handH);
        ctx.restore();
      }

      // Draw Right Hand
      if (rightHandImg.complete && rightHandImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(cx + wristOffset + handTuning.right.x, anchorY + handTuning.right.y);
        ctx.rotate(handTuning.right.rot);
        ctx.scale(1, stretchR);
        drawImageWithTransparencyKey(rightHandImg, 0, 0, handW, handH);
        ctx.restore();
      }

      // Restore canvas state (ends invincibility flash scope)
      ctx.restore();

      drawShield(ctx, cx, anchorY, S, now);
      drawMagnetPullLines(cx, anchorY, now);

      // Calculate collision zones
      const bottomYL = anchorY + handH * stretchL;
      const bottomYR = anchorY + handH * stretchR;

      const leftHandCenterX = cx - wristOffset - handW / 2;
      const rightHandCenterX = cx + wristOffset + handW / 2;
      const impactTargets = {
        body:
          bodyW > 0
            ? {
                x: bodyX,
                y: bodyY,
                w: bodyW,
                h: bodyH,
                alpha: getSpriteAlphaData(avatar),
              }
            : null,
        hands: [
          {
            tx: cx - wristOffset + handTuning.left.x,
            ty: anchorY + handTuning.left.y,
            rot: handTuning.left.rot,
            stretch: stretchL,
            drawX: -handW,
            drawY: 0,
            drawW: handW,
            drawH: handH,
            alpha: getSpriteAlphaData(leftHandImg),
          },
          {
            tx: cx + wristOffset + handTuning.right.x,
            ty: anchorY + handTuning.right.y,
            rot: handTuning.right.rot,
            stretch: stretchR,
            drawX: 0,
            drawY: 0,
            drawW: handW,
            drawH: handH,
            alpha: getSpriteAlphaData(rightHandImg),
          },
        ],
      };

      updateDangerBeamEmbers(now, dt, impactTargets);
      drawDangerBeamEmbers();
      const regularPortal = getRegularBeamPortalState(now);

      // Update and draw numbers
      for (let i = nums.length - 1; i >= 0; i--) {
        let n = nums[i];
        if (now - (n.bornAt || now) > 26000) {
          nums.splice(i, 1);
          continue;
        }
        if (!regularPortal && n.beamCapturing) n.beamCapturing = false;

        if (regularPortal && isGoodBeamNumber(n)) {
          if (n.beamCapturing || isNumberInsideRegularBeam(n, regularPortal)) {
            if (!n.beamCapturing) {
              n.beamCapturing = true;
              n.beamPhase = random() * Math.PI * 2;
            }

            const sway = Math.sin(now * 0.012 + n.beamPhase) * 1.8;
            const targetX = regularPortal.x + sway;
            const targetY = regularPortal.y;
            n.dx += (targetX - n.x) * (0.048 + regularPortal.chargeRatio * 0.032);
            n.dy += (targetY - n.y) * (0.074 + regularPortal.chargeRatio * 0.042);
            n.dx *= 0.78;
            n.dy *= 0.78;
            n.x += n.dx;
            n.y += n.dy;
            n.cooldown = 0;

            if (Math.hypot(n.x - regularPortal.x, n.y - regularPortal.y) <= regularPortal.snapRadius) {
              registerRegularBeamCapture(n, now, regularPortal);
              nums.splice(i, 1);
              continue;
            }

            const beamAlpha = 0.55 + 0.45 * Math.sin(now * 0.03 + n.beamPhase);
            ctx.shadowColor = '#9cefff';
            ctx.shadowBlur = 18 + regularPortal.chargeRatio * 12;
            ctx.globalAlpha = 0.72 + 0.28 * beamAlpha;
            ctx.font = `bold ${layout.beamFont}px Arial`;
            ctx.fillStyle = n.col;
            ctx.textAlign = 'center';
            ctx.fillText(n.txt, n.x, n.y);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            continue;
          }
          n.beamCapturing = false;
        }
        applyLaserBrushToNumber(n, now);

        if (n.cooldown > 0) n.cooldown -= 16;
        n.dy += GRAVITY;
        if (S.magnet.active && !n.isTrap && !n.beamCapturing) {
          const dxMag = cx - n.x;
          const dyMag = anchorY - n.y;
          const distSqMag = dxMag * dxMag + dyMag * dyMag;
          const maxDistSqMag = MAGNET.RANGE * MAGNET.RANGE;
          if (distSqMag <= maxDistSqMag) {
            const distMag = Math.sqrt(distSqMag) || 1;
            const pullRatio = 1 - distMag / MAGNET.RANGE;
            const pullScale = dt * 60 * (0.6 + pullRatio * 0.8);
            n.dx += dxMag * MAGNET.FORCE * pullScale;
            n.dy += dyMag * MAGNET.FORCE * 0.5 * pullScale;
            const damping = Math.pow(MAGNET.DAMPING, pullScale);
            n.dx *= damping;
            n.dy *= damping;
          }
        }
        if (n.dy > 15) n.dy = 15;
        n.x += n.dx;
        n.y += n.dy;

        if (n.isTrap && isShieldActive(S, now)) {
          const shieldCenterX = cx;
          const shieldCenterY = anchorY + 18;
          const trapRadius = 34;
          const dxShield = n.x - shieldCenterX;
          const dyShield = n.y - shieldCenterY;
          const hitRadius = SHIELD.RADIUS_PX + trapRadius;
          if (dxShield * dxShield + dyShield * dyShield <= hitRadius * hitRadius) {
            S.shield.rippleAt = now;
            createParticles(n.x, n.y, '#8ffff5', 14);
            nums.splice(i, 1);
            continue;
          }
        }

        if (n.x < layout.wallPad) {
          n.x = layout.wallPad;
          const wallKick = Math.max(1.2, Math.abs(n.dx) * (n.lasered ? 0.94 : 0.88));
          n.dx = wallKick;
          if (Math.abs(n.dy) < 1.2) n.dy -= 0.9 + random() * 1.4;
          n.wallHits = (n.wallHits || 0) + 1;
        } else if (n.x > wCSS - layout.wallPad) {
          n.x = wCSS - layout.wallPad;
          const wallKick = Math.max(1.2, Math.abs(n.dx) * (n.lasered ? 0.94 : 0.88));
          n.dx = -wallKick;
          if (Math.abs(n.dy) < 1.2) n.dy -= 0.9 + random() * 1.4;
          n.wallHits = (n.wallHits || 0) + 1;
        }

        const floorY = layout.floorY;
        if (n.y > floorY) {
          if (n.isTrap) {
            nums.splice(i, 1);
            continue;
          } else {
            n.y = floorY;
            n.floorBounces = (n.floorBounces || 0) + 1;
            n.dy *= FLOOR_BOUNCE;
            if (Math.abs(n.dy) < 3) n.dy = -(5 + random() * 1.8);
            if (Math.abs(n.dx) < 0.9) n.dx += (random() - 0.5) * 2.4;
          }
        }

        if (!n.isTrap) {
          if (n.x <= layout.wallPad + 1 && Math.abs(n.dx) < 1.1) n.dx = 1.2 + random() * 1.4;
          else if (n.x >= wCSS - (layout.wallPad + 1) && Math.abs(n.dx) < 1.1) {
            n.dx = -(1.2 + random() * 1.4);
          }
          if (n.y >= floorY - 1 && Math.abs(n.dy) < 1.2) n.dy = -(4.2 + random() * 2.2);
        }

        bounceLaseredNumberOffShip(n);
        if (!n.isTrap && (n.floorBounces || 0) > 26 && !n.beamCapturing) {
          nums.splice(i, 1);
          continue;
        }
        if (!n.isTrap && (n.wallHits || 0) > 18 && n.y > floorY - 50) {
          nums.splice(i, 1);
          continue;
        }

        if ((n.laserSmokeTime || 0) > 0) {
          n.laserSmokeTime = Math.max(0, n.laserSmokeTime - dt);
          const smokeRateScale = getAdaptiveCapValue(
            'laserSmokeSpawnScale',
            isLowGraphicsModeEnabled() ? 0.42 : 1
          );
          n.laserSmokeCarry =
            (n.laserSmokeCarry || 0) +
            dt * (8 + (n.laserBrushHits || 1) * 4) * smokeRateScale;
          while (n.laserSmokeCarry >= 1) {
            n.laserSmokeCarry -= 1;
            spawnLaserSmoke(n.x, n.y, 0.7 + (n.laserBrushHits || 0) * 0.2);
          }
        }

        // Improved collision
        const hitL =
          Math.abs(n.x - leftHandCenterX) < layout.hitZoneX &&
          Math.abs(n.y - bottomYL) < layout.hitZoneY;
        const hitR =
          Math.abs(n.x - rightHandCenterX) < layout.hitZoneX &&
          Math.abs(n.y - bottomYR) < layout.hitZoneY;
        let hitHand = null;
        if (hitL && hitR) {
          hitHand =
            Math.abs(n.x - leftHandCenterX) <= Math.abs(n.x - rightHandCenterX) ? 'left' : 'right';
        } else if (hitL) {
          hitHand = 'left';
        } else if (hitR) {
          hitHand = 'right';
        }

        if ((hitL || hitR) && n.dy > 0 && n.cooldown <= 0) {
          if (n.isTrap) {
            // TEMP_NO_LOSE: dev toggle — just destroy the trap
            if (TEMP_NO_LOSE) {
              createParticles(n.x, n.y, n.col, 10);
              nums.splice(i, 1);
              continue;
            }

            // Skip if invincible (post-hit grace period)
            if (isInvincible(S, now)) {
              createParticles(n.x, n.y, n.col, 8);
              nums.splice(i, 1);
              continue;
            }

            // Lose a life
            S.cameraShake = 20;
            createParticles(n.x, n.y, n.col, 15);
            S.combo = 0;
            comboEl.classList.remove('active');
            nums.splice(i, 1);

            const stillAlive = loseLife(S, now);
            telemetry.onLifeLost(S.lives);
            hudUpdater.updateLivesDisplay(S);
            livesEl.classList.remove('hit');
            void livesEl.offsetWidth; // force reflow for re-trigger
            livesEl.classList.add('hit');
            S.lifeLossFlash = Math.max(S.lifeLossFlash, 1);
            S.slowMoTimer = Math.max(S.slowMoTimer, POLISH.LIFE_LOSS_SLOW_MO_SEC);
            pushScorePopup(n.x, n.y - 18, '-1 LIFE', '#ff9c8d', 20);

            if (!stillAlive) {
              // All lives lost — game over
              S.isGameOver = true;
              logRunSummary('game-over', now);
              const survivalTime = Math.floor((now - S.gameStartTime) / 1000);
              document.getElementById('finalScore').textContent = S.score;
              document.getElementById('bestCombo').textContent = S.bestCombo;
              document.getElementById('survivalTime').textContent = survivalTime;

              if (S.score > S.highScore) {
                S.highScore = S.score;
                localStorage.setItem('highScore', S.highScore);
                hudUpdater.syncBestDisplays(S);
              }

              idiotModal.style.display = 'flex';
              break;
            }
            continue;
          } else {
            const boostedBySwat = hitHand && S.swat.hand === hitHand && now <= S.swat.stretchUntil;
            const bounceForce = boostedBySwat
              ? HAND_BOUNCE * SWAT.BOUNCE_MULTIPLIER
              : HAND_BOUNCE;

            n.dy = bounceForce;
            n.dx += handVelX * 0.15;
            if (boostedBySwat) {
              n.dx += hitHand === 'left' ? -0.8 : 0.8;
              S.swat.hand = null;
              S.swat.stretchUntil = 0;
            }
            n.cooldown = 200;
            n.floorBounces = 0;
            n.wallHits = 0;
            S.score++;
            S.combo++;
            S.bestCombo = Math.max(S.bestCombo, S.combo);
            scoreEl.textContent = S.score;
            pushScorePopup(n.x, n.y - 14, '+1', n.col, boostedBySwat ? 26 : 22);
            if (S.combo >= 3 && S.combo % 3 === 0) {
              pushScorePopup(n.x + (random() - 0.5) * 30, n.y - 42, `${S.combo}x`, '#ffe89a', 20);
            }
            chargePower(S, POWER.PER_BOUNCE + S.combo * POWER.COMBO_BONUS);
            hudUpdater.updatePowerBar(S);
            if (!S.ultimate.active && S.power >= POWER.ULTIMATE_COST) {
              S.ultimate.pendingTrigger = true;
            }

            // Each bounce deals chip damage to the ship
            if (S.shipHP > 0 && !S.isVictory) {
              const dmg = S.combo >= 5 ? 2 : 1; // combo bonus damage
              applyShipDamage(dmg, n.x, n.y, 'bounce');
              hudUpdater.updateShipHpBar(S);
            }

            // Check for extra life at score milestones
            if (checkExtraLife(S, S.score)) {
              telemetry.onLifeGained(S.lives);
              hudUpdater.updateLivesDisplay(S);
              hudUpdater.triggerLifeGainPulse();
              pushScorePopup(cx, hCSS * 0.3, 'LIFE +1', '#9cffc0', 24);
              createParticles(cx, hCSS * 0.3, '#00ff88', 20);
            }

            if (S.combo > 1) {
              comboEl.textContent = `${S.combo}x Combo!`;
              comboEl.classList.add('active');
            }

            createParticles(n.x, n.y, n.col, boostedBySwat ? 10 : 6);
          }
        }

        // Reset combo if number hits floor
        if (n.y >= floorY && !n.isTrap && n.cooldown <= 0) {
          S.combo = 0;
          comboEl.classList.remove('active');
        }

        // Draw number with glow for traps
        if (n.isTrap) {
          n.glow = 0.5 + Math.sin(now / 200) * 0.5;
          ctx.shadowColor = n.col;
          ctx.shadowBlur = 20 * n.glow;
        }

        ctx.font = `bold ${layout.numberFont}px Arial`;
        ctx.fillStyle = n.col;
        ctx.textAlign = 'center';
        ctx.fillText(n.txt, n.x, n.y);

        ctx.shadowBlur = 0;
      }

      if (S.ultimate.pendingTrigger && !S.ultimate.active && !S.isVictory) {
        startUltimate(now, cx, anchorY);
      }

      drawUltimate(now, cx, anchorY);
      drawSlamShockwave(now);
      drawLaserSmoke();
      drawRegularBeamEruptionNumbers();
      drawProjectiles(ctx, S, getAdaptiveQualityCaps());
      drawScorePopups();
      drawParticles();
      ctx.restore();

      if (S.lifeLossFlash > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 82, 62, ${Math.min(0.28, S.lifeLossFlash * 0.28)})`;
        ctx.fillRect(0, 0, wCSS, hCSS);
        ctx.restore();
      }
    }
    requestAnimationFrame(loop);
  }

  async function bootGame() {
    await preloadCoreAssets();
    hideLoadingScreen();
    showTitleScreen();
    requestAnimationFrame(loop);
  }

  bootGame().catch((err) => {
    console.error('Boot failed:', err);
    if (loadingSubtitle) loadingSubtitle.textContent = 'Boot error. Check console.';
    hideLoadingScreen();
    showTitleScreen();
    requestAnimationFrame(loop);
  });
})();
