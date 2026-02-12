import { describe, it, expect } from 'vitest';
import {
  createEnemyRegistry,
  EnemyManifestValidationError,
  loadDefaultEnemyRegistry,
} from '../../src/systems/enemy-registry.js';

describe('enemy registry boot integration', () => {
  it('loads default enemy manifest into runtime registry API', () => {
    const registry = loadDefaultEnemyRegistry();

    expect(registry.size).toBeGreaterThanOrEqual(2);
    expect(registry.getById('skimmer')).toEqual(
      expect.objectContaining({
        id: 'skimmer',
        role: 'harasser',
      })
    );
    expect(registry.listByRole('controller').length).toBeGreaterThanOrEqual(1);
    expect(registry.has('harvester')).toBe(true);
  });

  it('returns immutable enemy records from the registry', () => {
    const registry = loadDefaultEnemyRegistry();
    const enemy = registry.getById('skimmer');
    const baselineHp = enemy.stats.hp;

    try {
      enemy.stats.hp = 999;
    } catch {
      // Expected in strict mode for frozen objects.
    }

    expect(enemy.stats.hp).toBe(baselineHp);
  });

  it('throws clear diagnostics when manifest schema is invalid', () => {
    const invalidManifest = {
      version: 1,
      enemies: [
        {
          id: 'broken-entry',
          displayName: 'Broken',
          role: 'harasser',
          stats: { hp: 0, speed: 1, size: 1, threat: 1 },
        },
      ],
    };

    let captured = null;
    try {
      createEnemyRegistry({
        manifest: invalidManifest,
        source: 'inline-invalid-manifest',
      });
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(EnemyManifestValidationError);
    expect(captured.message).toContain('inline-invalid-manifest');
    expect(Array.isArray(captured.diagnostics)).toBe(true);
    expect(captured.diagnostics.length).toBeGreaterThan(0);
  });
});
