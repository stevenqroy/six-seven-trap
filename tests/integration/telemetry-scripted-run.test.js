import { describe, it, expect } from 'vitest';
import { createTelemetrySystem } from '../../src/systems/telemetry.js';

function runScriptedTelemetryPass(seed) {
  const telemetry = createTelemetrySystem({ enabled: true });
  telemetry.beginRun({
    seed,
    deterministic: true,
    startedAtMs: 1000,
    reason: 'new-run',
  });

  const scriptedFrames = [16, 17, 18, 19, 20, 16, 15, 17];
  for (let i = 0; i < scriptedFrames.length; i++) {
    telemetry.onFrame(scriptedFrames[i]);
  }

  telemetry.onAbilityUsed('shield');
  telemetry.onAbilityUsed('projectile');
  telemetry.onAbilityUsed('slam');
  telemetry.onAbilityUsed('ultimate');

  telemetry.onLifeLost(2);
  telemetry.onLifeLost(1);
  telemetry.onLifeGained(2);

  telemetry.onShipDamage(2, 'bounce');
  telemetry.onShipDamage(5, 'projectile');
  telemetry.onShipDamage(20, 'ultimate');
  telemetry.onShipDamage(5, 'beam-eruption');

  telemetry.onPhaseTransition(1, 2, 2200);
  telemetry.onPhaseTransition(2, 3, 3400);
  telemetry.onPhaseTransition(3, 4, 4600);
  telemetry.onQualityTierChange({
    oldTier: 'high',
    newTier: 'medium',
    atMs: 3600,
    reason: 'downgrade',
    triggerAvgMs: 25.1,
    triggerWindowMs: 2000,
    sampleCount: 120,
  });

  telemetry.setRngDraws(144);

  return telemetry.finalizeRun({
    reason: 'game-over',
    endedAtMs: 7000,
    score: 41,
    bestCombo: 5,
    rngDraws: 144,
  });
}

describe('telemetry scripted run integration', () => {
  it('accumulates expected values for scripted gameplay', () => {
    const run = runScriptedTelemetryPass(2026);

    expect(run.outcome).toBe('game-over');
    expect(run.elapsedMs).toBe(6000);
    expect(run.score).toBe(41);
    expect(run.bestCombo).toBe(5);
    expect(run.rngDraws).toBe(144);
    expect(run.livesLost).toBe(2);
    expect(run.livesGained).toBe(1);
    expect(run.remainingLives).toBe(2);
    expect(run.abilityUses.shield).toBe(1);
    expect(run.abilityUses.projectile).toBe(1);
    expect(run.abilityUses.slam).toBe(1);
    expect(run.abilityUses.ultimate).toBe(1);
    expect(run.shipDamageTotal).toBe(32);
    expect(run.shipDamageBySource.bounce).toBe(2);
    expect(run.shipDamageBySource.projectile).toBe(5);
    expect(run.shipDamageBySource.ultimate).toBe(20);
    expect(run.shipDamageBySource['beam-eruption']).toBe(5);
    expect(run.phaseTransitions).toEqual([
      { oldPhase: 1, newPhase: 2, atMs: 2200 },
      { oldPhase: 2, newPhase: 3, atMs: 3400 },
      { oldPhase: 3, newPhase: 4, atMs: 4600 },
    ]);
    expect(run.qualityTransitions).toEqual([
      {
        oldTier: 'high',
        newTier: 'medium',
        atMs: 3600,
        reason: 'downgrade',
        triggerAvgMs: 25.1,
        triggerWindowMs: 2000,
        sampleCount: 120,
      },
    ]);
    expect(run.frame.frames).toBe(8);
  });

  it('replays scripted run with identical summary on same seed', () => {
    const runA = runScriptedTelemetryPass(77);
    const runB = runScriptedTelemetryPass(77);

    expect(runA).toEqual(runB);
  });
});
