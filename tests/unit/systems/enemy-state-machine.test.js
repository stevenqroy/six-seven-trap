import { describe, it, expect } from 'vitest';
import {
  createEnemyStateMachineRuntime,
  ENEMY_LIFECYCLE_STATES,
} from '../../../src/systems/enemy-state-machine.js';

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

function firstState(runtime, now) {
  const entities = runtime.getEntities(now);
  return entities.length ? entities[0].state : null;
}

describe('enemy state machine runtime', () => {
  it('progresses through timed lifecycle states and loops back to windup', () => {
    const clock = createClock(0);
    const runtime = createEnemyStateMachineRuntime({
      enabled: true,
      now: clock.now,
    });

    runtime.spawnEnemy({
      enemyId: 'skimmer',
      atMs: clock.now(),
      lifecycle: {
        spawnMs: 10,
        windupMs: 20,
        activeMs: 30,
        recoverMs: 40,
        idleMs: 50,
      },
    });

    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.SPAWN);

    clock.advance(10);
    runtime.onFrame(10, clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.WINDUP);

    clock.advance(20);
    runtime.onFrame(20, clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.ACTIVE);

    clock.advance(30);
    runtime.onFrame(30, clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.RECOVER);

    clock.advance(40);
    runtime.onFrame(40, clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.IDLE);

    clock.advance(50);
    runtime.onFrame(50, clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.WINDUP);
  });

  it('forces recovery when a state exceeds its timeout window', () => {
    const clock = createClock(0);
    const runtime = createEnemyStateMachineRuntime({
      enabled: true,
      now: clock.now,
      maxLifetimeMs: 60000,
    });

    const spawned = runtime.spawnEnemy({
      enemyId: 'timeout-target',
      atMs: clock.now(),
      initialState: ENEMY_LIFECYCLE_STATES.ACTIVE,
      lifecycle: {
        activeMs: 5000,
        recoverMs: 400,
        idleMs: 600,
      },
      stateTimeouts: {
        active: 300,
      },
    });

    expect(spawned).toBeTruthy();
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.ACTIVE);

    clock.advance(350);
    runtime.onFrame(350, clock.now());

    const debug = runtime.getDebugState(clock.now());
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.RECOVER);
    expect(debug.forcedRecoveries).toBe(1);
  });

  it('applies fail-safe transition when manual transition is invalid', () => {
    const clock = createClock(0);
    const runtime = createEnemyStateMachineRuntime({
      enabled: true,
      now: clock.now,
    });

    const entity = runtime.spawnEnemy({
      enemyId: 'invalid-transition',
      atMs: clock.now(),
      initialState: ENEMY_LIFECYCLE_STATES.SPAWN,
    });

    const changed = runtime.transition(entity.runtimeId, ENEMY_LIFECYCLE_STATES.IDLE, {
      atMs: clock.now(),
      reason: 'invalid-test',
    });

    expect(changed).toBe(true);
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.RECOVER);
    expect(runtime.getDebugState(clock.now()).invalidTransitions).toBe(1);
  });

  it('cleans dead entities and removes them from active runtime set', () => {
    const clock = createClock(0);
    const runtime = createEnemyStateMachineRuntime({
      enabled: true,
      now: clock.now,
    });

    const spawned = runtime.spawnEnemy({
      enemyId: 'cleanup-target',
      atMs: clock.now(),
    });

    expect(runtime.markDead(spawned.runtimeId, { atMs: clock.now() })).toBe(true);
    expect(firstState(runtime, clock.now())).toBe(ENEMY_LIFECYCLE_STATES.DEAD);

    clock.advance(1200);
    runtime.onFrame(1200, clock.now());

    const debug = runtime.getDebugState(clock.now());
    expect(runtime.getEntities(clock.now())).toEqual([]);
    expect(debug.deadStateCleanups).toBeGreaterThanOrEqual(1);
    expect(debug.totalCleanups).toBeGreaterThanOrEqual(1);
  });

  it('resets active entities immediately when feature flag is disabled', () => {
    const clock = createClock(0);
    let enabled = true;
    const runtime = createEnemyStateMachineRuntime({
      enabled: () => enabled,
      now: clock.now,
    });

    runtime.spawnEnemy({
      enemyId: 'flag-reset',
      atMs: clock.now(),
    });
    expect(runtime.getEntities(clock.now()).length).toBe(1);

    enabled = false;
    clock.advance(16);
    runtime.onFrame(16, clock.now());

    const debug = runtime.getDebugState(clock.now());
    expect(runtime.getEntities(clock.now()).length).toBe(0);
    expect(debug.enabled).toBe(false);
  });
});
