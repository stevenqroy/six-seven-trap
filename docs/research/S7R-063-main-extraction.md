# Main.js Extraction Candidates (S7R-063)

Analysis of `src/main.js` to identify the top 5 candidates for extraction into standalone modules. The goal is to reduce the file size (currently ~4200 lines) and improve maintainability by isolating distinct systems.

**Total Estimated Savings:** ~1,300 lines

| Candidate | Description | Line Estimate | Target Module | Dependencies |
|-----------|-------------|---------------|---------------|--------------|
| **1. Laser Storm** | All logic for laser beams, source gradients, smoke puffs, and rendering. | ~350 lines | `src/systems/laser-storm.js` | `badguysLightAnchors`, `badguysRender`, `ctx`, `getAdaptiveCapValue`, `random` |
| **2. Danger Beam** | Tractor beam rendering, oscillation physics, ember/sizzle particles, and collision. | ~300 lines | `src/systems/danger-beam.js` | `badguysRender`, `ctx`, `S` (state), `getAdaptiveCapValue`, `estimateCharacterNormal` |
| **3. World Scenery** | Background rendering, sky/hill gradients, barn, and star field generation. | ~250 lines | `src/systems/world-render.js` | `ctx`, `wCSS`, `hCSS`, `random`, `canvas` |
| **4. Badguys Controller** | Ship flight physics, target picking, bounds checking, and sprite state management. | ~220 lines | `src/systems/badguys.js` | `wCSS`, `hCSS`, `badguysOverlay`, `badguysSpriteSheet`, `S` (state) |
| **5. Beam Harvest** | The "portal" mechanic where 6/7s are captured, charged, and erupted. | ~180 lines | `src/systems/beam-harvest.js` | `S` (state), `regularBeamHarvest`, `createParticles`, `ctx` |

## Detailed Breakdown

### 1. Laser Storm System
**Block:** Lines ~2300 – 2650 (approx)
- **Functions:** `updateLaserStorm`, `drawLaserStorm`, `spawnLaserSmoke`, `updateLaserSmoke`, `drawLaserSmoke`, `getCachedLaserSourceGradient`, `getCachedLaserBeamGradient`, `getInertBeamPolylinePoints`, `startLaserPostHitBounce`, `updateLaserBounceTip`.
- **State:** `S.laserStorm`, `laserBeamGradientCache`, `laserSourceGradientCache`.
- **Why:** Complex, self-contained hazard system with its own physics and rendering. It pollutes `main.js` with gradient caching helpers and particle logic.

### 2. Danger Beam System
**Block:** Lines ~2890 – 3190 (approx) + ~2540 (drawDangerBeam)
- **Functions:** `updateDangerBeamEmbers`, `drawDangerBeamEmbers`, `drawDangerBeam`, `getDangerBeamGeometry`, `getDangerBeamOscillation`.
- **State:** `S.dangerBeam`, `S.dangerEmbers`, `S.dangerSizzles`, `S.dangerEmberSpawnCarry`.
- **Why:** The beam visualization is code-heavy (gradients, oscillations). The ember system is a distinct particle system that can be isolated.

### 3. World Scenery
**Block:** Lines ~1060 – 1320 (approx)
- **Functions:** `drawWorld`, `getWorldGradients`, `rebuildWorldStars`.
- **State:** `worldGradientCache`, `worldStars`.
- **Why:** Purely presentational. `getWorldGradients` is a massive function just for generating colors. Moving this out clears visual noise from the game loop.

### 4. Badguys Controller
**Block:** Lines ~3030 – 3260 (approx)
- **Functions:** `updateBadguysFlight`, `updateBadguysState`, `pickBadguysTarget`, `getBadguysBounds`.
- **State:** `S.badguysFlight`, `S.badguysRender`, `S.badguysOverlay`.
- **Why:** The ship's movement logic (swooping, bouncing off walls) is distinct from the core game loop. It simulates an entity that could be its own class/module.

### 5. Beam Harvest Mechanic
**Block:** Lines ~2770 – 2950 (approx)
- **Functions:** `getRegularBeamPortalState`, `isNumberInsideRegularBeam`, `triggerRegularBeamEruption`, `registerRegularBeamCapture`, `updateRegularBeamHarvest`, `drawRegularBeamEruptionNumbers`.
- **State:** `S.regularBeamHarvest`.
- **Why:** A specific Phase 2+ mechanic that involves complex state transitions (capture -> charge -> eruption). It interacts with `nums` but can accept them as arguments.

## Extraction Strategy
1.  **State Injection:** Most systems read/write to `S` (state). The new modules should export functions that accept `state` or specific sub-objects (e.g., `updateLaserStorm(S.laserStorm, dt)`).
2.  **Context Passing:** Rendering functions need `ctx` and dimensions (`wCSS`, `hCSS`). These should be passed in `render(ctx, ...)` calls.
3.  **Config:** Constants like `MAX_LASER_SMOKE` are already in `constants.js`, making extraction easier.
4.  **Dependencies:** Helper functions like `random()`, `clamp`, and `quantize` will need to be imported in the new modules.

## Next Steps
- Create `src/systems/world-render.js` first (lowest risk, high line count).
- Create `src/systems/badguys.js` to encapsulate the ship.
- Tackle `laser-storm.js` and `danger-beam.js` to clean up the hazard logic.
