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

  it('computeRecentWindowStats handles empty and insufficient-duration windows', () => {
    const empty = computeRecentWindowStats([], 300);
    expect(empty.ready).toBe(false);
    expect(empty.sampleCount).toBe(0);
    expect(empty.elapsedMs).toBe(0);
    expect(empty.avgMs).toBe(0);

    const insufficient = computeRecentWindowStats([{ ms: 100 }, { ms: 80 }], 300);
    expect(insufficient.ready).toBe(false);
    expect(insufficient.sampleCount).toBe(2);
    expect(insufficient.elapsedMs).toBe(180);
    expect(insufficient.avgMs).toBeCloseTo(90, 6);
  });

  it('onFrame ignores zero/negative/non-finite frame times', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
    });

    expect(governor.onFrame(0, 10)).toBe(null);
    expect(governor.onFrame(-5, 20)).toBe(null);
    expect(governor.onFrame(Number.NaN, 30)).toBe(null);

    const debug = governor.getDebugState(40);
    expect(debug.sampleCount).toBe(0);
    expect(debug.sampledDurationMs).toBe(0);
  });

  it('prevents tier transitions during dwell period under sustained lag', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      downgradeAvgMs: 24,
      downgradeWindowMs: 250,
      minTierDwellMs: 1000,
    });

    expect(governor.getTier()).toBe('high');
    expect(governor.onFrame(300, 200)).toBe(null);
    expect(governor.onFrame(300, 400)).toBe(null);
    expect(governor.onFrame(300, 800)).toBe(null);
    expect(governor.getTier()).toBe('high');

    const transition = governor.onFrame(300, 1200);
    expect(transition).toEqual({
      oldTier: 'high',
      newTier: 'medium',
      atMs: 1200,
      reason: 'downgrade',
      triggerAvgMs: expect.any(Number),
      triggerWindowMs: 250,
      sampleCount: expect.any(Number),
    });
    expect(governor.getTier()).toBe('medium');
  });

  it('resets dwell timer and clears samples when re-enabled after disabled state', () => {
    let enabled = true;
    const governor = createAdaptiveQualityGovernor({
      enabled: () => enabled,
      downgradeAvgMs: 24,
      downgradeWindowMs: 250,
      minTierDwellMs: 1000,
    });

    governor.onFrame(16, 100);
    governor.onFrame(16, 200);
    expect(governor.getDebugState(250).sampleCount).toBeGreaterThan(0);

    enabled = false;
    expect(governor.onFrame(16, 300)).toBe(null);
    const disabledDebug = governor.getDebugState(350);
    expect(disabledDebug.enabled).toBe(false);
    expect(disabledDebug.sampleCount).toBe(0);
    expect(disabledDebug.sampledDurationMs).toBe(0);

    enabled = true;
    expect(governor.onFrame(300, 5000)).toBe(null);
    const reenabledDebug = governor.getDebugState(5000);
    expect(governor.getTier()).toBe('high');
    expect(reenabledDebug.enabled).toBe(true);
    expect(reenabledDebug.sampleCount).toBe(1);
    expect(reenabledDebug.msSinceTierChange).toBe(0);
  });

  it('applies shadow blur defaults by tier and forces maxShadowBlur to 0 when disabled', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      tiers: {
        high: {},
        medium: {},
        low: {
          shadowBlurEnabled: false,
          maxShadowBlur: 999,
        },
      },
    });

    expect(governor.getCaps().shadowBlurEnabled).toBe(true);
    expect(governor.getCaps().maxShadowBlur).toBe(18);

    governor.reset({ tier: 'medium', atMs: 10 });
    expect(governor.getCaps().shadowBlurEnabled).toBe(true);
    expect(governor.getCaps().maxShadowBlur).toBe(10);

    governor.reset({ tier: 'low', atMs: 20 });
    expect(governor.getCaps().shadowBlurEnabled).toBe(false);
    expect(governor.getCaps().maxShadowBlur).toBe(0);
  });

  it('hard-caps ember and sizzle caps in getCaps', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      tiers: {
        high: {
          maxDangerEmbers: 900,
          maxDangerSizzles: 999,
        },
        medium: {
          maxDangerEmbers: 250,
          maxDangerSizzles: 120,
        },
        low: {},
      },
    });

    const highCaps = governor.getCaps();
    expect(highCaps.maxDangerEmbers).toBe(300);
    expect(highCaps.maxDangerSizzles).toBe(150);
    governor.reset({ tier: 'medium', atMs: 10 });
    const mediumCaps = governor.getCaps();
    expect(mediumCaps.maxDangerEmbers).toBe(250);
    expect(mediumCaps.maxDangerSizzles).toBe(120);
  });

  it('destroy clears sampled state and getDebugState returns expected shape', () => {
    const governor = createAdaptiveQualityGovernor({
      enabled: true,
      now: () => 1000,
    });

    governor.onFrame(16, 100);
    governor.onFrame(20, 200);

    const beforeDestroy = governor.getDebugState(300);
    expect(beforeDestroy).toEqual({
      tier: expect.any(String),
      enabled: true,
      lastTierChangeAt: expect.any(Number),
      msSinceTierChange: expect.any(Number),
      sampleCount: expect.any(Number),
      sampledDurationMs: expect.any(Number),
      downgradeWindow: expect.objectContaining({
        ready: expect.any(Boolean),
        elapsedMs: expect.any(Number),
        sampleCount: expect.any(Number),
        avgMs: expect.any(Number),
      }),
      upgradeWindow: expect.objectContaining({
        ready: expect.any(Boolean),
        elapsedMs: expect.any(Number),
        sampleCount: expect.any(Number),
        avgMs: expect.any(Number),
      }),
    });
    expect(beforeDestroy.sampleCount).toBeGreaterThan(0);
    expect(beforeDestroy.sampledDurationMs).toBeGreaterThan(0);

    governor.destroy();
    const afterDestroy = governor.getDebugState(400);
    expect(afterDestroy.sampleCount).toBe(0);
    expect(afterDestroy.sampledDurationMs).toBe(0);
    expect(afterDestroy.downgradeWindow.sampleCount).toBe(0);
    expect(afterDestroy.upgradeWindow.sampleCount).toBe(0);
  });
});
