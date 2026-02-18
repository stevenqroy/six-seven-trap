import { describe, expect, it } from 'vitest';
import {
  createEnemyRegistry,
  EnemyManifestValidationError,
} from '../../../src/systems/enemy-registry.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const VALID_MANIFEST = {
  version: 1,
  enemies: [
    {
      id: 'skimmer-test',
      displayName: 'Skimmer Test',
      role: 'harasser',
      stats: { hp: 24, speed: 1.2, size: 0.8, threat: 2.1 },
      hurtbox: { x: 0.3, y: 0.25, w: 0.36, h: 0.4 },
      hitbox: { x: 0.2, y: 0.2, w: 0.5, h: 0.5 },
      anchors: {
        weapon: { x: 0.7, y: 0.5 },
        beam: { x: 0.62, y: 0.52 },
        core: { x: 0.5, y: 0.5 },
        exhaust: { x: 0.24, y: 0.56 },
      },
      abilities: [{ id: 'lateral-dash', type: 'movement', cooldownMs: 1200 }],
      telegraphProfile: { windupMs: 300, activeMs: 180, recoverMs: 420, dangerLevel: 2 },
      placeholderVisual: {
        shape: 'kite',
        palette: ['#7afcff', '#4dc3ff'],
        glow: { radius: 0.22, intensity: 0.8 },
      },
    },
    {
      id: 'bulwark-test',
      displayName: 'Bulwark Test',
      role: 'tank',
      stats: { hp: 48, speed: 0.75, size: 1.1, threat: 3.1 },
      hurtbox: { x: 0.24, y: 0.2, w: 0.46, h: 0.5 },
      hitbox: { x: 0.15, y: 0.15, w: 0.62, h: 0.64 },
      anchors: {
        weapon: { x: 0.66, y: 0.46 },
        beam: { x: 0.6, y: 0.54 },
        core: { x: 0.5, y: 0.5 },
        exhaust: { x: 0.22, y: 0.6 },
      },
      abilities: [{ id: 'fortify', type: 'defense', cooldownMs: 1500 }],
      telegraphProfile: { windupMs: 520, activeMs: 260, recoverMs: 640, dangerLevel: 3 },
      placeholderVisual: {
        shape: 'barge',
        palette: ['#f6b26b', '#e06666'],
        glow: { radius: 0.28, intensity: 0.9 },
      },
    },
  ],
};

describe('enemy registry (S7R-094)', () => {
  it('createEnemyRegistry creates a frozen registry from valid manifest', () => {
    const registry = createEnemyRegistry({
      manifest: clone(VALID_MANIFEST),
      source: 'inline-test-manifest',
    });

    expect(Object.isFrozen(registry)).toBe(true);
    expect(registry.source).toBe('inline-test-manifest');
    expect(registry.version).toBe(1);
    expect(registry.size).toBe(2);
  });

  it('throws EnemyManifestValidationError with diagnostics on invalid manifest', () => {
    let thrown = null;
    try {
      createEnemyRegistry({
        manifest: {
          version: 1,
          enemies: [{}],
        },
        source: 'broken-test-manifest',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EnemyManifestValidationError);
    expect(thrown.message).toContain('broken-test-manifest');
    expect(Array.isArray(thrown.diagnostics)).toBe(true);
    expect(thrown.diagnostics.length).toBeGreaterThan(0);
  });

  it('getById and has support valid, unknown, and non-string ids', () => {
    const registry = createEnemyRegistry({ manifest: clone(VALID_MANIFEST) });

    expect(registry.getById('skimmer-test')).toEqual(
      expect.objectContaining({ id: 'skimmer-test', role: 'harasser' })
    );
    expect(registry.getById('missing-enemy')).toBe(null);
    expect(registry.getById(123)).toBe(null);
    expect(registry.getById(undefined)).toBe(null);
    expect(registry.getById(null)).toBe(null);

    expect(registry.has('skimmer-test')).toBe(true);
    expect(registry.has('missing-enemy')).toBe(false);
    expect(registry.has(123)).toBe(false);
    expect(registry.has(undefined)).toBe(false);
    expect(registry.has(null)).toBe(false);
  });

  it('listByRole returns frozen role lists and shared frozen empty list fallback', () => {
    const registry = createEnemyRegistry({ manifest: clone(VALID_MANIFEST) });

    const harassers = registry.listByRole('harasser');
    expect(harassers).toHaveLength(1);
    expect(harassers[0].id).toBe('skimmer-test');
    expect(Object.isFrozen(harassers)).toBe(true);

    const unknownRoleA = registry.listByRole('unknown-role');
    const unknownRoleB = registry.listByRole('another-unknown-role');
    const unknownRoleNonString = registry.listByRole(999);
    expect(unknownRoleA).toEqual([]);
    expect(Object.isFrozen(unknownRoleA)).toBe(true);
    expect(unknownRoleA).toBe(unknownRoleB);
    expect(unknownRoleA).toBe(unknownRoleNonString);
  });

  it('getAll returns a frozen list of frozen enemy objects', () => {
    const registry = createEnemyRegistry({ manifest: clone(VALID_MANIFEST) });
    const enemies = registry.getAll();

    expect(enemies).toHaveLength(2);
    expect(Object.isFrozen(enemies)).toBe(true);
    expect(Object.isFrozen(enemies[0])).toBe(true);
    expect(Object.isFrozen(enemies[1])).toBe(true);
  });

  it('returned snapshots are immutable and cannot mutate registry state', () => {
    const registry = createEnemyRegistry({ manifest: clone(VALID_MANIFEST) });
    const enemies = registry.getAll();

    expect(() => {
      enemies.push({ id: 'intruder' });
    }).toThrow(TypeError);
    expect(() => {
      enemies[0].displayName = 'Mutated Enemy';
    }).toThrow(TypeError);

    const freshRead = registry.getAll();
    expect(freshRead.map((enemy) => enemy.id)).toEqual(['skimmer-test', 'bulwark-test']);
    expect(freshRead[0].displayName).toBe('Skimmer Test');
  });
});
