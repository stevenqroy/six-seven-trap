import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isGoodBeamNumber,
  isNumberInsideRegularBeam,
  triggerRegularBeamEruption,
} from '../../../src/systems/beam-harvest.js';

describe('beam harvest logic (S7R-097)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGoodBeamNumber', () => {
    it('returns true for non-trap 6 and 7', () => {
      expect(isGoodBeamNumber({ isTrap: false, txt: '6' })).toBe(true);
      expect(isGoodBeamNumber({ isTrap: false, txt: '7' })).toBe(true);
    });

    it('returns false for trap 6 and 7', () => {
      expect(isGoodBeamNumber({ isTrap: true, txt: '6' })).toBe(false);
      expect(isGoodBeamNumber({ isTrap: true, txt: '7' })).toBe(false);
    });

    it('returns false for other digits', () => {
      expect(isGoodBeamNumber({ isTrap: false, txt: '5' })).toBe(false);
      expect(isGoodBeamNumber({ isTrap: false, txt: '8' })).toBe(false);
      expect(isGoodBeamNumber({ isTrap: true, txt: '5' })).toBe(false);
    });
  });

  describe('isNumberInsideRegularBeam', () => {
    const portalState = {
      geo: {
        originX: 100,
        originY: 50,
        beamBottom: 250,
        beamHeight: 200,
        topWidth: 20,
        bottomWidth: 100,
      },
      chargeRatio: 0,
    };

    it('returns true for point inside the beam', () => {
      // Top section (narrow)
      expect(isNumberInsideRegularBeam({ x: 100, y: 55 }, portalState)).toBe(true);
      // Middle section (widening)
      expect(isNumberInsideRegularBeam({ x: 100, y: 150 }, portalState)).toBe(true);
      // Bottom section (wide)
      expect(isNumberInsideRegularBeam({ x: 100, y: 240 }, portalState)).toBe(true);
    });

    it('returns false for points outside the beam width', () => {
      // Top section (width ~20/2 * 0.42 = ~4.2)
      expect(isNumberInsideRegularBeam({ x: 120, y: 55 }, portalState)).toBe(false);
      // Bottom section (width ~100/2 * 0.42 = ~21)
      expect(isNumberInsideRegularBeam({ x: 150, y: 240 }, portalState)).toBe(false);
    });

    it('returns false for points above/below the beam vertically', () => {
      expect(isNumberInsideRegularBeam({ x: 100, y: 30 }, portalState)).toBe(false); // originY - 20
      expect(isNumberInsideRegularBeam({ x: 100, y: 270 }, portalState)).toBe(false); // beamBottom + 20
    });

    it('expands width when chargeRatio increases', () => {
      const chargedState = { ...portalState, chargeRatio: 1 };
      // Width multiplier: 0.42 + 0.1 * 1 = 0.52
      
      // Bottom width = 100
      // Inner radius = 100 * 0.52 = 52
      
      // With chargeRatio 0: 100 * 0.42 = 42
      
      // Point at x=145 (dist 45 from center 100)
      // Should fail at ratio 0 (45 > 42)
      expect(isNumberInsideRegularBeam({ x: 145, y: 240 }, portalState)).toBe(false);
      // Should pass at ratio 1 (45 < 52)
      expect(isNumberInsideRegularBeam({ x: 145, y: 240 }, chargedState)).toBe(true);
    });
  });

  describe('triggerRegularBeamEruption', () => {
    it('resets charge and populates eruptionNumbers', () => {
      const regularBeamHarvest = {
        target: 5,
        charge: 5,
        capturedDigits: ['6', '7', '6', '7', '6'],
        eruptionNumbers: [],
        flash: 0,
        eruptionFlash: 0,
      };
      
      const badguysRender = { ready: true, x: 100, y: 50, w: 50, h: 50 };
      const rng = vi.fn(() => 0.5);
      const onErupt = vi.fn();

      triggerRegularBeamEruption(
        1000,
        null,
        { regularBeamHarvest, badguysRender, rng, onErupt }
      );

      expect(regularBeamHarvest.charge).toBe(0);
      expect(regularBeamHarvest.capturedDigits.length).toBe(0);
      expect(regularBeamHarvest.eruptionNumbers.length).toBe(5);
      expect(regularBeamHarvest.flash).toBe(1);
      expect(regularBeamHarvest.eruptionFlash).toBe(1);
    });

    it('fills missing digits with random 6/7 if capture list is empty', () => {
      const regularBeamHarvest = {
        target: 3,
        charge: 3, // Full charge but no stored digits (e.g. debug fill)
        capturedDigits: [],
        eruptionNumbers: [],
        flash: 0,
        eruptionFlash: 0,
      };
      
      const badguysRender = { ready: true, x: 100, y: 50, w: 50, h: 50 };
      
      const rng = vi.fn()
        // Digit generation phase
        .mockReturnValueOnce(0.4) // Digit 1 -> '6'
        .mockReturnValueOnce(0.6) // Digit 2 -> '7'
        .mockReturnValueOnce(0.4); // Digit 3 -> '6'
      
      // For physics calls
      rng.mockImplementation(() => 0.5);

      triggerRegularBeamEruption(
        1000,
        null,
        { regularBeamHarvest, badguysRender, rng }
      );

      expect(regularBeamHarvest.eruptionNumbers.length).toBe(3);
      expect(regularBeamHarvest.eruptionNumbers[0].txt).toBe('6');
      expect(regularBeamHarvest.eruptionNumbers[1].txt).toBe('7');
      expect(regularBeamHarvest.eruptionNumbers[2].txt).toBe('6');
    });

    it('calls onErupt callback with coordinates', () => {
      const regularBeamHarvest = {
        target: 1,
        charge: 1,
        capturedDigits: ['6'],
        eruptionNumbers: [],
      };
      const badguysRender = { ready: true, x: 100, y: 50, w: 60, h: 60 };
      const rng = vi.fn(() => 0.5);
      const onErupt = vi.fn();

      // Mouth is at x + w*0.5, y + max(8, h*0.08)
      // x: 100 + 30 = 130
      // y: 50 + max(8, 4.8) = 58

      triggerRegularBeamEruption(
        1000,
        null,
        { regularBeamHarvest, badguysRender, rng, onErupt }
      );

      expect(onErupt).toHaveBeenCalledWith(expect.objectContaining({
        mouthX: 130,
        mouthY: 58,
        x: 130, // Fallback to mouthX if portalState is null
        y: 66,  // mouthY + 8
      }));
    });

    it('uses portalState coordinates if provided for onErupt', () => {
      const regularBeamHarvest = { target: 1, charge: 1, capturedDigits: ['6'], eruptionNumbers: [] };
      const badguysRender = { ready: true, x: 100, y: 50, w: 60, h: 60 };
      const rng = vi.fn(() => 0.5);
      const onErupt = vi.fn();
      const portalState = { x: 200, y: 200 };

      triggerRegularBeamEruption(
        1000,
        portalState,
        { regularBeamHarvest, badguysRender, rng, onErupt }
      );

      expect(onErupt).toHaveBeenCalledWith(expect.objectContaining({
        x: 200,
        y: 208, // portalState.y + 8
      }));
    });
  });
});
