import { describe, it, expect } from 'vitest';
import { createRunRng } from '../../src/utils/rng.js';

function simulateEventTimeline(seed, steps = 80) {
  const rng = createRunRng({ deterministic: true, seed });
  const events = [];

  for (let i = 0; i < steps; i++) {
    const spawnTrap = rng.random() < 0.27;
    const abilityRoll = rng.random();
    let ability = 'none';

    if (abilityRoll < 0.2) ability = 'shield';
    else if (abilityRoll < 0.4) ability = 'projectile';
    else if (abilityRoll < 0.58) ability = 'magnet';
    else if (abilityRoll < 0.72) ability = 'slam';

    const x = Math.round(rng.randomRange(44, 840));
    const y = Math.round(rng.randomRange(-180, 240));
    events.push(`${spawnTrap ? 'trap' : 'good'}:${ability}:${x},${y}`);
  }

  return events;
}

describe('seeded replay parity', () => {
  it('repeats identical event sequence for the same seed', () => {
    const runA = simulateEventTimeline(7777);
    const runB = simulateEventTimeline(7777);
    expect(runA).toEqual(runB);
  });

  it('changes event sequence for different seeds', () => {
    const runA = simulateEventTimeline(7777);
    const runB = simulateEventTimeline(8888);
    expect(runA).not.toEqual(runB);
  });
});
