import { describe, expect, it } from 'vitest';
import { createSupportRegistry } from '../../../src/systems/support-registry.js';

describe('support registry (S7R-087)', () => {
  it('createSupportRegistry returns the expected frozen API surface', () => {
    const registry = createSupportRegistry();

    expect(Object.isFrozen(registry)).toBe(true);
    expect(typeof registry.registerSupportUnit).toBe('function');
    expect(typeof registry.getSupportUnit).toBe('function');
    expect(typeof registry.getAllSupportUnits).toBe('function');

    expect(registry.getSupportUnit('missing')).toBe(null);
    expect(registry.getAllSupportUnits()).toEqual([]);
  });

  it('registers support units and normalizes fields', () => {
    const registry = createSupportRegistry();
    const normalized = registry.registerSupportUnit({
      id: '  medic-firefly  ',
      displayName: '   ',
      summonCost: -50,
      cooldownMs: Number.POSITIVE_INFINITY,
      maxActive: 2.6,
      lifetime: 120,
    });

    expect(normalized).toEqual({
      id: 'medic-firefly',
      displayName: 'medic-firefly',
      summonCost: 0,
      cooldownMs: 0,
      maxActive: 3,
      lifetime: 250,
    });
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(registry.getSupportUnit('medic-firefly')).toBe(normalized);
  });

  it('supports registry bootstrap via units array and ignores invalid entries', () => {
    const registry = createSupportRegistry({
      units: [
        null,
        undefined,
        {},
        { id: '   ' },
        { id: 'striker-hawk', displayName: 'Striker Hawk', summonCost: 35 },
      ],
    });

    const units = registry.getAllSupportUnits();
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      id: 'striker-hawk',
      displayName: 'Striker Hawk',
      summonCost: 35,
      cooldownMs: 0,
      maxActive: 1,
      lifetime: 6000,
    });
  });

  it('overwrites duplicate IDs with the latest normalized entry', () => {
    const registry = createSupportRegistry();

    const first = registry.registerSupportUnit({
      id: 'medic-firefly',
      displayName: 'Medic Mk I',
      summonCost: 20,
    });
    const second = registry.registerSupportUnit({
      id: 'medic-firefly',
      displayName: 'Medic Mk II',
      summonCost: 30,
      cooldownMs: 1500,
    });

    expect(first).not.toBe(second);
    expect(registry.getSupportUnit('medic-firefly')).toEqual({
      id: 'medic-firefly',
      displayName: 'Medic Mk II',
      summonCost: 30,
      cooldownMs: 1500,
      maxActive: 1,
      lifetime: 6000,
    });
    expect(registry.getAllSupportUnits()).toHaveLength(1);
  });

  it('rejects invalid inputs gracefully', () => {
    const registry = createSupportRegistry();

    expect(registry.registerSupportUnit()).toBe(null);
    expect(registry.registerSupportUnit(null)).toBe(null);
    expect(registry.registerSupportUnit(undefined)).toBe(null);
    expect(registry.registerSupportUnit('bad-input')).toBe(null);
    expect(registry.registerSupportUnit({})).toBe(null);
    expect(registry.registerSupportUnit({ id: '   ' })).toBe(null);

    expect(registry.getSupportUnit(undefined)).toBe(null);
    expect(registry.getSupportUnit(null)).toBe(null);
    expect(registry.getSupportUnit(123)).toBe(null);
    expect(registry.getAllSupportUnits()).toEqual([]);
  });

  it('returns immutable snapshots that cannot corrupt internal state', () => {
    const registry = createSupportRegistry();
    registry.registerSupportUnit({ id: 'medic-firefly' });
    registry.registerSupportUnit({ id: 'striker-hawk' });

    const snapshot = registry.getAllSupportUnits();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);

    expect(() => {
      snapshot.push({ id: 'intruder' });
    }).toThrow(TypeError);
    expect(() => {
      snapshot[0].displayName = 'mutated';
    }).toThrow(TypeError);

    const afterMutationAttempt = registry.getAllSupportUnits();
    expect(afterMutationAttempt).toHaveLength(2);
    expect(afterMutationAttempt.map((unit) => unit.id)).toEqual(['medic-firefly', 'striker-hawk']);
    expect(afterMutationAttempt[0].displayName).toBe('medic-firefly');
  });
});
