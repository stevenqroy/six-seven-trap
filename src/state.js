import {
  INITIAL_SPAWN_INTERVAL,
  TRAP_SPAWN_CHANCE_START,
  STARTING_LIVES,
  SHIP_MAX_HP,
  POWER,
  BADGUYS_OVERLAY_DEFAULT,
  BADGUYS_LIGHT_ANCHORS_DEFAULT,
  BADGUYS_LIGHT_MAX,
  DANGER_BEAM_TUNING,
} from './constants.js';

// All mutable game state lives here.
// Modules import this object and read/write its properties directly.

const state = {
  // Scoring
  score: 0,
  highScore: 0,
  combo: 0,
  bestCombo: 0,
  scorePopups: [],

  // Game flow
  isTitleScreen: true,
  isGameOver: false,
  isPaused: false,
  gameStartTime: 0,

  // Run metadata (S7R-002 deterministic replay support)
  runSeed: null,
  runDeterministicRng: false,
  runRngDrawCount: 0,
  qualityTier: 'high',
  enemyRegistry: null,
  enemyRegistryError: null,
  enemyRuntime: {
    enabled: false,
    activeCount: 0,
    byState: {},
    totalSpawned: 0,
    totalTransitions: 0,
    totalDespawns: 0,
    totalCleanups: 0,
    forcedRecoveries: 0,
    forcedDespawns: 0,
    invalidStateRecoveries: 0,
    invalidTransitions: 0,
    deadStateCleanups: 0,
    maxConcurrentEntities: 0,
    oldestStateAgeMs: 0,
    oldestLifetimeMs: 0,
    lastTickAtMs: 0,
  },

  // Lives system
  lives: STARTING_LIVES,
  invincibleUntil: 0, // timestamp: player is invincible until this time
  lastExtraLifeScore: 0, // last score at which an extra life was awarded

  // Power system
  power: 0,
  powerFlash: 0,
  maxPower: POWER.MAX,

  // Shield ability
  shield: {
    active: false,
    startedAt: 0,
    lastUsedAt: -Infinity,
    rippleAt: -Infinity,
  },

  // Powered swat state
  swat: {
    lastAt: -Infinity,
    hand: null,
    stretchUntil: 0,
  },

  // Magnet ability state
  magnet: {
    active: false,
  },

  // Slam ability state
  slam: {
    shockwave: null, // { x, y, radius, maxRadius, startedAt, flash }
  },

  // Ultimate ability state
  ultimate: {
    active: false,
    pendingTrigger: false,
    startedAt: 0,
    phase: 0, // 0 idle, 1 beam, 2 explosion, 3 rain
    flash: 0,
    nextTrapSweepAt: 0,
    rainSpawned: false,
    explosionCarry: 0,
  },

  // Boss / Ship HP
  shipHP: SHIP_MAX_HP,
  bossPhase: 1,
  isVictory: false,
  shipDamageFlash: 0, // visual flash when ship takes damage (0-1, decays)
  shipRecoilX: 0,
  shipRecoilY: 0,
  shipRecoilVX: 0,
  shipRecoilVY: 0,
  lastShipHitFxAt: -Infinity,

  // Spawning
  lastTrapTime: 0,
  lastGoodTime: 0,
  spawnInterval: INITIAL_SPAWN_INTERVAL,
  trapChance: TRAP_SPAWN_CHANCE_START,

  // Entities
  nums: [],
  particles: [],
  projectiles: [],

  // Camera
  cameraShake: 0,
  lifeLossFlash: 0,
  slowMoTimer: 0,

  // Canvas dimensions (CSS pixels)
  wCSS: 0,
  hCSS: 0,

  // Input
  touchX: 0,
  lastX: 0,
  handVelX: 0,

  // Danger beam embers
  dangerEmbers: [],
  dangerEmberSpawnCarry: 0,
  dangerSizzles: [],

  // Regular beam harvest (portal that collects 6/7 numbers)
  regularBeamHarvest: {
    target: 30,
    charge: 0,
    capturedDigits: [],
    flash: 0,
    eruptionFlash: 0,
    eruptionNumbers: [],
  },

  // Laser storm system
  laserStorm: {
    enabled: false,
    beams: [],
    segments: [],
    spawnCarry: 0,
    smokePuffs: [],
    sourceBurst: 0,
  },

  // Badguys overlay (mutable, editor can change these)
  badguysOverlay: { ...BADGUYS_OVERLAY_DEFAULT },
  badguysMotionPausedForLightSetup: false,
  badguysVisible: true,
  badguysSpriteVariant: 'clean',

  // Badguys flight state
  badguysFlight: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
    nextRetargetAt: 0,
    nextSpeedShiftAt: 0,
    currentSpeed: 120,
    targetSpeed: 120,
    swoopFreq: 0.004,
    swoopPhase: 0,
    swoopForce: 170,
    initialized: false,
  },

  // Badguys render state (computed each frame)
  badguysRender: { x: 0, y: 0, w: 0, h: 0, ready: false },

  // Light anchor points (mutable — editor can add/remove)
  badguysLightAnchors: BADGUYS_LIGHT_ANCHORS_DEFAULT.map((p) => ({ ...p })),

  // Light setup (editor controls)
  badguysLightSetup: {
    enabled: true,
    max: BADGUYS_LIGHT_MAX,
    markerRadius: 6,
    removeRadius: 20,
  },

  // Light visual settings
  badguysLightVisual: {
    size: 10,
    minSize: 3,
    maxSize: 36,
    step: 1,
    stepFast: 3,
  },

  // Danger mode
  isDangerDanger: false,
  scowlVisible: false,

  // Danger beam state
  dangerBeam: {
    enabled: false,
    ...DANGER_BEAM_TUNING,
    widthAmp: 0.1,
    nudgeStep: 2,
    nudgeStepFast: 6,
    speedA: 0.0021,
    speedB: 0.00355,
    phaseA: 0,
    phaseB: 0,
    huePhase: 0,
  },

  // Editor state
  badguysEditor: {
    enabled: true,
    visible: true,
    scaleStep: 0.01,
    scaleStepFast: 0.03,
  },
};

// Load high score from localStorage
const stored = Number(localStorage.getItem('highScore'));
if (Number.isFinite(stored)) state.highScore = stored;

// Initialize touch position
state.touchX = (typeof window !== 'undefined' ? window.innerWidth : 400) / 2;
state.lastX = state.touchX;

export default state;
