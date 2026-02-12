import { createRunRng, parseSeedFromQuery } from '../utils/rng.js';

export function createRunRngTracker({
  search = typeof window !== 'undefined' ? window.location.search : '',
  getDeterministicFlag = () => false,
} = {}) {
  const seedOverride = parseSeedFromQuery(search);
  let currentRunRng = createRunRng();

  function start(reason = 'run-start') {
    currentRunRng = createRunRng({
      deterministic: getDeterministicFlag() || seedOverride !== null,
      seed: seedOverride !== null ? seedOverride : Date.now(),
    });

    console.log(
      `[S7R:RNG] ${reason} seed=${currentRunRng.seed} deterministic=${currentRunRng.deterministic}`
    );

    return {
      seed: currentRunRng.seed,
      deterministic: currentRunRng.deterministic,
      drawCount: currentRunRng.getDrawCount(),
    };
  }

  function random() {
    return currentRunRng.random();
  }

  function getDrawCount() {
    return currentRunRng.getDrawCount();
  }

  function logSummary({
    reason,
    seed,
    deterministic,
    drawCount,
    score,
    bestCombo,
    elapsedMs,
  }) {
    console.log(
      `[S7R:RUN] ${reason} seed=${seed} deterministic=${deterministic} ` +
        `draws=${drawCount} score=${score} bestCombo=${bestCombo} timeMs=${Math.round(elapsedMs)}`
    );
  }

  return {
    start,
    random,
    getDrawCount,
    logSummary,
  };
}
