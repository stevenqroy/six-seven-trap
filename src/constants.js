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

// World scenery tuning (S7R-080, numbers from S7R-069)
export const SCENE = {
  DAY_CYCLE_DURATION_MS: 180000,
  PARALLAX_FACTOR: 14,
  GRADIENT_STEP_MS: 500,
  SKY_GRADIENT_BASE: {
    topR: 20, topG: 14, topB: 58,
    bottomR: 255, bottomG: 160, bottomB: 110,
    dayDeltaTopR: 22, dayDeltaTopG: 12, dayDeltaTopB: 48,
    dayDeltaBottomR: 28, dayDeltaBottomG: 38, dayDeltaBottomB: 16,
    midOffsetR: 8, midOffsetG: 6, midOffsetB: 16,
  },
  STAR_COUNT_MIN: 36,
  STAR_COUNT_MAX: 96,
  STAR_DENSITY_DIVISOR: 18000,
  STAR_HEIGHT_RATIO: 0.62,
  STAR_FADE_FACTOR: 0.58,
  HILL_FAR: { baseY: 0.67, amp: 26, freq: 0.0082, speed: 0.00016, phaseOffset: 1.4, px: 0.35, gradTopOffset: 31.2 },
  HILL_MID: { baseY: 0.74, amp: 34, freq: 0.0106, speed: 0.0002, phaseOffset: 0.2, px: 0.68, gradTopOffset: 40.8 },
  HILL_NEAR: { baseY: 0.8, amp: 18, freq: 0.0124, speed: 0.00024, phaseOffset: 2.2, px: 0.95, gradTopOffset: 21.6 },
  HILL_STEP_PX: 24,
  HILL_PAD_PX: 32,
  HILL_SECONDARY_FREQ_RATIO: 0.53,
  HILL_SECONDARY_AMP_RATIO: 0.35,
  HILL_SECONDARY_PX_RATIO: 1.3,
  HILL_SECONDARY_PHASE_RATIO: 1.7,
  GROUND_OFFSET_Y: 108,
  BARN_WIDTH_RATIO: 0.3,
  BARN_WIDTH_MIN: 180,
  BARN_WIDTH_MAX: 260,
  BARN_HEIGHT_RATIO: 0.62,
  BARN_ROOF_OVERHANG: 16,
  BARN_ROOF_HEIGHT_RATIO: 0.45,
  BARN_FLOOR_LIFT: 8,
  BARN_DOOR_WIDTH_RATIO: 0.28,
  BARN_DOOR_HEIGHT_RATIO: 0.52,
  BARN_DOOR_GLOW_CENTER_Y_RATIO: 0.68,
  BARN_DOOR_GLOW_RADIUS_RATIO: 0.95,
  GRASS_SPACING_PX: 20,
  GRASS_WAVE_FREQ: 0.15,
  GRASS_WAVE_SPEED: 0.0016,
  GRASS_BLADE_DX: 6,
  GRASS_BLADE_DY: 8,
  GRASS_TOP_OFFSET: 6,
  // Badguys flight controller tuning (S7R-081, numbers from S7R-069)
  BADGUYS_SIDE_PAD_RATIO: 0.006,
  BADGUYS_SIDE_PAD_MIN: 4,
  BADGUYS_MIN_Y_BUFFER: 6,
  BADGUYS_MAX_Y_RATIO: 0.72,
  BADGUYS_INITIAL_SPEED: 180,
  BADGUYS_INITIAL_TARGET_SPEED: 280,
  BADGUYS_SWOOP_FREQ_BASE: 0.0035,
  BADGUYS_SWOOP_FORCE_BASE: 260,
  BADGUYS_SWOOP_FORCE_RAND: 220,
  BADGUYS_RETARGET_MIN_MS: 150,
  BADGUYS_RETARGET_RAND_MS: 420,
  BADGUYS_SPEED_SHIFT_MIN_MS: 180,
  BADGUYS_SPEED_SHIFT_RAND_MS: 560,
  BADGUYS_SPEED_SHIFT_BASE: 180,
  BADGUYS_SPEED_SHIFT_RANGE: 280,
  BADGUYS_SPEED_SHIFT_SWOOP_FREQ_BASE: 0.003,
  BADGUYS_SPEED_SHIFT_SWOOP_FREQ_RAND: 0.0045,
  BADGUYS_SPEED_SHIFT_SWOOP_FORCE_BASE: 240,
  BADGUYS_SPEED_SHIFT_SWOOP_FORCE_RAND: 280,
  BADGUYS_SPEED_SHIFT_RAND_MS_EXTENDED: 620,
  BADGUYS_TARGET_ARRIVE_DIST: 24,
  BADGUYS_SPEED_RAMP_FACTOR: 3.2,
  BADGUYS_MAX_SPEED: 540,
  BADGUYS_MIN_SPEED: 130,
  BADGUYS_DIST_SPEED_FACTOR: 2.2,
  BADGUYS_VELOCITY_SMOOTH_FACTOR: 3.9,
  BADGUYS_SWOOP_FREQ_HORIZONTAL_RATIO: 0.7,
  BADGUYS_HORIZONTAL_SWOOP_FORCE: 70,
  BADGUYS_BOUNCE_BOOST_BASE: 1.08,
  BADGUYS_BOUNCE_BOOST_RAND: 0.08,
  BADGUYS_BOUNCE_MAX_VX: 560,
  BADGUYS_BOUNCE_MIN_VX: 160,
  BADGUYS_BOUNCE_OFFSET: 18,
  BADGUYS_BOUNCE_JITTER_Y: 95,
  BADGUYS_FLOOR_BOUNCE_DAMPING: -0.82,
  BADGUYS_FLOOR_BOUNCE_JITTER_X: 65,
  BADGUYS_INIT_Y_OFFSET: 8,
  BADGUYS_PAUSE_Y_OFFSET: 10,
  BADGUYS_EDGE_BIAS_X_POWER: 1.65,
  BADGUYS_EDGE_BIAS_X_THRESHOLD: 0.7,
  BADGUYS_EDGE_BIAS_Y_POWER: 1.9,
  BADGUYS_EDGE_BIAS_Y_THRESHOLD: 0.55,
  // Laser storm gradient quantization (S7R-082)
  LASER_GRADIENT_POS_STEP_PX: 6,
  LASER_GRADIENT_HUE_STEP: 12,
  LASER_GRADIENT_ALPHA_STEP: 0.05,
  // Danger beam oscillation step (S7R-082, used by S7R-083)
  DANGER_BEAM_OSC_STEP_MS: 33,
  // Laser storm beam spawn tuning
  LASER_SPAWN_RATE_BASE: 4.8,
  LASER_SPAWN_RATE_PER_ANCHOR: 0.42,
  LASER_BEAM_BASE_ANGLE_DOWN_BIAS: 0.66,
  LASER_BEAM_BASE_ANGLE_SPREAD: 1.9,
  LASER_BEAM_JITTER_FREQ_MIN: 0.003,
  LASER_BEAM_JITTER_FREQ_RANGE: 0.009,
  LASER_BEAM_JITTER_AMP_MIN: 0.35,
  LASER_BEAM_JITTER_AMP_RANGE: 0.55,
  LASER_BEAM_SWEEP_VEL_BASE: 2.8,
  LASER_BEAM_SWEEP_VEL_RANGE: 2.6,
  LASER_BEAM_LENGTH_MULT_MIN: 1.55,
  LASER_BEAM_LENGTH_MULT_RANGE: 0.35,
  LASER_BEAM_LIFE_MIN: 1.85,
  LASER_BEAM_LIFE_RANGE: 1.05,
  LASER_BEAM_WIDTH_MIN: 2.5,
  LASER_BEAM_WIDTH_RANGE: 2.6,
  LASER_BEAM_POWER_MIN: 7.8,
  LASER_BEAM_POWER_RANGE: 6.4,
  LASER_BEAM_HUE_SPEED: 0.07,
  // Laser storm physics
  LASER_SOURCE_BURST_DECAY: 1.4,
  LASER_JOLT_VEL_BASE: 2.8,
  LASER_JOLT_VEL_RANGE: 3.2,
  LASER_JOLT_INTERVAL_MIN: 110,
  LASER_JOLT_INTERVAL_RANGE: 380,
  LASER_VEL_EASE_FACTOR: 7.2,
  LASER_JITTER_SPEED: 1, // multiplied with per-beam jitterFreq
  // Laser bounce tuning
  LASER_BOUNCE_SEGMENTS: 4,
  LASER_BOUNCE_INERT_DURATION: 1,
  LASER_BOUNCE_FADE_RATE: 4,
  LASER_BOUNCE_OVERDRIVE_FADE_RATE: 4.2,
  LASER_BOUNCE_LIFE_MIN: 1.05,
  LASER_BOUNCE_CLAMP_INERT: 0.44,
  // Laser smoke tuning
  LASER_SMOKE_LOW_GRAPHICS_CHANCE: 0.45,
  LASER_SMOKE_LOW_GRAPHICS_STRENGTH: 0.68,
  LASER_SMOKE_MIN_CAP: 24,
  LASER_SMOKE_VX_SPREAD: 22,
  LASER_SMOKE_VY_BASE: 16,
  LASER_SMOKE_VY_RANGE: 30,
  LASER_SMOKE_R_MIN: 2.2,
  LASER_SMOKE_R_RANGE: 3.2,
  LASER_SMOKE_LIFE_MIN: 0.55,
  LASER_SMOKE_LIFE_RANGE: 0.5,
  LASER_SMOKE_GROW_MIN: 10,
  LASER_SMOKE_GROW_RANGE: 14,
  LASER_SMOKE_DRAG: 0.96,
  LASER_SMOKE_GRAVITY: 12,
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
