# Tunable Constants Catalog (S7R-062)

This catalog lists all tunable constants that affect gameplay balance, visuals, and difficulty scaling. It serves as the reference for the S7R-054 polish pass.

**Legend:**
- **Ref**: File and line number (approximate).
- **Constant**: Name of the constant or variable.
- **Value**: Current value in the codebase.
- **Effect**: What it controls in the game.
- **Unit**: The unit of measurement (pixels, ms, %, etc.).

## 1. Core Gameplay Balance

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `constants.js:2` | `GRAVITY` | `0.22` | Downward acceleration of bouncing numbers | px/frame² |
| `constants.js:3` | `HAND_BOUNCE` | `-11.5` | Upward velocity imparted by hand collision | px/frame |
| `constants.js:4` | `FLOOR_BOUNCE` | `-0.85` | Velocity restitution when hitting floor (negative = bounce) | ratio |
| `constants.js:7` | `INITIAL_SPAWN_INTERVAL` | `1800` | Starting time between enemy spawns | ms |
| `constants.js:8` | `MIN_SPAWN_INTERVAL` | `900` | Minimum possible spawn interval (hard cap) | ms |
| `constants.js:9` | `TRAP_SPAWN_CHANCE_START` | `0.25` | Starting probability that a spawn is a trap (red number) | 0-1 |
| `constants.js:10` | `TRAP_SPAWN_CHANCE_MAX` | `0.5` | Maximum probability of trap spawns | 0-1 |
| `constants.js:133` | `MAX_ACTIVE_NUMS` | `72` | Hard limit on total bouncing numbers active | count |
| `constants.js:140` | `STARTING_LIVES` | `3` | Lives granted at start of run | count |
| `constants.js:141` | `MAX_LIVES` | `5` | Maximum life cap | count |
| `constants.js:142` | `INVINCIBILITY_DURATION` | `2000` | Duration of invulnerability after taking damage | ms |
| `constants.js:143` | `EXTRA_LIFE_INTERVAL` | `50` | Score points required to earn 1-up | points |
| `main.js:3375` | `(30)` | Spawn interval reduction rate (difficulty ramp) | ms/sec |
| `main.js:3379` | `(0.01)` | Trap chance increase rate (difficulty ramp) | %/sec |

## 2. Abilities & Power

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `constants.js:24` | `POWER.MAX` | `100` | Maximum energy capacity | energy |
| `constants.js:25` | `POWER.PER_BOUNCE` | `3` | Energy gained per successful bounce | energy |
| `constants.js:26` | `POWER.COMBO_BONUS` | `0.5` | Additional energy per bounce per combo multiplier | energy |
| `constants.js:27` | `POWER.SHIELD_COST` | `30` | Cost to activate shield | energy |
| `constants.js:28` | `POWER.PROJECTILE_COST` | `20` | Cost to fire one projectile | energy |
| `constants.js:29` | `POWER.MAGNET_DRAIN` | `12` | Energy drain rate while holding magnet | energy/sec |
| `constants.js:30` | `POWER.SLAM_COST` | `40` | Cost to perform slam | energy |
| `constants.js:31` | `POWER.ULTIMATE_COST` | `100` | Cost to trigger ultimate (requires full bar) | energy |
| `constants.js:35` | `SHIELD.DURATION_MS` | `3000` | Duration of active shield | ms |
| `constants.js:36` | `SHIELD.RADIUS_PX` | `140` | Hitbox radius of shield | px |
| `constants.js:37` | `SHIELD.COOLDOWN_MS` | `4000` | Cooldown between shield activations | ms |
| `constants.js:42` | `PROJECTILE.SPEED_PX_PER_FRAME` | `8` | Travel speed of energy bolt | px/frame |
| `constants.js:43` | `PROJECTILE.DAMAGE` | `5` | Damage dealt to ship per bolt hit | hp |
| `constants.js:44` | `PROJECTILE.MAX_ACTIVE` | `3` | Max simultaneous projectiles allowed | count |
| `constants.js:51` | `SWAT.RANGE` | `120` | Max distance for auto-targeting swat | px |
| `constants.js:52` | `SWAT.COOLDOWN` | `500` | Cooldown between powered swats | ms |
| `constants.js:58` | `MAGNET.RANGE` | `200` | Max radius for magnet pull effect | px |
| `constants.js:59` | `MAGNET.FORCE` | `0.08` | Strength of magnet pull acceleration | factor |
| `constants.js:65` | `ULTIMATE.BEAM_MS` | `800` | Duration of phase 1 (beam) of ultimate | ms |
| `constants.js:66` | `ULTIMATE.EXPLOSION_MS` | `1500` | Duration of phase 2 (explosion) of ultimate | ms |
| `constants.js:67` | `ULTIMATE.RAIN_MS` | `2500` | Duration of phase 3 (bonus rain) of ultimate | ms |
| `constants.js:68` | `ULTIMATE.DAMAGE` | `20` | Total damage dealt by ultimate to ship | hp |
| `constants.js:69` | `ULTIMATE.BONUS_RAIN_COUNT` | `12` | Number of bonus 6/7s spawned during ultimate | count |

