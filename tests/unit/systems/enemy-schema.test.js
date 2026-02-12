import { describe, it, expect } from 'vitest';
import {
  formatEnemyManifestErrors,
  validateEnemyManifest,
} from '../../../src/systems/enemy-schema.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const VALID_MANIFEST = {
  version: 1,
  enemies: [
    {
      id: 'skimmer',
      displayName: 'Skimmer',
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
      abilities: [
        { id: 'lateral-dash', type: 'movement', cooldownMs: 1200 },
      ],
      telegraphProfile: { windupMs: 300, activeMs: 180, recoverMs: 420, dangerLevel: 2 },
      placeholderVisual: {
        shape: 'kite',
        palette: ['#7afcff', '#4dc3ff'],
        glow: { radius: 0.22, intensity: 0.8 },
      },
    },
  ],
};

describe('enemy schema validation', () => {
  it('accepts valid enemy manifest entries', () => {
    const result = validateEnemyManifest(clone(VALID_MANIFEST));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.manifest).toBeTruthy();
    expect(result.manifest.enemies[0]).toEqual(
      expect.objectContaining({
        id: 'skimmer',
        role: 'harasser',
      })
    );
  });

  it('reports duplicate ids with entry-level diagnostics', () => {
    const manifest = clone(VALID_MANIFEST);
    manifest.enemies.push({
      ...manifest.enemies[0],
      displayName: 'Skimmer Copy',
    });

    const result = validateEnemyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.manifest).toBe(null);
    expect(result.errors.some((item) => item.fieldPath === 'enemies[1].id')).toBe(true);
    expect(result.errors.some((item) => item.message.includes('Duplicate enemy id'))).toBe(true);
  });

  it('rejects out-of-bounds anchor points and invalid danger level', () => {
    const manifest = clone(VALID_MANIFEST);
    manifest.enemies[0].anchors.core.x = 1.2;
    manifest.enemies[0].telegraphProfile.dangerLevel = 8;

    const result = validateEnemyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((item) => item.fieldPath === 'enemies[0].anchors.core.x')).toBe(true);
    expect(
      result.errors.some((item) => item.fieldPath === 'enemies[0].telegraphProfile.dangerLevel')
    ).toBe(true);
  });

  it('formats readable validation output for diagnostics', () => {
    const errorText = formatEnemyManifestErrors(
      [
        {
          entryId: 'skimmer',
          fieldPath: 'enemies[0].stats.hp',
          message: 'Expected value >= 1.',
        },
      ],
      { source: 'inline-test-manifest' }
    );

    expect(errorText).toContain('inline-test-manifest');
    expect(errorText).toContain('[skimmer] enemies[0].stats.hp');
  });
});
