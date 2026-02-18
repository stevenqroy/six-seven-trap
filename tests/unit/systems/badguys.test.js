import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBadguysBounds,
  pickBadguysTarget,
  updateBadguysFlight,
} from '../../../src/systems/badguys.js';
import { SCENE } from '../../../src/constants.js';
import * as progression from '../../../src/systems/progression.js';

describe('badguys system (S7R-095)', () => {
  // Mock progression system to control speed multiplier
  vi.mock('../../../src/systems/progression.js', () => ({
    getPhaseSpeedMultiplier: vi.fn(() => 1.5),
  }));

  const mockRng = vi.fn(() => 0.5);

  beforeEach(() => {
    mockRng.mockClear();
    vi.clearAllMocks();
  });

  describe('getBadguysBounds', () => {
    it('calculates bounds respecting viewport and side padding', () => {
      const drawW = 100;
      const drawH = 50;
      const viewW = 800;
      const viewH = 600;
      const overlay = { y: 20 };

      // sidePad = max(4, 800 * 0.006) = max(4, 4.8) = 4.8
      // minX = 4.8
      // maxX = max(4.8, 800 - 100 - 4.8) = 695.2
      // minY = max(6, 20) = 20
      // maxY = max(20, 600 * 0.72 - 50) = max(20, 432 - 50) = 382

      const bounds = getBadguysBounds(drawW, drawH, viewW, viewH, overlay);

      expect(bounds.minX).toBeCloseTo(4.8);
      expect(bounds.maxX).toBeCloseTo(695.2);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxY).toBeCloseTo(382);
    });

    it('handles small viewports gracefully', () => {
      const drawW = 100;
      const drawH = 50;
      const viewW = 100; // Viewport same width as badguy
      const viewH = 100;
      const overlay = { y: 0 };

      const bounds = getBadguysBounds(drawW, drawH, viewW, viewH, overlay);

      // sidePad = max(4, 0.6) = 4
      // minX = 4
      // maxX = max(4, 100 - 100 - 4) = 4 (clamped to minX)
      expect(bounds.minX).toBe(4);
      expect(bounds.maxX).toBe(4);
    });
  });

  describe('pickBadguysTarget', () => {
    it('picks a target within bounds using edge bias', () => {
      const flight = { targetX: 0, targetY: 0 };
      const bounds = { minX: 10, maxX: 110, minY: 20, maxY: 120 };
      
      // With rng() returning 0.5:
      // xT check: 0.5 < THRESHOLD (0.7) -> true. edgeBiasedUnit called.
      // yT check: 0.5 < THRESHOLD (0.55) -> true. edgeBiasedUnit called.
      // edgeBiasedUnit consumes 2 rng calls each.
      
      // Mock sequence for deterministic behavior
      // 1. x threshold check: 0.5 (true)
      // 2. edgeBiasedUnit X: sign check (0.5 >= 0.5? let's say 0.1 for positive), value (0.5)
      // 3. y threshold check: 0.5 (true)
      // 4. edgeBiasedUnit Y: sign check, value
      
      // Actually edgeBiasedUnit implementation:
      // export function edgeBiasedUnit(power, rng) {
      //   const sign = rng() < 0.5 ? -1 : 1;
      //   return 0.5 + sign * 0.5 * Math.pow(rng(), 1 / power);
      // }
      
      // Let's set up a specific sequence
      const seqRng = vi.fn()
        .mockReturnValueOnce(0.1) // x threshold check (pass)
        .mockReturnValueOnce(0.2) // x sign check (<0.5 -> -1)
        .mockReturnValueOnce(0.5) // x value
        .mockReturnValueOnce(0.1) // y threshold check (pass)
        .mockReturnValueOnce(0.8) // y sign check (>=0.5 -> 1)
        .mockReturnValueOnce(0.5); // y value

      pickBadguysTarget(flight, bounds, seqRng);

      expect(flight.targetX).toBeGreaterThanOrEqual(bounds.minX);
      expect(flight.targetX).toBeLessThanOrEqual(bounds.maxX);
      expect(flight.targetY).toBeGreaterThanOrEqual(bounds.minY);
      expect(flight.targetY).toBeLessThanOrEqual(bounds.maxY);
      expect(seqRng).toHaveBeenCalledTimes(6);
    });

    it('picks a target without edge bias when threshold check fails', () => {
      const flight = { targetX: 0, targetY: 0 };
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
      
      // Force threshold failures
      const seqRng = vi.fn()
        .mockReturnValueOnce(0.9) // x threshold check (fail)
        // x value taken directly -> needs another call? No, code says:
        // xT = rng() < THRESHOLD ? edgeBiasedUnit : rng()
        // Wait, if the first rng() call is the check, then the second branch needs another call?
        // Code: const xT = rng() < ... ? ... : rng();
        // But if I pass 0.9, it uses 0.9? No, `rng()` is a function call.
        // It calls it again.
        
        .mockReturnValueOnce(0.5) // x value (direct)
        .mockReturnValueOnce(0.9) // y threshold check (fail)
        .mockReturnValueOnce(0.5); // y value (direct)

      pickBadguysTarget(flight, bounds, seqRng);

      expect(flight.targetX).toBe(50); // 0 + 0.5 * 100
      expect(flight.targetY).toBe(50); // 0 + 0.5 * 100
    });
  });

  describe('updateBadguysFlight', () => {
    const defaultParams = {
      now: 1000,
      dt: 0.016,
      drawW: 50,
      drawH: 50,
      viewW: 800,
      viewH: 600,
      overlay: { y: 0, scale: 1 },
      bossPhase: 1,
    };

    it('initializes flight state on first run', () => {
      const flight = { initialized: false };
      const rng = vi.fn(() => 0.5);

      updateBadguysFlight(
        flight,
        defaultParams.now,
        0, // dt=0 ensures physics update doesn't change initial zero velocity
        defaultParams.drawW,
        defaultParams.drawH,
        defaultParams.viewW,
        defaultParams.viewH,
        defaultParams.overlay,
        defaultParams.bossPhase,
        rng
      );

      expect(flight.initialized).toBe(true);
      expect(flight.x).toBeDefined();
      expect(flight.y).toBeDefined();
      expect(flight.vx).toBe(0);
      expect(flight.vy).toBe(0);
      expect(flight.currentSpeed).toBe(SCENE.BADGUYS_INITIAL_SPEED);
      expect(flight.targetSpeed).toBe(SCENE.BADGUYS_INITIAL_TARGET_SPEED);
      expect(flight.nextRetargetAt).toBeGreaterThan(defaultParams.now);
    });

    it('updates position based on velocity and dt', () => {
      const flight = {
        initialized: true,
        x: 100,
        y: 100,
        vx: 100,
        vy: 50,
        targetX: 200,
        targetY: 200,
        currentSpeed: 100,
        targetSpeed: 100,
        swoopFreq: 0.001,
        swoopPhase: 0,
        swoopForce: 0, // Disable swoop for simple motion check
        nextRetargetAt: 2000,
        nextSpeedShiftAt: 2000,
      };
      
      const rng = vi.fn(() => 0.5);

      updateBadguysFlight(
        flight,
        defaultParams.now,
        0.1, // Large dt to see movement
        defaultParams.drawW,
        defaultParams.drawH,
        defaultParams.viewW,
        defaultParams.viewH,
        defaultParams.overlay,
        defaultParams.bossPhase,
        rng
      );

      // Expect movement
      // vx and vy are smoothed towards target, but should result in change
      expect(flight.x).not.toBe(100);
      expect(flight.y).not.toBe(100);
    });

    it('triggers retargeting when timer expires', () => {
      const flight = {
        initialized: true,
        x: 100, y: 100, vx: 0, vy: 0,
        targetX: 100, targetY: 100,
        currentSpeed: 100, targetSpeed: 100,
        swoopFreq: 0, swoopPhase: 0, swoopForce: 0,
        nextRetargetAt: 900, // Past
        nextSpeedShiftAt: 2000,
      };
      
      const rng = vi.fn(() => 0.5);
      // Spy on bounds to ensure they are calculated
      
      updateBadguysFlight(
        flight,
        1000, // now > nextRetargetAt
        0.016,
        defaultParams.drawW,
        defaultParams.drawH,
        defaultParams.viewW,
        defaultParams.viewH,
        defaultParams.overlay,
        defaultParams.bossPhase,
        rng
      );

      expect(flight.nextRetargetAt).toBeGreaterThan(1000);
      // target should have changed (or at least rng called to pick new one)
      expect(rng).toHaveBeenCalled(); 
    });

    it('triggers speed shift when timer expires', () => {
      const flight = {
        initialized: true,
        x: 100, y: 100, vx: 0, vy: 0,
        targetX: 100, targetY: 100,
        currentSpeed: 100, targetSpeed: 100,
        swoopFreq: 0, swoopPhase: 0, swoopForce: 0,
        nextRetargetAt: 2000,
        nextSpeedShiftAt: 900, // Past
      };
      
      const rng = vi.fn(() => 0.5);

      updateBadguysFlight(
        flight,
        1000, // now > nextSpeedShiftAt
        0.016,
        defaultParams.drawW,
        defaultParams.drawH,
        defaultParams.viewW,
        defaultParams.viewH,
        defaultParams.overlay,
        defaultParams.bossPhase,
        rng
      );

      expect(flight.nextSpeedShiftAt).toBeGreaterThan(1000);
      expect(progression.getPhaseSpeedMultiplier).toHaveBeenCalledWith(1);
    });

    it('bounces off walls', () => {
      // Setup flight outside bounds
      const flight = {
        initialized: true,
        x: -100, // Way left
        y: 100,
        vx: -50,
        vy: 0,
        targetX: 100, targetY: 100,
        currentSpeed: 100, targetSpeed: 100,
        swoopFreq: 0, swoopPhase: 0, swoopForce: 0,
        nextRetargetAt: 2000, nextSpeedShiftAt: 2000,
      };
      
      const rng = vi.fn(() => 0.5);

      updateBadguysFlight(
        flight,
        1000,
        0.016,
        defaultParams.drawW,
        defaultParams.drawH,
        defaultParams.viewW,
        defaultParams.viewH,
        defaultParams.overlay,
        defaultParams.bossPhase,
        rng
      );

      // Should be clamped into bounds
      const bounds = getBadguysBounds(50, 50, 800, 600, {y:0});
      expect(flight.x).toBe(bounds.minX);
      // Velocity should be flipped and boosted
      expect(flight.vx).toBeGreaterThan(0);
    });
  });
});
