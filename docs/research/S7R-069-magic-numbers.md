# Hardcoded Scene-Tuning Values (S7R-069)

Catalog of magic numbers in `src/main.js` that control scene tuning. These should be extracted to `src/config/scene-config.js` or `src/constants.js`.

| Line (Approx) | Value | What it controls | Should extract? | Suggested constant name |
|---|---|---|---|---|
| ~1077 | `180000` | Day/Night cycle duration (ms) | Yes | `SCENE.DAY_CYCLE_DURATION_MS` |
| ~1078 | `14` | Parallax factor for background elements | Yes | `SCENE.PARALLAX_FACTOR` |
| ~1080-1085 | `20, 14, 58` (etc) | Sky gradient RGB base values | Yes | `SCENE.SKY_GRADIENT_BASE` (object) |
| ~1100-1130 | `0.0082`, `0.0106`, `0.0124` | Hill wave frequencies | Yes | `SCENE.HILL_WAVE_FREQUENCIES` (array) |
| ~1100-1130 | `26`, `34`, `18` | Hill wave amplitudes | Yes | `SCENE.HILL_WAVE_AMPLITUDES` (array) |
| ~1160-1175 | `108` | Ground top position offset from bottom | Yes | `SCENE.GROUND_OFFSET_Y` |
| ~1160 | `0.3` | Barn width relative to screen width | Yes | `SCENE.BARN_WIDTH_RATIO` |
| ~1161 | `0.62` | Barn height relative to width | Yes | `SCENE.BARN_HEIGHT_RATIO` |
| ~1208 | `20` | Ground grass spacing | Yes | `SCENE.GRASS_SPACING_PX` |
| ~1225 | `8` | Magnet target Y offset from anchor | Yes | `SCENE.MAGNET_TARGET_Y_OFFSET` |
| ~1260 | `1320` | Slam shockwave growth speed (px/sec) | Yes | `SCENE.SLAM_SHOCKWAVE_SPEED` |
| ~1365 | `0.22` | Boss ship hover Y position ratio (screen height) | Yes | `SCENE.BOSS_HOVER_Y_RATIO` |
| ~1410 | `0.48` | Wide danger beam width ratio (Phase 4) | Yes | `SCENE.DANGER_BEAM_WIDE_RATIO` |
| ~1467 | `42` | Ship hit FX burst duration (ms) | Yes | `SCENE.SHIP_HIT_FX_DURATION_MS` |
| ~1473 | `98` | Ship hit impulse base force | Yes | `SCENE.SHIP_HIT_IMPULSE_BASE` |
| ~1500 | `24` | Score popup random X jitter | Yes | `SCENE.SCORE_POPUP_X_JITTER` |
| ~1501 | `72` | Score popup initial VY | Yes | `SCENE.SCORE_POPUP_VY_BASE` |
| ~1502 | `96` | Score popup gravity | Yes | `SCENE.SCORE_POPUP_GRAVITY` |
| ~1567 | `120` | Number spawn X margin (width - 120) | Yes | `SCENE.SPAWN_X_MARGIN` |
| ~1567 | `60` | Number spawn X offset | Yes | `SCENE.SPAWN_X_OFFSET` |
| ~1568 | `-100` | Number spawn Y start | Yes | `SCENE.SPAWN_Y_START` |
| ~1603 | `0.42` | Badguys spawn spread ratio | Yes | `SCENE.BADGUYS_SPAWN_SPREAD_RATIO` |
| ~1730 | `90` | Ultimate trap sweep interval (ms) | Yes | `SCENE.ULTIMATE_TRAP_SWEEP_INTERVAL_MS` |
| ~1878 | `30` | Victory camera shake amplitude | Yes | `SCENE.VICTORY_SHAKE_AMPLITUDE` |
| ~1881 | `40` | Victory particle count | Yes | `SCENE.VICTORY_PARTICLE_COUNT` |
| ~3040 | `0.006` | Badguys side pad ratio (wCSS * 0.006) | Yes | `SCENE.BADGUYS_SIDE_PAD_RATIO` |
| ~3043 | `0.72` | Badguys max Y bound ratio | Yes | `SCENE.BADGUYS_MAX_Y_RATIO` |
| ~3062 | `180` | Badguys base speed | Yes | `SCENE.BADGUYS_BASE_SPEED` |
| ~3063 | `280` | Badguys target speed | Yes | `SCENE.BADGUYS_TARGET_SPEED` |
| ~3064 | `0.0035` | Badguys swoop frequency base | Yes | `SCENE.BADGUYS_SWOOP_FREQ_BASE` |
| ~3066 | `260` | Badguys swoop force base | Yes | `SCENE.BADGUYS_SWOOP_FORCE_BASE` |
| ~3375 | `30` | Spawn interval reduction rate (ms per second) | Yes | `SCENE.SPAWN_INTERVAL_REDUCTION_RATE` |
| ~3379 | `0.01` | Trap chance increase rate (per second) | Yes | `SCENE.TRAP_CHANCE_INCREASE_RATE` |
| ~3466 | `170` | Game time divisor for hand stretch animation | Yes | `SCENE.HAND_STRETCH_TIME_DIVISOR` |
| ~3590 | `26000` | Number max age (ms) before despawn | Yes | `SCENE.NUMBER_MAX_AGE_MS` |
| ~3680 | `15` | Max number falling velocity (terminal velocity) | Yes | `SCENE.NUMBER_TERMINAL_VELOCITY` |
| ~3730 | `26` | Max floor bounces before despawn | Yes | `SCENE.MAX_FLOOR_BOUNCES` |
| ~3734 | `18` | Max wall hits before despawn | Yes | `SCENE.MAX_WALL_HITS` |
