import { describe, it, expect } from 'vitest';
import { createRunRng } from '../../src/utils/rng.js';
import { loadDefaultEnemyRegistry } from '../../src/systems/enemy-registry.js';
import {
  createEnemyStateMachineRuntime,
  isEnemyLifecycleState,
} from '../../src/systems/enemy-state-machine.js';

function runDeterministicSoak(seed, {
  durationMs = 60000,
  dtMs = 16,
} = {}) {
  const registry = loadDefaultEnemyRegistry();
  const enemyIds = registry.getAll().map((enemy) => enemy.id);
  const rng = createRunRng({
    deterministic: true,
    seed,
  });

  let now = 0;
  let spawnCount = 0;
  let nextSpawnAt = 0;
  let nextKillAt = 550;

  const runtime = createEnemyStateMachineRuntime({
    enabled: true,
    now: () => now,
    getRegistry: () => registry,
  });

  while (now <= durationMs) {
    if (now >= nextSpawnAt) {
      const enemyId = enemyIds[rng.randomInt(enemyIds.length)];
      runtime.spawnFromRegistry(enemyId, {
        atMs: now,
        source: 'soak-test',
        metadata: { spawnCount },
      });
      spawnCount += 1;
      nextSpawnAt = now + 180 + Math.round(rng.randomRange(0, 260));
    }

    if (now >= nextKillAt) {
      const active = runtime.getEntities(now);
      if (active.length > 0) {
        const target = active[rng.randomInt(active.length)];
        runtime.markDead(target.runtimeId, {
          atMs: now,
          reason: 'scripted-kill',
        });
      }
      nextKillAt = now + 420 + Math.round(rng.randomRange(0, 420));
    }

    runtime.onFrame(dtMs, now);
    now += dtMs;
  }

  return {
    now,
    rngDrawCount: rng.getDrawCount(),
    entities: runtime.getEntities(now),
    debug: runtime.getDebugState(now),
  };
}

describe('enemy state machine deterministic soak', () => {
  it('keeps all active enemies in valid bounded lifecycle states over long simulation', () => {
    const result = runDeterministicSoak(7011, {
      durationMs: 90000,
      dtMs: 16,
    });

    expect(result.debug.totalSpawned).toBeGreaterThan(100);
    expect(result.debug.totalCleanups).toBeGreaterThan(80);
    expect(result.debug.invalidStateRecoveries).toBe(0);
    expect(result.debug.invalidTransitions).toBe(0);
    expect(result.debug.oldestLifetimeMs).toBeLessThanOrEqual(22000);
    expect(result.debug.oldestStateAgeMs).toBeLessThanOrEqual(6500);

    for (let i = 0; i < result.entities.length; i++) {
      const entity = result.entities[i];
      expect(isEnemyLifecycleState(entity.state)).toBe(true);
      expect(entity.lifetimeMs).toBeLessThanOrEqual(22000);
      expect(entity.stateAgeMs).toBeLessThanOrEqual(6500);
    }
  });

  it('produces repeatable lifecycle metrics for the same deterministic seed', () => {
    const runA = runDeterministicSoak(4242);
    const runB = runDeterministicSoak(4242);

    expect(runA.rngDrawCount).toBe(runB.rngDrawCount);
    expect(runA.debug).toEqual(runB.debug);
    expect(runA.entities).toEqual(runB.entities);
  });
});
