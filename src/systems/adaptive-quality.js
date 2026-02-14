function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

const DEFAULT_SHADOW_BLUR_CAPS = Object.freeze({
  high: Object.freeze({
    shadowBlurEnabled: true,
    maxShadowBlur: 18,
  }),
  medium: Object.freeze({
    shadowBlurEnabled: true,
    maxShadowBlur: 10,
  }),
  low: Object.freeze({
    shadowBlurEnabled: false,
    maxShadowBlur: 0,
  }),
});

function cloneCaps(caps) {
  return {
    ...caps,
  };
}

function clampTierIndex(index, tierOrder) {
  return Math.max(0, Math.min(tierOrder.length - 1, index));
}

function normalizeTier(tier, tierOrder, fallbackTier) {
  return tierOrder.includes(tier) ? tier : fallbackTier;
}

export function computeRecentWindowStats(samples, windowMs) {
  let elapsedMs = 0;
  let totalFrameMs = 0;
  let sampleCount = 0;

  for (let i = samples.length - 1; i >= 0 && elapsedMs < windowMs; i--) {
    const sample = samples[i];
    elapsedMs += sample.ms;
    totalFrameMs += sample.ms;
    sampleCount += 1;
  }

  return {
    ready: elapsedMs >= windowMs && sampleCount > 0,
    elapsedMs,
    sampleCount,
    avgMs: sampleCount > 0 ? totalFrameMs / sampleCount : 0,
  };
}

