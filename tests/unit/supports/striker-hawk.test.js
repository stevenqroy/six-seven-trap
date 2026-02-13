import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import * as strikerHawk from '../../../src/supports/striker-hawk.js';
import * as harvester from '../../../src/enemies/harvester.js';
import * as skimmer from '../../../src/enemies/skimmer.js';

vi.mock('../../../src/enemies/harvester.js');
vi.mock('../../../src/enemies/skimmer.js');

function createState({
  wCSS = 800,
  hCSS = 600,
} = {}) {
  return { wCSS, hCSS };
}

function createHarvesterSnapshot(overrides = {}) {
  return {
    enabled: true,
    hp: 30,
    x: 420,
    y: 240,
    ...overrides,
  };
}

function createSkimmerSnapshot(overrides = {}) {
  return {
    enabled: true,
    hp: 20,
    x: 380,
    y: 220,
    ...overrides,
  };
}

function runUpdates(seconds, state, step = 0.05) {
  const frames = Math.ceil(seconds / step);
  for (let i = 0; i < frames; i++) {
    strikerHawk.update(step, state);
  }
}

describe('striker hawk support (S7R-053 rewrite)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
    setFlag('supportRuntime', true);
    setFlag('supportStrikerHawk', true);
    strikerHawk.destroy();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot());
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot());
    harvester.onHit.mockImplementation(() => true);
    skimmer.onHit.mockImplementation(() => true);
  });

  afterEach(() => {
    strikerHawk.destroy();
    resetFlags();
    vi.clearAllMocks();
  });

  it('gates behavior behind the supportStrikerHawk flag', () => {
    setFlag('supportStrikerHawk', false);
    const state = createState();

    strikerHawk.spawn({ state });
    strikerHawk.update(0.2, state);

    const debug = strikerHawk.serializeDebug();
    expect(debug.enabled).toBe(false);
    expect(debug.lifecycleState).toBe('disabled');
    expect(debug.runtime).toBe(null);
    expect(debug.strikesCompleted).toBe(0);
  });

  it('selects harvester as higher-priority target', () => {
    const state = createState();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot());
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot());

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });

    strikerHawk.update(0.2, state);
    strikerHawk.update(0.05, state);

    const debug = strikerHawk.serializeDebug();
    expect(debug.targetId).toBe('harvester');
    expect(debug.targetThreat).toBe(3);
  });

  it('selects skimmer if harvester is unavailable', () => {
    const state = createState();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot({ enabled: false, hp: 0 }));
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot({ enabled: true, hp: 12 }));

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });

    strikerHawk.update(0.2, state);
    strikerHawk.update(0.05, state);

    const debug = strikerHawk.serializeDebug();
    expect(debug.targetId).toBe('skimmer');
    expect(debug.targetThreat).toBe(2);
  });

  it('does not target when no attackable enemies are present', () => {
    const state = createState();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot({ enabled: false, hp: 0 }));
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot({ enabled: false, hp: 0 }));

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });

    runUpdates(1.0, state);
    const debug = strikerHawk.serializeDebug();

    expect(debug.targetId).toBe(null);
    expect(debug.behaviorState).toBe('idle');
  });

  it('dive-strikes and calls onHit on the selected target', () => {
    const state = createState();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot({ x: 420, y: 140 }));
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot({ enabled: false, hp: 0 }));

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      damage: 7,
      diveSpeedPxPerSec: 1200,
      strikeRadiusPx: 58,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });

    for (let i = 0; i < 40 && harvester.onHit.mock.calls.length === 0; i++) {
      strikerHawk.update(0.05, state);
    }

    expect(harvester.onHit).toHaveBeenCalledWith({
      damage: 7,
      interrupt: true,
    });
    expect(strikerHawk.serializeDebug().strikesCompleted).toBeGreaterThanOrEqual(1);
  });

  it('enforces cooldown between strike cycles', () => {
    const state = createState();

    harvester.serializeDebug.mockReturnValue(createHarvesterSnapshot({ x: 420, y: 140 }));
    skimmer.serializeDebug.mockReturnValue(createSkimmerSnapshot({ enabled: false, hp: 0 }));

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      cooldownMs: 4000,
      diveSpeedPxPerSec: 1200,
      strikeRadiusPx: 58,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });

    for (let i = 0; i < 80 && harvester.onHit.mock.calls.length === 0; i++) {
      strikerHawk.update(0.05, state);
    }
    expect(harvester.onHit).toHaveBeenCalledTimes(1);

    runUpdates(3.5, state);
    expect(harvester.onHit).toHaveBeenCalledTimes(1);

    runUpdates(1.2, state);
    expect(harvester.onHit.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('destroy() resets runtime and transient state cleanly', () => {
    const state = createState();

    strikerHawk.spawn({
      state,
      initialCooldownMs: 0,
      getGuardianPosition: () => ({ x: 400, y: 120 }),
    });
    runUpdates(0.6, state);
    expect(strikerHawk.serializeDebug().runtime).not.toBe(null);

    strikerHawk.destroy();
    const debug = strikerHawk.serializeDebug();

    expect(debug.lifecycleState).toBe('despawned');
    expect(debug.behaviorState).toBe('idle');
    expect(debug.runtime).toBe(null);
    expect(debug.runtimeUnitId).toBe(null);
    expect(debug.targetId).toBe(null);
    expect(debug.x).toBe(0);
    expect(debug.y).toBe(0);
    expect(debug.orbitAngle).toBe(0);
    expect(debug.strikeCooldownMs).toBe(0);
    expect(debug.strikesCompleted).toBe(0);
    expect(debug.stateEnteredAtMs).toBe(0);
  });
});
