import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import * as skimmer from '../../../src/enemies/skimmer.js';

function createState({
  wCSS = 640,
  hCSS = 360,
} = {}) {
  return { wCSS, hCSS };
}

function createMockCtx() {
  const calls = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    save() {
      calls.push({ type: 'save' });
    },
    restore() {
      calls.push({ type: 'restore' });
    },
    fillRect(x, y, w, h) {
      calls.push({
        type: 'fillRect',
        fillStyle: this.fillStyle,
        x,
        y,
        w,
        h,
      });
    },
    beginPath() {
      calls.push({ type: 'beginPath' });
    },
    moveTo(x, y) {
      calls.push({ type: 'moveTo', x, y });
    },
    lineTo(x, y) {
      calls.push({ type: 'lineTo', x, y });
    },
    stroke() {
      calls.push({ type: 'stroke', strokeStyle: this.strokeStyle });
    },
  };
  return { ctx, calls };
}

describe('skimmer enemy (S7R-015)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
    setFlag('enemySkimmer', true);
    skimmer.destroy();
  });

  afterEach(() => {
    skimmer.destroy();
    resetFlags();
  });

  it('exports the V1 enemy contract surface', () => {
    expect(skimmer.id).toBe('skimmer');
    expect(typeof skimmer.spawn).toBe('function');
    expect(typeof skimmer.update).toBe('function');
    expect(typeof skimmer.draw).toBe('function');
    expect(typeof skimmer.destroy).toBe('function');
    expect(typeof skimmer.onHit).toBe('function');
    expect(typeof skimmer.serializeDebug).toBe('function');
  });

  it('gates behavior behind the enemySkimmer feature flag', () => {
    const state = createState();
    setFlag('enemySkimmer', false);

    skimmer.spawn({ x: 120, y: 120, direction: 1 });
    const debug = skimmer.update(0.2, state);

    expect(debug.enabled).toBe(false);
    expect(debug.lifecycleState).toBe('disabled');
    expect(debug.runtime).toBe(null);
  });

  it('performs fast lateral strafing runs and reverses at arena edges', () => {
    const state = createState({ wCSS: 300, hCSS: 220 });
    skimmer.spawn({
      x: 20,
      y: 80,
      direction: 1,
      dashSpeedPxPerSec: 900,
      dashAccelPxPerSec2: 3400,
    });

    skimmer.update(0.02, state);
    let debug = skimmer.update(0.36, state);
    expect(debug.lifecycleState).toBe('active');
    expect(Math.abs(debug.vx)).toBeGreaterThan(400);
    expect(debug.strafingRuns).toBeGreaterThanOrEqual(1);

    const directionSeen = new Set();
    for (let i = 0; i < 110; i++) {
      debug = skimmer.update(0.016, state);
      if (debug.vx > 0) directionSeen.add('right');
      if (debug.vx < 0) directionSeen.add('left');
    }

    expect(directionSeen.has('left')).toBe(true);
    expect(directionSeen.has('right')).toBe(true);
    expect(debug.x).toBeGreaterThanOrEqual(0);
    expect(debug.x).toBeLessThanOrEqual(state.wCSS);
  });

  it('supports interrupts via onHit and exits active dash state', () => {
    const state = createState();
    skimmer.spawn({
      x: 80,
      y: 90,
      direction: 1,
    });

    skimmer.update(0.02, state);
    skimmer.update(0.36, state);
    const beforeHit = skimmer.serializeDebug();
    expect(beforeHit.lifecycleState).toBe('active');

    const handled = skimmer.onHit({ interrupt: true, damage: 2 });
    const afterHit = skimmer.serializeDebug();
    skimmer.update(0.016, state);
    const afterFrame = skimmer.serializeDebug();

    expect(handled).toBe(true);
    expect(afterHit.lifecycleState).toBe('recover');
    expect(afterFrame.hp).toBe(beforeHit.hp - 2);
  });

  it('resets spawn context cleanly when spawn is called multiple times', () => {
    const state = createState({ wCSS: 400, hCSS: 240 });

    skimmer.spawn({ x: 30, y: 70, direction: 1 });
    skimmer.update(0, state);
    const firstSpawn = skimmer.serializeDebug();
    expect(firstSpawn.x).toBe(30);
    expect(firstSpawn.y).toBe(70);
    expect(firstSpawn.dashDirection).toBe(1);

    skimmer.spawn({ x: 260, y: 90, direction: -1 });
    skimmer.update(0, state);
    const secondSpawn = skimmer.serializeDebug();
    expect(secondSpawn.x).toBe(260);
    expect(secondSpawn.y).toBe(90);
    expect(secondSpawn.dashDirection).toBe(-1);
    expect(secondSpawn.strafingRuns).toBe(0);
    expect(secondSpawn.runtimeEntityId).toBe('enemy-1');
  });

  it('treats invalid onHit payloads as no-op damage/interrupts', () => {
    skimmer.spawn({ x: 80, y: 90, direction: 1 });
    const beforeHit = skimmer.serializeDebug();

    const handled = skimmer.onHit('invalid-payload');
    const afterHit = skimmer.serializeDebug();

    expect(handled).toBe(true);
    expect(afterHit.hp).toBe(beforeHit.hp);
    expect(afterHit.lifecycleState).toBe(beforeHit.lifecycleState);
  });

  it('destroy clears runtime, movement state, and debug payload fields', () => {
    const state = createState();
    skimmer.spawn({
      x: 90,
      y: 100,
      direction: 1,
    });
    skimmer.update(0.02, state);
    skimmer.update(0.36, state);
    skimmer.update(0.016, state);
    expect(skimmer.serializeDebug().runtime).not.toBe(null);

    skimmer.destroy();
    const debug = skimmer.serializeDebug();

    expect(debug.hp).toBe(0);
    expect(debug.lifecycleState).toBe('despawned');
    expect(debug.runtime).toBe(null);
    expect(debug.runtimeEntityId).toBe(null);
    expect(debug.trailCount).toBe(0);
    expect(debug.x).toBe(0);
    expect(debug.y).toBe(0);
  });

  it('draws body and active trail artifacts when dashing', () => {
    const state = createState();
    const { ctx, calls } = createMockCtx();

    skimmer.spawn({
      x: 90,
      y: 100,
      direction: 1,
    });
    skimmer.update(0.02, state);
    skimmer.update(0.36, state);
    skimmer.update(0.016, state);

    skimmer.draw(ctx);

    const fillRects = calls.filter((call) => call.type === 'fillRect');
    expect(fillRects.length).toBeGreaterThanOrEqual(2);
    expect(fillRects.some((call) => call.fillStyle === '#ff4d6d')).toBe(true);
    expect(fillRects.some((call) => call.fillStyle.includes('rgba(116, 232, 255'))).toBe(true);
  });
});
