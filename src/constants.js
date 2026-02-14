// Game physics
export const GRAVITY = 0.22;
export const HAND_BOUNCE = -11.5;
export const FLOOR_BOUNCE = -0.85;

// Spawning
export const INITIAL_SPAWN_INTERVAL = 1800;
export const MIN_SPAWN_INTERVAL = 900;
export const TRAP_SPAWN_CHANCE_START = 0.25;
export const TRAP_SPAWN_CHANCE_MAX = 0.5;

// Gesture recognizer timings and thresholds
export const GESTURE = {
  TAP_MAX_DURATION_MS: 200,
  TAP_MAX_MOVEMENT_PX: 15,
  DOUBLE_TAP_WINDOW_MS: 300,
  HOLD_DELAY_MS: 400,
  SWIPE_UP_MIN_DISTANCE_PX: 50,
  SWIPE_MAX_DURATION_MS: 300,
};

// Power meter and ability costs (future abilities consume this)
export const POWER = {
  MAX: 100,
  PER_BOUNCE: 3,
  COMBO_BONUS: 0.5,
  SHIELD_COST: 30,
  PROJECTILE_COST: 20,
  MAGNET_DRAIN: 12,
  SLAM_COST: 40,
  ULTIMATE_COST: 100,
};

// Shield ability tuning
export const SHIELD = {
  DURATION_MS: 3000,
  RADIUS_PX: 140,
  COOLDOWN_MS: 4000,
};

// Projectile ability tuning
export const PROJECTILE = {
  SPEED_PX_PER_FRAME: 8,
  DAMAGE: 5,
  MAX_ACTIVE: 3,
  RADIUS_PX: 8,
  TRAIL_LENGTH: 12,
};

// Powered swat tuning
export const SWAT = {
  RANGE: 120,
  COOLDOWN: 500,
  BOUNCE_MULTIPLIER: 1.4,
  STRETCH_AMOUNT: 0.6,
  STRETCH_DURATION: 150,
};

// Magnet ability tuning
export const MAGNET = {
  RANGE: 200,
  FORCE: 0.08,
  DAMPING: 0.92,
};

// Ultimate sequence tuning
export const ULTIMATE = {
  BEAM_MS: 800,
  EXPLOSION_MS: 1500,
  RAIN_MS: 2500,
  DAMAGE: 20,
  BONUS_RAIN_COUNT: 12,
};

// Game-feel polish tuning
export const POLISH = {
  SCORE_POPUP_MAX: 30,
  SCORE_POPUP_LIFE_SEC: 0.78,
  LIFE_LOSS_FLASH_DECAY: 2.2,
  LIFE_LOSS_SLOW_MO_SEC: 0.18,
  LIFE_LOSS_SLOW_MO_SCALE: 0.45,
  SHIP_RECOIL_SPRING: 21,
  SHIP_RECOIL_DAMPING: 0.79,
  SHIP_RECOIL_MAX_X: 46,
  SHIP_RECOIL_MAX_Y: 28,
  NEAR_FULL_POWER_RATIO: 0.84,
};

// Adaptive quality governor (S7R-008)
export const ADAPTIVE_QUALITY = {
  DEFAULT_TIER: 'high',
  DOWNGRADE_AVG_MS: 24,
  DOWNGRADE_WINDOW_MS: 2000,
  UPGRADE_AVG_MS: 18,
  UPGRADE_WINDOW_MS: 4000,
  MIN_TIER_DWELL_MS: 1500,
  TIERS: {
    high: {
      maxParticles: 450,
      particleSpawnScale: 1,
      maxActiveLaserBeams: 18,
      maxLaserSmoke: 420,
      laserSmokeSpawnScale: 1,
      dangerBeamSparkles: 170,
      regularBeamSparkles: 78,
      dangerEmberSpawnRate: 280,
      maxDangerEmbers: 420,
      maxDangerSizzles: 340,
    },
    medium: {
      maxParticles: 300,
      particleSpawnScale: 0.78,
      maxActiveLaserBeams: 13,
      maxLaserSmoke: 300,
      laserSmokeSpawnScale: 0.72,
      dangerBeamSparkles: 126,
      regularBeamSparkles: 58,
      dangerEmberSpawnRate: 190,
      maxDangerEmbers: 280,
      maxDangerSizzles: 240,
    },
    low: {
      maxParticles: 180,
      particleSpawnScale: 0.58,
      maxActiveLaserBeams: 9,
      maxLaserSmoke: 210,
      laserSmokeSpawnScale: 0.5,
      dangerBeamSparkles: 86,
      regularBeamSparkles: 38,
      dangerEmberSpawnRate: 120,
      maxDangerEmbers: 180,
      maxDangerSizzles: 150,
    },
  },
};

