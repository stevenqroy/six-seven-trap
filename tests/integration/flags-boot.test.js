/**
 * Integration test for flags system boot (S7R-001)
 *
 * Tests that the game can boot with different flag configurations
 * without runtime crashes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFlags, setFlag, getAllFlags, resetFlags } from '../../src/config/flags.js';

describe('Flags Integration: Game Boot', () => {
  beforeEach(() => {
    // Mock DOM elements that the game expects
    global.document = {
      getElementById: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
      })),
      createElement: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
      })),
      head: {
        appendChild: vi.fn(),
      },
      body: {
        appendChild: vi.fn(),
      },
      addEventListener: vi.fn(),
    };

    global.window = {
      location: {
        origin: 'http://localhost',
        pathname: '/game',
        search: '',
      },
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    };

    resetFlags();
  });

  afterEach(() => {
    resetFlags();
  });

  it('should initialize flags with all defaults', () => {
    const flags = initFlags();

    expect(flags).toBeDefined();
    expect(typeof flags).toBe('object');
  });

  it('should boot with all flags disabled (default state)', () => {
    const flags = initFlags();
    const allDisabled = Object.values(flags).every(v => v === false);

    expect(allDisabled).toBe(true);
  });

  it('should boot with single flag enabled without error', () => {
    initFlags();

    expect(() => {
      setFlag('debugMode', true);
    }).not.toThrow();

    expect(setFlag('debugMode', true)).toBe(true);
  });

  it('should boot with multiple Phase 0 flags enabled', () => {
    initFlags();

    expect(() => {
      setFlag('deterministicRNG', true);
      setFlag('telemetry', true);
      setFlag('debugMode', true);
    }).not.toThrow();

    const flags = getAllFlags();
    expect(flags.deterministicRNG).toBe(true);
    expect(flags.telemetry).toBe(true);
    expect(flags.debugMode).toBe(true);
  });

  it('should boot with all Phase 1 flags enabled', () => {
    initFlags();

    const phase1Flags = [
      'mobileSafeAreas',
      'gestureArbitration',
      'accessibilitySettings',
      'adaptiveQuality',
    ];

    expect(() => {
      phase1Flags.forEach(flag => setFlag(flag, true));
    }).not.toThrow();

    const flags = getAllFlags();
    phase1Flags.forEach(flag => {
      expect(flags[flag]).toBe(true);
    });
  });

  it('should handle rapid flag toggling without crash', () => {
    initFlags();

    expect(() => {
      for (let i = 0; i < 10; i++) {
        setFlag('debugMode', i % 2 === 0);
        setFlag('telemetry', i % 3 === 0);
        setFlag('deterministicRNG', i % 2 === 1);
      }
    }).not.toThrow();
  });

  it('should preserve flag state across multiple reads', () => {
    initFlags();
    setFlag('debugMode', true);
    setFlag('telemetry', false);

    const flags1 = getAllFlags();
    const flags2 = getAllFlags();
    const flags3 = getAllFlags();

    expect(flags1.debugMode).toBe(true);
    expect(flags2.debugMode).toBe(true);
    expect(flags3.debugMode).toBe(true);
    expect(flags1.telemetry).toBe(false);
    expect(flags2.telemetry).toBe(false);
    expect(flags3.telemetry).toBe(false);
  });

  it('should maintain consistency after reset', () => {
    initFlags();
    setFlag('debugMode', true);
    setFlag('telemetry', true);

    resetFlags();

    const flags = getAllFlags();
    const allDefaults = Object.entries(flags).every(([, value]) => value === false);

    expect(allDefaults).toBe(true);
  });

  it('should handle all enemy flags being enabled', () => {
    initFlags();

    const enemyFlags = [
      'enemySkimmer',
      'enemyRamBrute',
      'enemyShieldOrbiter',
      'enemyHarvester',
      'enemySplitter',
      'enemyEMPDrone',
    ];

    expect(() => {
      enemyFlags.forEach(flag => setFlag(flag, true));
    }).not.toThrow();

    const flags = getAllFlags();
    enemyFlags.forEach(flag => {
      expect(flags[flag]).toBe(true);
    });
  });

  it('should handle all Guardian command flags being enabled', () => {
    initFlags();

    const guardianFlags = [
      'actionBar',
      'actionInputArbitration',
      'multiTouchAction',
      'buttonMappedPowers',
      'guardianActiveMoves',
      'commandEnergy',
      'supportFramework',
      'supportMedicFirefly',
      'supportBulwarkBot',
      'supportStrikerHawk',
    ];

    expect(() => {
      guardianFlags.forEach(flagName => setFlag(flagName, true));
    }).not.toThrow();

    const flags = getAllFlags();
    guardianFlags.forEach(flagName => {
      expect(flags[flagName]).toBe(true);
    });
  });

  it('should boot successfully with query string flags', () => {
    global.window.location.search = '?flags=debugMode:true,telemetry:1';

    const flags = initFlags();

    expect(flags.debugMode).toBe(true);
    expect(flags.telemetry).toBe(true);
  });

  it('should handle localStorage persistence', () => {
    const mockStorage = {};

    // Mock both global.localStorage and global.window.localStorage
    const mockGetItem = vi.fn((key) => mockStorage[key] || null);
    const mockSetItem = vi.fn((key, value) => {
      mockStorage[key] = value;
    });

    global.localStorage = {
      getItem: mockGetItem,
      setItem: mockSetItem,
    };

    initFlags();
    setFlag('debugMode', true);

    // Verify flag was saved to localStorage
    expect(mockSetItem).toHaveBeenCalled();

    // Get the saved value
    const savedData = mockStorage['s7r-flags'];
    expect(savedData).toBeDefined();
    expect(savedData).toContain('"debugMode":true');
  });

  it('should maintain flag count consistency', () => {
    const flags1 = initFlags();
    const count1 = Object.keys(flags1).length;

    resetFlags();

    const flags2 = initFlags();
    const count2 = Object.keys(flags2).length;

    expect(count1).toBe(count2);
    expect(count1).toBeGreaterThan(30); // We have many flags across phases
  });
});
