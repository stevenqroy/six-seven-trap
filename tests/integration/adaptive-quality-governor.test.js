import { describe, it, expect } from 'vitest';
import { ADAPTIVE_QUALITY } from '../../src/constants.js';
import { createAdaptiveQualityGovernor } from '../../src/systems/adaptive-quality.js';
import { createTelemetrySystem } from '../../src/systems/telemetry.js';

describe('adaptive quality governor integration', () => {
  it('records quality transitions during stress and recovery windows', () => {
    const telemetry = createTelemetrySystem({ enabled: true });
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      initialTier: ADAPTIVE_QUALITY.DEFAULT_TIER,
      downgradeAvgMs: ADAPTIVE_QUALITY.DOWNGRADE_AVG_MS,
      downgradeWindowMs: ADAPTIVE_QUALITY.DOWNGRADE_WINDOW_MS,
      upgradeAvgMs: ADAPTIVE_QUALITY.UPGRADE_AVG_MS,
      upgradeWindowMs: ADAPTIVE_QUALITY.UPGRADE_WINDOW_MS,
      minTierDwellMs: ADAPTIVE_QUALITY.MIN_TIER_DWELL_MS,
      tiers: ADAPTIVE_QUALITY.TIERS,
    });

    telemetry.beginRun({
      seed: 77,
      deterministic: true,
      startedAtMs: 0,
      reason: 'stress-pass',
    });

    let now = 0;
    for (let i = 0; i < 240; i++) {
      now += 30;
      telemetry.onFrame(30);
      const transition = governor.onFrame(30, now);
      if (transition) telemetry.onQualityTierChange(transition);
    }

    expect(['medium', 'low']).toContain(governor.getTier());

    for (let i = 0; i < 420; i++) {
      now += 16;
      telemetry.onFrame(16);
      const transition = governor.onFrame(16, now);
      if (transition) telemetry.onQualityTierChange(transition);
    }

    const run = telemetry.finalizeRun({
      reason: 'reset',
      endedAtMs: now,
      score: 0,
      bestCombo: 0,
      rngDraws: 0,
    });

    expect(run.qualityTransitions.length).toBeGreaterThanOrEqual(2);
    expect(run.qualityTransitions.some((item) => item.reason === 'downgrade')).toBe(true);
    expect(run.qualityTransitions.some((item) => item.reason === 'upgrade')).toBe(true);
    expect(run.qualityTransitions[0].oldTier).toBe('high');
    expect(run.qualityTransitions[run.qualityTransitions.length - 1].newTier).toBe('high');
  });
});
