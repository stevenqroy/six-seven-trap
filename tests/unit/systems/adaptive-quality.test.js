import { describe, it, expect } from 'vitest';
import {
  computeRecentWindowStats,
  createAdaptiveQualityGovernor,
} from '../../../src/systems/adaptive-quality.js';

describe('adaptive quality governor', () => {
  it('computes rolling window stats from recent frame samples', () => {
    const samples = [
      { ms: 12 },
      { ms: 14 },
      { ms: 20 },
      { ms: 18 },
      { ms: 16 },
    ];
    const stats = computeRecentWindowStats(samples, 50);

    expect(stats.ready).toBe(true);
    expect(stats.sampleCount).toBe(3);
    expect(stats.elapsedMs).toBe(54);
    expect(stats.avgMs).toBeCloseTo(18, 6);
  });

  it('downgrades under sustained lag and upgrades after recovery', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      tiers: {
        high: { maxParticles: 450 },
        medium: { maxParticles: 300 },
        low: { maxParticles: 180 },
      },
      downgradeAvgMs: 24,
      downgradeWindowMs: 200,
      upgradeAvgMs: 18,
      upgradeWindowMs: 400,
      minTierDwellMs: 250,
    });

    const events = [];
    let now = 0;

    for (let i = 0; i < 40; i++) {
      now += 30;
      const transition = governor.onFrame(30, now);
      if (transition) events.push(transition);
    }

    expect(governor.getTier()).toBe('low');
    expect(events.filter((item) => item.reason === 'downgrade').length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < 80; i++) {
      now += 14;
      const transition = governor.onFrame(14, now);
      if (transition) events.push(transition);
    }

    expect(governor.getTier()).toBe('high');
    expect(events.some((item) => item.reason === 'upgrade')).toBe(true);
  });

  it('resets to default tier when disabled', () => {
    let enabled = true;
    const governor = createAdaptiveQualityGovernor({
      enabled: () => enabled,
      initialTier: 'medium',
      tiers: {
        high: { maxParticles: 450 },
        medium: { maxParticles: 300 },
        low: { maxParticles: 180 },
      },
    });

    expect(governor.getTier()).toBe('medium');
    enabled = false;

    const transition = governor.onFrame(16, 16);
    expect(transition).toEqual({
      oldTier: 'medium',
      newTier: 'high',
      atMs: 16,
      reason: 'disabled',
      triggerAvgMs: null,
      triggerWindowMs: 0,
      sampleCount: 0,
    });
    expect(governor.getTier()).toBe('high');
    expect(governor.onFrame(16, 32)).toBe(null);
  });

  it('returns tier caps and supports explicit reset tier', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      tiers: {
        high: { maxParticles: 450 },
        medium: { maxParticles: 300 },
        low: { maxParticles: 180 },
      },
    });

    expect(governor.getCaps().maxParticles).toBe(450);
    governor.reset({ tier: 'medium', atMs: 10 });
    expect(governor.getTier()).toBe('medium');
    expect(governor.getCaps().maxParticles).toBe(300);
    governor.reset({ tier: 'low', atMs: 20 });
    expect(governor.getCaps().maxParticles).toBe(180);
  });
});
