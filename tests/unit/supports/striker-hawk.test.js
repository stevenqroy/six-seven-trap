
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as strikerHawk from '../../../src/supports/striker-hawk.js';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import * as harvester from '../../../src/enemies/harvester.js';
import * as skimmer from '../../../src/enemies/skimmer.js';

vi.mock('../../../src/enemies/harvester.js');
vi.mock('../../../src/enemies/skimmer.js');

const MOCK_STATE = { wCSS: 800, hCSS: 600 };

describe('Striker Hawk Support (S7R-053)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
    setFlag('supportStrikerHawk', true);
    strikerHawk.destroy();
    vi.useFakeTimers();
  });

  afterEach(() => {
    strikerHawk.destroy();
    resetFlags();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('gates behavior behind the supportStrikerHawk flag', () => {
    setFlag('supportStrikerHawk', false);
    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE);
    const debug = strikerHawk.serializeDebug();
    expect(debug.enabled).toBe(false);
    expect(debug.x).toBe(0);
    expect(debug.y).toBe(0);
  });

  it('selects harvester as higher priority target', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300 });
    skimmer.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300 });

    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE); // Enter orbit
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE); // Should target

    const debug = strikerHawk.serializeDebug();
    expect(debug.target.id).toBe('harvester');
  });

  it('selects skimmer if harvester is not available', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: false, hp: 0 });
    skimmer.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300 });

    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE);
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE);

    const debug = strikerHawk.serializeDebug();
    expect(debug.target.id).toBe('skimmer');
  });
  
  it('does not select a target if no enemies are present', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: false, hp: 0 });
    skimmer.serializeDebug.mockReturnValue({ enabled: false, hp: 0 });

    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE);
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE);

    const debug = strikerHawk.serializeDebug();
    expect(debug.target).toBe(null);
    expect(debug.lifecycleState).toBe('idle');
  });

  it('dive-strikes and calls onHit on the target', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300, w: 50, h: 50 });
    skimmer.serializeDebug.mockReturnValue({ enabled: false, hp: 0 });

    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE);
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE); // Target

    for (let i = 0; i < 10; i++) {
      strikerHawk.update(0.1, MOCK_STATE);
    }

    expect(harvester.onHit).toHaveBeenCalledWith({ damage: 5, interrupt: true });
  });

  it('enforces a cooldown between strikes', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300, w: 50, h: 50 });
    skimmer.serializeDebug.mockReturnValue({ enabled: false, hp: 0 });

    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE); // orbit
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE); // target

    // Complete the dive
    for (let i = 0; i < 10; i++) {
      strikerHawk.update(0.1, MOCK_STATE);
    }
    
    // Recover
    for (let i = 0; i < 30; i++) {
      strikerHawk.update(0.1, MOCK_STATE);
    }

    const debugAfterStrike = strikerHawk.serializeDebug();
    expect(debugAfterStrike.lifecycleState).toBe('idle');
    expect(harvester.onHit).toHaveBeenCalledTimes(1);

    // Try to strike again before cooldown
    strikerHawk.update(0.1, MOCK_STATE);
    const debugBeforeCooldown = strikerHawk.serializeDebug();
    expect(debugBeforeCooldown.target).toBe(null);
    
    vi.advanceTimersByTime(5000);
    strikerHawk.update(0.1, MOCK_STATE);
    const debugAfterCooldown = strikerHawk.serializeDebug();
    expect(debugAfterCooldown.target.id).toBe('harvester');
  });

  it('destroy() cleans up all state', () => {
    harvester.serializeDebug.mockReturnValue({ enabled: true, hp: 10, x: 400, y: 300 });
    strikerHawk.spawn();
    strikerHawk.update(0.1, MOCK_STATE);
    vi.advanceTimersByTime(2000);
    strikerHawk.update(0.1, MOCK_STATE);
    
    strikerHawk.destroy();

    const debug = strikerHawk.serializeDebug();
    expect(debug.lifecycleState).toBe('idle');
    expect(debug.target).toBe(null);
    expect(debug.x).toBe(0);
    expect(debug.y).toBe(0);
  });
});
