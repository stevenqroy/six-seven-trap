import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import * as harvester from '../../../src/enemies/harvester.js';

function createState(numbers = []) {
  return {
    nums: numbers,
    badguysRender: {
      ready: true,
      x: 300,
      y: 60,
      w: 200,
      h: 140,
    },
    wCSS: 800,
    hCSS: 600,
  };
}

describe('harvester enemy (S7R-018)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
    setFlag('enemyHarvester', true);
    harvester.destroy();
  });

  afterEach(() => {
    harvester.destroy();
    resetFlags();
  });

  it('exports the V1 enemy contract surface', () => {
    expect(harvester.id).toBe('harvester');
    expect(typeof harvester.spawn).toBe('function');
    expect(typeof harvester.update).toBe('function');
    expect(typeof harvester.draw).toBe('function');
    expect(typeof harvester.destroy).toBe('function');
    expect(typeof harvester.onHit).toBe('function');
    expect(typeof harvester.serializeDebug).toBe('function');
  });

  it('gates behavior behind the enemyHarvester feature flag', () => {
    setFlag('enemyHarvester', false);

    const six = { txt: '6', col: '#ff7eb3', isTrap: false, x: 200, y: 250, dx: 0, dy: 0 };
    const state = createState([six]);
    harvester.spawn();
    const debug = harvester.update(0.2, state);

    expect(debug.enabled).toBe(false);
    expect(debug.beamCount).toBe(0);
    expect(six.dx).toBe(0);
    expect(six.dy).toBe(0);
    expect(six.harvesterPulling).toBeUndefined();
  });

  it('pulls 6/7 creatures toward the ship while in active state', () => {
    const six = { txt: '6', col: '#ff7eb3', isTrap: false, x: 320, y: 230, dx: 0, dy: 0 };
    const seven = { txt: '7', col: '#7afcff', isTrap: false, x: 510, y: 220, dx: 0, dy: 0 };
    const five = { txt: '5', col: '#ff3333', isTrap: false, x: 390, y: 220, dx: 0, dy: 0 };
    const trapSix = { txt: '6', col: '#ff3333', isTrap: true, x: 420, y: 220, dx: 0, dy: 0 };
    const state = createState([six, seven, five, trapSix]);

    harvester.spawn({
      beamCount: 2,
      pullStrength: 0.3,
      getShipPosition: () => ({ x: 400, y: 130 }),
    });

    // First frame transitions spawn -> windup. Second long frame reaches active and applies pull.
    harvester.update(0.02, state);
    const debug = harvester.update(0.68, state);

    expect(debug.lifecycleState).toBe('active');
    expect(debug.beamCount).toBe(2);
    expect(six.harvesterPulling).toBe(true);
    expect(seven.harvesterPulling).toBe(true);
    expect(six.dx).toBeGreaterThan(0);
    expect(seven.dx).toBeLessThan(0);
    expect(five.dx).toBe(0);
    expect(trapSix.dx).toBe(0);
    expect(five.harvesterPulling).toBeUndefined();
    expect(trapSix.harvesterPulling).toBeUndefined();
  });

  it('supports interrupting capture attempts through onHit payloads', () => {
    const six = { txt: '6', col: '#ff7eb3', isTrap: false, x: 360, y: 210, dx: 0, dy: 0 };
    const state = createState([six]);

    harvester.spawn({
      beamCount: 1,
      pullStrength: 0.35,
      getShipPosition: () => ({ x: 400, y: 130 }),
    });

    harvester.update(0.02, state);
    harvester.update(0.68, state);
    expect(harvester.serializeDebug().lifecycleState).toBe('active');

    const handled = harvester.onHit({ interrupt: true });
    const afterInterrupt = harvester.serializeDebug();
    harvester.update(0.016, state);
    const afterFrame = harvester.serializeDebug();

    expect(handled).toBe(true);
    expect(afterInterrupt.lifecycleState).toBe('recover');
    expect(afterFrame.beamCount).toBe(0);
    expect(six.harvesterPulling).toBe(false);
  });
});
