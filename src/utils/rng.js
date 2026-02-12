const UINT32_MAX = 4294967296;

export function normalizeSeed(value, fallback = Date.now()) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return normalizeSeed(fallback, 1);
  }
  return Math.trunc(numeric) >>> 0;
}

export function parseSeedFromQuery(search = '') {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const rawSeed = params.get('seed');
  if (rawSeed === null || rawSeed === '') return null;

  const numeric = Number(rawSeed);
  if (!Number.isFinite(numeric)) return null;
  return normalizeSeed(numeric);
}

export function createDeterministicRng(seed) {
  let state = normalizeSeed(seed, 1);
  if (state === 0) state = 1;

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX;
  };
}

export function createRunRng({ deterministic = false, seed = Date.now() } = {}) {
  const runSeed = normalizeSeed(seed);
  const source = deterministic ? createDeterministicRng(runSeed) : Math.random;
  let drawCount = 0;

  function random() {
    drawCount += 1;
    return source();
  }

  function randomRange(min, max) {
    return min + (max - min) * random();
  }

  function randomInt(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
    return Math.floor(random() * maxExclusive);
  }

  return {
    deterministic,
    seed: runSeed,
    random,
    randomRange,
    randomInt,
    getDrawCount: () => drawCount,
  };
}
