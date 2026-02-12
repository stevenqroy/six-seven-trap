import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import {
  createSupportRuntime,
  SUPPORT_LIFECYCLE_STATES,
} from '../../../src/systems/support-runtime.js';

function createClock(startAt = 0) {
  let current = startAt;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
      return current;
    },
  };
}

describe('support runtime (S7R-050)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
  });

  afterEach(() => {
    resetFlags();
  });

  it('spawns a support unit and reports it as active', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxUnits: 2,
      maxLifetimeMs: 5000,
    });

    const spawned = runtime.spawnUnit({
      unitId: 'medic-firefly',
      atMs: clock.now(),
      lifetime: 2000,
      metadata: { lane: 'left' },
    });
    expect(spawned.runtimeId).toBe('support-1');
    expect(spawned.state).toBe(SUPPORT_LIFECYCLE_STATES.SPAWNING);

    clock.advance(200);
    runtime.onFrame(200, clock.now());
    const units = runtime.getActiveUnits(clock.now());

    expect(units.length).toBe(1);
    expect(units[0].unitId).toBe('medic-firefly');
    expect(units[0].state).toBe(SUPPORT_LIFECYCLE_STATES.ACTIVE);
    expect(units[0].metadata).toEqual({ lane: 'left' });
  });

  it('auto-expires units after lifetime and removes them from active set', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxLifetimeMs: 5000,
    });

    runtime.spawnUnit({
      unitId: 'striker-hawk',
      atMs: clock.now(),
      lifetime: 700,
    });

    clock.advance(750);
    runtime.onFrame(750, clock.now());

    expect(runtime.getActiveUnits(clock.now())).toEqual([]);
    const debug = runtime.getDebugState(clock.now());
    expect(debug.totalDespawns).toBe(1);
    expect(debug.totalCleanups).toBe(1);
  });

  it('enforces max unit cap', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxUnits: 1,
    });

    const first = runtime.spawnUnit({ unitId: 'unit-a', atMs: clock.now() });
    const second = runtime.spawnUnit({ unitId: 'unit-b', atMs: clock.now() });

    expect(first).toBeTruthy();
    expect(second).toBe(null);
    expect(runtime.getActiveUnits(clock.now()).length).toBe(1);
  });

  it('reset clears all runtime state', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxUnits: 3,
    });

    runtime.spawnUnit({ unitId: 'unit-a', atMs: clock.now() });
    runtime.spawnUnit({ unitId: 'unit-b', atMs: clock.now() });
    expect(runtime.getActiveUnits(clock.now()).length).toBe(2);

    runtime.reset({ atMs: clock.now() });

    expect(runtime.getActiveUnits(clock.now())).toEqual([]);
    const debug = runtime.getDebugState(clock.now());
    expect(debug.totalSpawned).toBe(0);
    expect(debug.activeCount).toBe(0);
  });

  it('despawnUnit removes a specific unit by runtime id', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxUnits: 3,
    });

    const first = runtime.spawnUnit({ unitId: 'unit-a', atMs: clock.now() });
    const second = runtime.spawnUnit({ unitId: 'unit-b', atMs: clock.now() });

    expect(runtime.despawnUnit(first.runtimeId, { atMs: clock.now(), reason: 'test-remove' })).toBe(true);
    const units = runtime.getActiveUnits(clock.now());
    expect(units.length).toBe(1);
    expect(units[0].runtimeId).toBe(second.runtimeId);
    expect(runtime.despawnUnit('support-missing', { atMs: clock.now() })).toBe(false);
  });

  it('gates spawns behind supportRuntime flag', () => {
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
    });

    setFlag('supportRuntime', false);
    expect(runtime.spawnUnit({ unitId: 'blocked', atMs: clock.now() })).toBe(null);

    setFlag('supportRuntime', true);
    expect(runtime.spawnUnit({ unitId: 'allowed', atMs: clock.now() })).toBeTruthy();
  });

  it('getDebugState returns serializable runtime diagnostics', () => {
    setFlag('supportRuntime', true);
    const clock = createClock(0);
    const runtime = createSupportRuntime({
      enabled: true,
      now: clock.now,
      maxUnits: 2,
      maxLifetimeMs: 3000,
    });

    runtime.spawnUnit({
      unitId: 'bulwark-bot',
      atMs: clock.now(),
      lifetime: 1500,
      metadata: { rank: 2 },
    });
    clock.advance(180);
    runtime.onFrame(180, clock.now());

    const debug = runtime.getDebugState(clock.now());
    expect(debug.enabled).toBe(true);
    expect(debug.activeCount).toBe(1);
    expect(debug.byState).toHaveProperty('active');
    expect(debug.totalSpawned).toBe(1);
    expect(() => JSON.stringify(debug)).not.toThrow();
  });
});