## 3. Enemies & Hazards

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `constants.js:166` | `SHIP_MAX_HP` | `100` | Total health of the alien ship | hp |
| `main.js:3062` | `(180)` | Badguys base horizontal speed | px/sec |
| `main.js:3063` | `(280)` | Badguys target max speed | px/sec |
| `main.js:3064` | `(0.0035)` | Badguys swoop frequency base | factor |
| `main.js:3066` | `(260)` | Badguys swoop force base | force |
| `constants.js:134` | `MAX_ACTIVE_LASER_BEAMS` | `18` | Hard cap on simultaneous laser beams | count |
| `main.js:2907` | `(280)` | Danger ember spawn rate (default tier) | particles/sec |
| `main.js:2908` | `(300)` | Max danger embers (hard cap) | count |
| `main.js:2909` | `(150)` | Max danger sizzles (hard cap) | count |
| `constants.js:175` | `DANGER_BEAM_TUNING.widthRatio` | `0.33` | Width of danger beam relative to ship width | ratio |
| `constants.js:176` | `DANGER_BEAM_TUNING.lengthMin` | `0.88` | Minimum beam length (oscillation) | screen height % |

## 4. Support Units (Hardcoded in Modules)

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `medic-firefly.js:15` | `HEAL_INTERVAL` | `2000` | Time between heal pulses | ms |
| `medic-firefly.js:16` | `HEAL_AMOUNT` | `0.34` | Lives restored per pulse (fractional) | lives |
| `medic-firefly.js:17` | `LIFETIME` | `12000` | Total duration of firefly unit | ms |
| `medic-firefly.js:18` | `ORBIT_RADIUS` | `60` | Radius of firefly orbit around player | px |
| `striker-hawk.js:18` | `STRIKE_COOLDOWN` | `1500` | Time between dives | ms |
| `striker-hawk.js:19` | `STRIKE_DAMAGE` | `15` | Damage dealt per dive hit | hp |
| `striker-hawk.js:20` | `LIFETIME` | `15000` | Total duration of hawk unit | ms |
| `striker-hawk.js:21` | `PATROL_RADIUS` | `180` | Patrol range from screen center | px |

## 5. Visuals & Polish

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `constants.js:73` | `POLISH.SCORE_POPUP_LIFE_SEC` | `0.78` | Duration of floating score text | sec |
| `constants.js:77` | `POLISH.SHIP_RECOIL_SPRING` | `21` | Spring force for ship hit reaction | factor |
| `constants.js:78` | `POLISH.SHIP_RECOIL_DAMPING` | `0.79` | Damping factor for ship hit reaction | factor |
| `constants.js:135` | `MAX_LASER_SMOKE` | `420` | Max smoke particles for laser burns | count |
| `shield.js:30` | `MAX_SPARKLES` | `20` | Max sparkle particles on shield | count |
| `shield.js:33` | `MAX_ARCS` | `5` | Max electric arcs on shield | count |
| `main.js:1878` | `(30)` | Victory camera shake amplitude | px |
| `main.js:1260` | `(1320)` | Slam shockwave expansion speed | px/sec |

## 6. Mobile & Input Tuning

| Ref | Constant | Value | Effect | Unit |
|---|---|---|---|---|
| `constants.js:14` | `GESTURE.TAP_MAX_DURATION_MS` | `200` | Max press time for a tap | ms |
| `constants.js:15` | `GESTURE.TAP_MAX_MOVEMENT_PX` | `15` | Max drag distance for a tap | px |
| `constants.js:16` | `GESTURE.DOUBLE_TAP_WINDOW_MS` | `300` | Max time between taps for double-tap | ms |
| `constants.js:184` | `MOBILE.MIN_SCALE` | `0.82` | Minimum UI scale factor | ratio |
| `constants.js:185` | `MOBILE.MAX_SCALE` | `1.08` | Maximum UI scale factor | ratio |
| `constants.js:191` | `MOBILE.HIT_ZONE_X` | `65` | Hand collision width (half-width) | px |
| `constants.js:192` | `MOBILE.HIT_ZONE_Y` | `45` | Hand collision height (half-height) | px |
