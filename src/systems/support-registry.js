const EMPTY_LIST = Object.freeze([]);

function toNonNegativeFinite(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return value < 0 ? fallback : value;
}

function normalizeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeSupportUnit(entry = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const id = normalizeString(entry.id);
  if (!id) return null;

  const displayName = normalizeString(entry.displayName, id);
  const summonCost = toNonNegativeFinite(entry.summonCost, 0);
  const cooldownMs = toNonNegativeFinite(entry.cooldownMs, 0);
  const maxActive = Math.max(1, Math.round(toNonNegativeFinite(entry.maxActive, 1)));
  const lifetime = Math.max(250, toNonNegativeFinite(entry.lifetime, 6000));

  return Object.freeze({
    id,
    displayName,
    summonCost,
    cooldownMs,
    maxActive,
    lifetime,
  });
}

export function createSupportRegistry({ units = [] } = {}) {
  const byId = new Map();
  let orderedUnits = EMPTY_LIST;

  function refreshSnapshot() {
    orderedUnits = Object.freeze(Array.from(byId.values()));
  }

  function registerSupportUnit(entry = {}) {
    const normalized = normalizeSupportUnit(entry);
    if (!normalized) return null;
    byId.set(normalized.id, normalized);
    refreshSnapshot();
    return normalized;
  }

  for (let i = 0; i < units.length; i++) {
    registerSupportUnit(units[i]);
  }

  return Object.freeze({
    registerSupportUnit,
    getSupportUnit(id) {
      if (typeof id !== 'string') return null;
      return byId.get(id) ?? null;
    },
    getAllSupportUnits() {
      return orderedUnits;
    },
  });
}