// Caps
export const MAX_ACTIVE_NUMS = 72;
export const MAX_ACTIVE_LASER_BEAMS = 18;
export const MAX_LASER_SMOKE = 420;

// Dev toggle — set true only when testing without failure conditions.
export const TEMP_NO_LOSE = false;

// Lives system
export const STARTING_LIVES = 3;
export const MAX_LIVES = 5;
export const INVINCIBILITY_DURATION = 2000; // ms of invincibility after losing a life
export const EXTRA_LIFE_INTERVAL = 50; // score threshold for extra life

// Badguys sprite sheet layout
export const BADGUYS_SPRITE_SHEET = {
  frameW: 480,
  frameH: 270,
  cols: 8,
  rows: 16,
  frames: 128,
  fps: 15,
  scaleMultiplier: 3.0,
};

export const BADGUYS_LIGHT_MAX = 12;

// Hand tuning offsets
export const HAND_TUNING = {
  left: { x: -2, y: -8, rot: 0 },
  right: { x: 1, y: -4, rot: 0.01 },
};

// Scowl overlay position relative to avatar body
export const SCOWL_OVERLAY = { x: 93, y: 51, scale: 0.28, rot: 0 };

// Badguys overlay base settings
export const BADGUYS_OVERLAY_DEFAULT = { scale: 0.23, y: 12 };

// Light anchor positions on the badguys sprite (normalized 0-1)
export const BADGUYS_LIGHT_ANCHORS_DEFAULT = [
  { x: 0.2078, y: 0.7387 },
  { x: 0.2363, y: 0.7722 },
  { x: 0.2755, y: 0.7832 },
  { x: 0.3363, y: 0.7907 },
  { x: 0.3783, y: 0.7991 },
  { x: 0.4401, y: 0.8007 },
  { x: 0.5242, y: 0.8013 },
  { x: 0.591, y: 0.8034 },
  { x: 0.6488, y: 0.7913 },
  { x: 0.6882, y: 0.7779 },
  { x: 0.7287, y: 0.7615 },
  { x: 0.7578, y: 0.7406 },
];

// Boss / Ship HP
export const SHIP_MAX_HP = 100;
export const PHASE_THRESHOLDS = [
  { hp: 100, phase: 1 }, // Normal flight, base traps, tractor beam
  { hp: 70, phase: 2 },  // Faster, more traps, beam harvest portal active
  { hp: 40, phase: 3 },  // Laser storm + danger mode
  { hp: 15, phase: 4 },  // All systems, rapid spawning, frantic
];

// Danger beam tuning
export const DANGER_BEAM_TUNING = {
  widthRatio: 0.33,
  lengthMin: 0.88,
  lengthMax: 1,
  offsetX: 0,
  offsetY: 54,
};

// Mobile / responsive gameplay scaling
export const MOBILE = {
  BASE_SHORT_EDGE: 430,
  MIN_SCALE: 0.82,
  MAX_SCALE: 1.08,
  SIDE_PAD: 80,
  ANCHOR_OFFSET_Y: 135,
  WRIST_OFFSET: 25,
  HAND_W: 135,
  HAND_H: 110,
  FLOOR_OFFSET_Y: 60,
  WALL_PAD_X: 40,
  HIT_ZONE_X: 65,
  HIT_ZONE_Y: 45,
  NUM_FONT: 70,
  BEAM_FONT: 64,
};
