import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GESTURE } from '../../../src/constants.js';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import { INPUT_MODES } from '../../../src/core/input.js';
import { createInputHarness } from '../../helpers/input-harness.js';

function moveValues(events) {
  return events.filter((event) => event.type === 'move').map((event) => event.x);
}

function gestureTypes(events) {
  return events.filter((event) => event.type !== 'move').map((event) => event.type);
}

describe('Input System - S7R-047 multi-touch move+action', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
  });

  afterEach(() => {
    resetFlags();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('keeps single-pointer behavior when multiTouchAction is disabled', () => {
    setFlag('multiTouchAction', false);
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { pointerId: 1, isPrimary: true, clientX: 120, clientY: 200 });
    harness.emit('pointermove', { pointerId: 1, isPrimary: true, clientX: 150, clientY: 200 });
    harness.emit('pointerdown', { pointerId: 2, isPrimary: false, clientX: 320, clientY: 200 });
    harness.emit('pointermove', { pointerId: 2, isPrimary: false, clientX: 340, clientY: 200 });

    expect(moveValues(harness.events)).toEqual([150]);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledTimes(1);

    harness.destroy();
  });

  it('allows first drag pointer ownership even when the pointer is non-primary', () => {
    setFlag('multiTouchAction', true);
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { pointerId: 9, isPrimary: false, clientX: 180, clientY: 230 });
    harness.emit('pointermove', { pointerId: 9, isPrimary: false, clientX: 220, clientY: 230 });
    harness.emit('pointerup', { pointerId: 9, isPrimary: false, clientX: 220, clientY: 230 });

    expect(moveValues(harness.events)).toEqual([220]);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledWith(9);

    harness.destroy();
  });

  it('routes additional pointers away from movement and gesture ownership', () => {
    setFlag('multiTouchAction', true);
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { pointerId: 1, isPrimary: true, clientX: 130, clientY: 220 });
    harness.advance(40);
    harness.emit('pointermove', { pointerId: 1, isPrimary: true, clientX: 155, clientY: 220 });

    harness.emit('pointerdown', { pointerId: 2, isPrimary: false, clientX: 320, clientY: 220 });
    harness.emit('pointermove', { pointerId: 2, isPrimary: false, clientX: 350, clientY: 220 });
    harness.emit('pointerup', { pointerId: 2, isPrimary: false, clientX: 350, clientY: 220 });

    harness.advance(40);
    harness.emit('pointerup', { pointerId: 1, isPrimary: true, clientX: 155, clientY: 220 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS + 10);

    expect(moveValues(harness.events)).toEqual([155]);
    expect(gestureTypes(harness.events)).toEqual([]);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledWith(1);

    harness.destroy();
  });

  it('applies multi-pointer ownership rules in legacy mode too', () => {
    setFlag('multiTouchAction', true);
    const harness = createInputHarness({ mode: INPUT_MODES.LEGACY });

    harness.emit('pointerdown', { pointerId: 1, isPrimary: true, clientX: 120, clientY: 240 });
    harness.emit('pointermove', { pointerId: 1, isPrimary: true, clientX: 160, clientY: 240 });
    harness.emit('pointerdown', { pointerId: 2, isPrimary: false, clientX: 320, clientY: 240 });
    harness.emit('pointermove', { pointerId: 2, isPrimary: false, clientX: 360, clientY: 240 });
    harness.emit('pointerup', { pointerId: 2, isPrimary: false, clientX: 360, clientY: 240 });
    harness.emit('pointerup', { pointerId: 1, isPrimary: true, clientX: 160, clientY: 240 });

    expect(moveValues(harness.events)).toEqual([160]);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledWith(1);

    harness.destroy();
  });
});