export function createAdaptiveQualityGovernor({
  enabled = false,
  tierOrder = ['low', 'medium', 'high'],
  tiers = {
    high: {},
    medium: {},
    low: {},
  },
  initialTier = 'high',
  downgradeAvgMs = 24,
  downgradeWindowMs = 2000,
  upgradeAvgMs = 18,
  upgradeWindowMs = 4000,
  minTierDwellMs = 1500,
  historyWindowMultiplier = 3,
  now = nowMs,
} = {}) {
  const isEnabled = typeof enabled === 'function' ? enabled : () => Boolean(enabled);
  const safeTierOrder = Array.isArray(tierOrder) && tierOrder.length ? [...tierOrder] : ['low', 'medium', 'high'];
  const safeDefaultTier = safeTierOrder.includes('high') ? 'high' : safeTierOrder[safeTierOrder.length - 1];

  let currentTier = normalizeTier(initialTier, safeTierOrder, safeDefaultTier);
  let lastTierChangeAt = 0;
  let samples = [];
  let sampleDurationMs = 0;
  let lastEnabled = Boolean(isEnabled());

  const safeDowngradeWindowMs = Math.max(250, toFinite(downgradeWindowMs, 2000));
  const safeUpgradeWindowMs = Math.max(250, toFinite(upgradeWindowMs, 4000));
  const safeHistoryWindowMs = Math.max(
    safeDowngradeWindowMs,
    safeUpgradeWindowMs
  ) * Math.max(2, toFinite(historyWindowMultiplier, 3));

  function getTierIndex() {
    return safeTierOrder.indexOf(currentTier);
  }

  function setTier(nextTier, atMs) {
    currentTier = normalizeTier(nextTier, safeTierOrder, safeDefaultTier);
    lastTierChangeAt = toFinite(atMs, now());
  }

  function reset({
    tier = safeDefaultTier,
    atMs = now(),
  } = {}) {
    setTier(tier, atMs);
    samples = [];
    sampleDurationMs = 0;
    lastEnabled = Boolean(isEnabled());
    return currentTier;
  }

  function getCaps() {
    const tierCaps = tiers[currentTier] || tiers[safeDefaultTier] || {};
    const caps = cloneCaps(tierCaps);
    if (caps.maxDangerEmbers > 300) caps.maxDangerEmbers = 300;
    if (caps.maxDangerSizzles > 150) caps.maxDangerSizzles = 150;
    const fallback = DEFAULT_SHADOW_BLUR_CAPS[currentTier] || DEFAULT_SHADOW_BLUR_CAPS[safeDefaultTier];
    if (typeof caps.shadowBlurEnabled !== 'boolean') {
      caps.shadowBlurEnabled = fallback.shadowBlurEnabled;
    }
    if (!Number.isFinite(caps.maxShadowBlur)) {
      caps.maxShadowBlur = fallback.maxShadowBlur;
    }
    if (!caps.shadowBlurEnabled) {
      caps.maxShadowBlur = 0;
    }
    return caps;
  }

  function evaluateWindows() {
    return {
      downgrade: computeRecentWindowStats(samples, safeDowngradeWindowMs),
      upgrade: computeRecentWindowStats(samples, safeUpgradeWindowMs),
    };
  }

  function onFrame(frameMs, atMs = now()) {
    const safeNow = toFinite(atMs, now());
    const ms = toFinite(frameMs, 0);
    if (ms <= 0) return null;

    const enabledNow = Boolean(isEnabled());

    if (!enabledNow) {
      samples = [];
      sampleDurationMs = 0;
      const oldTier = currentTier;
      lastEnabled = false;
      if (currentTier !== safeDefaultTier) {
        setTier(safeDefaultTier, safeNow);
        return {
          oldTier,
          newTier: currentTier,
          atMs: safeNow,
          reason: 'disabled',
          triggerAvgMs: null,
          triggerWindowMs: 0,
          sampleCount: 0,
        };
      }
      return null;
    }

    if (!lastEnabled) {
      samples = [];
      sampleDurationMs = 0;
      lastTierChangeAt = safeNow;
      lastEnabled = true;
    }

    samples.push({ ms, atMs: safeNow });
    sampleDurationMs += ms;
    while (samples.length > 1 && sampleDurationMs > safeHistoryWindowMs) {
      const removed = samples.shift();
      sampleDurationMs -= removed.ms;
    }

    const { downgrade, upgrade } = evaluateWindows();
    const elapsedSinceChange = safeNow - lastTierChangeAt;
    if (elapsedSinceChange < Math.max(0, toFinite(minTierDwellMs, 0))) {
      return null;
    }

    const tierIndex = getTierIndex();
    const canDowngrade = tierIndex > 0;
    const canUpgrade = tierIndex < safeTierOrder.length - 1;
    if (canDowngrade && downgrade.ready && downgrade.avgMs > downgradeAvgMs) {
      const oldTier = currentTier;
      const nextTier = safeTierOrder[clampTierIndex(tierIndex - 1, safeTierOrder)];
      setTier(nextTier, safeNow);
      return {
        oldTier,
        newTier: currentTier,
        atMs: safeNow,
        reason: 'downgrade',
        triggerAvgMs: downgrade.avgMs,
        triggerWindowMs: safeDowngradeWindowMs,
        sampleCount: downgrade.sampleCount,
      };
    }

    if (canUpgrade && upgrade.ready && upgrade.avgMs < upgradeAvgMs) {
      const oldTier = currentTier;
      const nextTier = safeTierOrder[clampTierIndex(tierIndex + 1, safeTierOrder)];
      setTier(nextTier, safeNow);
      return {
        oldTier,
        newTier: currentTier,
        atMs: safeNow,
        reason: 'upgrade',
        triggerAvgMs: upgrade.avgMs,
        triggerWindowMs: safeUpgradeWindowMs,
        sampleCount: upgrade.sampleCount,
      };
    }

    return null;
  }

  function getTier() {
    return currentTier;
  }

  function getDebugState(atMs = now()) {
    const safeNow = toFinite(atMs, now());
    const windows = evaluateWindows();
    return {
      tier: currentTier,
      enabled: Boolean(isEnabled()),
      lastTierChangeAt,
      msSinceTierChange: Math.max(0, safeNow - lastTierChangeAt),
      sampleCount: samples.length,
      sampledDurationMs: sampleDurationMs,
      downgradeWindow: windows.downgrade,
      upgradeWindow: windows.upgrade,
    };
  }

  function destroy() {
    samples = [];
    sampleDurationMs = 0;
    lastEnabled = false;
  }

  return {
    onFrame,
    reset,
    destroy,
    getTier,
    getCaps,
    getDebugState,
  };
}
