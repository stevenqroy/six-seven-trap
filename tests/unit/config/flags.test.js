/**
 * Unit tests for feature flags system (S7R-001)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initFlags,
  getFlag,
  setFlag,
  toggleFlag,
  getAllFlags,
  resetFlags,
  getFlagMetadata,
  exportFlagURL,
} from '../../../src/config/flags.js';

describe('Feature Flags System', () => {
  let originalLocation;
  let originalLocalStorage;

  beforeEach(() => {
    // Mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = {
      origin: 'http://localhost',
      pathname: '/game',
      search: '',
    };

    // Mock localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    // Mock window event dispatcher
    window.dispatchEvent = vi.fn();

    // Reset flags before each test
    resetFlags();
  });

  afterEach(() => {
    window.location = originalLocation;
    global.localStorage = originalLocalStorage;
  });

  describe('initFlags', () => {
    it('should initialize with default flag values', () => {
      const flags = initFlags();

      expect(flags).toBeDefined();
      expect(flags.debugMode).toBe(false);
      expect(flags.deterministicRNG).toBe(false);
      expect(flags.telemetry).toBe(false);
    });

    it('should parse flags from query string', () => {
      window.location.search = '?flags=debugMode:true,telemetry:1';

      const flags = initFlags();

      expect(flags.debugMode).toBe(true);
      expect(flags.telemetry).toBe(true);
    });

    it('should ignore invalid query string formats', () => {
      window.location.search = '?flags=invalidFormat';

      const flags = initFlags();

      expect(flags.debugMode).toBe(false);
    });

    it('should parse flags from localStorage', () => {
      global.localStorage.getItem.mockReturnValue(
        JSON.stringify({ debugMode: true, telemetry: true })
      );

      const flags = initFlags();

      expect(flags.debugMode).toBe(true);
      expect(flags.telemetry).toBe(true);
    });

    it('should prioritize query string over localStorage', () => {
      global.localStorage.getItem.mockReturnValue(
        JSON.stringify({ debugMode: false })
      );
      window.location.search = '?flags=debugMode:true';

      const flags = initFlags();

      expect(flags.debugMode).toBe(true);
    });

    it('should expose global API functions', () => {
      initFlags();

      expect(window.getFlag).toBeDefined();
      expect(window.setFlag).toBeDefined();
      expect(window.getAllFlags).toBeDefined();
      expect(window.resetFlags).toBeDefined();
      expect(window.toggleFlag).toBeDefined();
    });
  });

  describe('getFlag', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should return flag value', () => {
      expect(getFlag('debugMode')).toBe(false);
    });

    it('should warn on unknown flag', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const result = getFlag('unknownFlag');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown flag: unknownFlag')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('setFlag', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should set flag value', () => {
      const result = setFlag('debugMode', true);

      expect(result).toBe(true);
      expect(getFlag('debugMode')).toBe(true);
    });

    it('should convert value to boolean', () => {
      setFlag('debugMode', 'true');
      expect(getFlag('debugMode')).toBe(true);

      setFlag('debugMode', 0);
      expect(getFlag('debugMode')).toBe(false);

      setFlag('debugMode', 1);
      expect(getFlag('debugMode')).toBe(true);
    });

    it('should save to localStorage', () => {
      setFlag('debugMode', true);

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        's7r-flags',
        expect.stringContaining('"debugMode":true')
      );
    });

    it('should dispatch flagchange event', () => {
      setFlag('debugMode', true);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'flagchange',
        })
      );
    });

    it('should return false for unknown flag', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const result = setFlag('unknownFlag', true);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('toggleFlag', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should toggle flag from false to true', () => {
      expect(getFlag('debugMode')).toBe(false);

      toggleFlag('debugMode');

      expect(getFlag('debugMode')).toBe(true);
    });

    it('should toggle flag from true to false', () => {
      setFlag('debugMode', true);

      toggleFlag('debugMode');

      expect(getFlag('debugMode')).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should return all flag values', () => {
      const flags = getAllFlags();

      expect(flags).toBeDefined();
      expect(flags.debugMode).toBe(false);
      expect(flags.deterministicRNG).toBe(false);
      expect(Object.keys(flags).length).toBeGreaterThan(0);
    });

    it('should return a copy, not reference', () => {
      const flags1 = getAllFlags();
      const flags2 = getAllFlags();

      expect(flags1).not.toBe(flags2);
      expect(flags1).toEqual(flags2);
    });
  });

  describe('resetFlags', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should reset all flags to defaults', () => {
      setFlag('debugMode', true);
      setFlag('telemetry', true);

      resetFlags();

      expect(getFlag('debugMode')).toBe(false);
      expect(getFlag('telemetry')).toBe(false);
    });

    it('should save reset state to localStorage', () => {
      resetFlags();

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        's7r-flags',
        expect.any(String)
      );
    });

    it('should dispatch flagsreset event', () => {
      resetFlags();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'flagsreset',
        })
      );
    });
  });

  describe('getFlagMetadata', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should return metadata with defaults, active, and modified flags', () => {
      setFlag('debugMode', true);

      const metadata = getFlagMetadata();

      expect(metadata.defaults).toBeDefined();
      expect(metadata.active).toBeDefined();
      expect(metadata.modified).toBeDefined();
      expect(metadata.defaults.debugMode).toBe(false);
      expect(metadata.active.debugMode).toBe(true);
      expect(metadata.modified.debugMode).toBe(true);
    });

    it('should only include modified flags in modified object', () => {
      setFlag('debugMode', true);

      const metadata = getFlagMetadata();

      expect(Object.keys(metadata.modified)).toContain('debugMode');
      expect(Object.keys(metadata.modified)).not.toContain('telemetry');
    });
  });

  describe('exportFlagURL', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should return base URL when no flags are modified', () => {
      const url = exportFlagURL();

      expect(url).toBe('http://localhost/game');
    });

    it('should include modified flags in URL', () => {
      setFlag('debugMode', true);
      setFlag('telemetry', true);

      const url = exportFlagURL();

      expect(url).toContain('?flags=');
      expect(url).toContain('debugMode:true');
      expect(url).toContain('telemetry:true');
    });

    it('should not include unmodified flags', () => {
      setFlag('debugMode', true);

      const url = exportFlagURL();

      expect(url).toContain('debugMode:true');
      expect(url).not.toContain('telemetry');
    });
  });

  describe('Default flag contract', () => {
    beforeEach(() => {
      initFlags();
    });

    it('should have all Phase 0 flags defined', () => {
      expect(getFlag('deterministicRNG')).toBeDefined();
      expect(getFlag('telemetry')).toBeDefined();
      expect(getFlag('debugMode')).toBeDefined();
    });

    it('should have all Phase 1 flags defined', () => {
      expect(getFlag('mobileSafeAreas')).toBeDefined();
      expect(getFlag('gestureArbitration')).toBeDefined();
      expect(getFlag('accessibilitySettings')).toBeDefined();
      expect(getFlag('adaptiveQuality')).toBeDefined();
    });

    it('should have all Phase 2 flags defined', () => {
      expect(getFlag('enemyRegistry')).toBeDefined();
      expect(getFlag('enemyStateMachine')).toBeDefined();
      expect(getFlag('placeholderRenderer')).toBeDefined();
      expect(getFlag('waveDirector')).toBeDefined();
      expect(getFlag('spawnValidator')).toBeDefined();
    });

    it('should have all Phase 6 Guardian flags defined', () => {
      expect(getFlag('actionBar')).toBeDefined();
      expect(getFlag('actionInputArbitration')).toBeDefined();
      expect(getFlag('multiTouchAction')).toBeDefined();
      expect(getFlag('buttonMappedPowers')).toBeDefined();
      expect(getFlag('guardianActiveMoves')).toBeDefined();
      expect(getFlag('commandEnergy')).toBeDefined();
      expect(getFlag('supportFramework')).toBeDefined();
    });

    it('should default all flags to false for safety', () => {
      const flags = getAllFlags();
      const allFalse = Object.values(flags).every(value => value === false);

      expect(allFalse).toBe(true);
    });
  });
});
