import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GESTURE } from '../../../src/constants.js';
import { INPUT_MODES } from '../../../src/core/input.js';
import { createInputHarness } from '../../helpers/input-harness.js';

function gestureTypes(events) {
  return events.filter((event) => event.type !== 'move').map((event) => event.type);
}

describe('Input System - S7R-006 state chart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('emits single tap only after double-tap window expires', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 150, clientY: 180 });
    harness.advance(120);
    harness.emit('pointerup', { clientX: 150, clientY: 180 });

    expect(gestureTypes(harness.events)).toEqual([]);

    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS - 1);
    expect(gestureTypes(harness.events)).toEqual([]);

    harness.advance(1);
    expect(gestureTypes(harness.events)).toEqual(['tap']);

    harness.destroy();
  });

  it('upgrades two taps in window to double tap and suppresses single tap', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 130, clientY: 190 });
    harness.advance(80);
    harness.emit('pointerup', { clientX: 130, clientY: 190 });

    harness.advance(120);
    harness.emit('pointerdown', { clientX: 132, clientY: 192 });
    harness.advance(50);
    harness.emit('pointerup', { clientX: 132, clientY: 192 });

    expect(gestureTypes(harness.events)).toEqual(['doubleTap']);

    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS + 20);
    expect(gestureTypes(harness.events)).toEqual(['doubleTap']);

    harness.destroy();
  });

  it('enters holding state after delay and exits on pointerup', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 140, clientY: 220 });
    harness.advance(GESTURE.HOLD_DELAY_MS);

    expect(gestureTypes(harness.events)).toEqual(['holdStart']);

    harness.advance(30);
    harness.emit('pointerup', { clientX: 140, clientY: 220 });

    expect(gestureTypes(harness.events)).toEqual(['holdStart', 'holdEnd']);

    harness.destroy();
  });

  it('applies swipe precedence over tap classification', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 120, clientY: 320 });
    harness.advance(150);
    harness.emit('pointerup', { clientX: 126, clientY: 220 });

    expect(gestureTypes(harness.events)).toEqual(['swipeUp']);

    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS + 20);
    expect(gestureTypes(harness.events)).toEqual(['swipeUp']);

    harness.destroy();
  });

  it('handles pointercancel during hold and recovers cleanly for next gesture', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 100, clientY: 240 });
    harness.advance(GESTURE.HOLD_DELAY_MS);
    harness.emit('pointercancel', { clientX: 100, clientY: 240 });

    expect(gestureTypes(harness.events)).toEqual(['holdStart', 'holdEnd']);

    harness.advance(20);
    harness.emit('pointerdown', { clientX: 180, clientY: 200 });
    harness.advance(80);
    harness.emit('pointerup', { clientX: 180, clientY: 200 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);

    expect(gestureTypes(harness.events)).toEqual(['holdStart', 'holdEnd', 'tap']);

    harness.destroy();
  });

  it('keeps movement stream active when no gesture is active', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointermove', { clientX: 210, clientY: 230 });
    harness.emit('touchmove', {
      touches: [{ clientX: 222, clientY: 229 }],
    });

    const moveEvents = harness.events.filter((event) => event.type === 'move').map((event) => event.x);
    expect(moveEvents).toEqual([210, 222]);

    harness.destroy();
  });

  it('cleans up active hold on lost pointer capture', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { pointerId: 7, clientX: 118, clientY: 250 });
    harness.advance(GESTURE.HOLD_DELAY_MS);
    harness.emit('lostpointercapture', { pointerId: 7, clientX: 118, clientY: 250 });

    expect(gestureTypes(harness.events)).toEqual(['holdStart', 'holdEnd']);

    harness.advance(20);
    harness.emit('pointerdown', { pointerId: 7, clientX: 160, clientY: 190 });
    harness.advance(70);
    harness.emit('pointerup', { pointerId: 7, clientX: 160, clientY: 190 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);

    expect(gestureTypes(harness.events)).toEqual(['holdStart', 'holdEnd', 'tap']);

    harness.destroy();
  });

  it('retains legacy recognizer behavior when legacy mode is selected', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.LEGACY });

    harness.emit('pointerdown', { clientX: 130, clientY: 180 });
    harness.advance(100);
    harness.emit('pointerup', { clientX: 130, clientY: 180 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);

    expect(gestureTypes(harness.events)).toEqual(['tap']);

    harness.destroy();
  });
});
