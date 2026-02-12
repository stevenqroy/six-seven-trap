import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GESTURE } from '../../src/constants.js';
import { INPUT_MODES } from '../../src/core/input.js';
import { createInputHarness } from '../helpers/input-harness.js';

function nonMoveTypes(events) {
  return events.filter((event) => event.type !== 'move').map((event) => event.type);
}

describe('Input Integration - S7R-006 conflict playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('plays tap conflict sequence as double tap inside window', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 120, clientY: 200 });
    harness.advance(70);
    harness.emit('pointerup', { clientX: 120, clientY: 200 });

    harness.advance(110);
    harness.emit('pointerdown', { clientX: 122, clientY: 201 });
    harness.advance(40);
    harness.emit('pointermove', { clientX: 126, clientY: 205 });
    harness.advance(20);
    harness.emit('pointerup', { clientX: 122, clientY: 201 });

    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS + 15);
    expect(nonMoveTypes(harness.events)).toEqual(['doubleTap']);

    harness.destroy();
  });

  it('cancels hold candidate when movement exceeds threshold and avoids stuck state', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 200, clientY: 260 });
    harness.advance(120);
    harness.emit('pointermove', { clientX: 230, clientY: 260 });
    harness.advance(GESTURE.HOLD_DELAY_MS + 80);
    harness.emit('pointerup', { clientX: 230, clientY: 260 });

    expect(nonMoveTypes(harness.events)).toEqual([]);

    harness.advance(30);
    harness.emit('pointerdown', { clientX: 170, clientY: 180 });
    harness.advance(90);
    harness.emit('pointerup', { clientX: 170, clientY: 180 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);

    expect(nonMoveTypes(harness.events)).toEqual(['tap']);

    harness.destroy();
  });

  it('handles interruption lifecycle and resumes with next gesture sequence', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 180, clientY: 300 });
    harness.advance(GESTURE.HOLD_DELAY_MS);
    window.dispatchEvent(new Event('blur'));

    harness.advance(20);
    harness.emit('pointerdown', { clientX: 190, clientY: 330 });
    harness.advance(120);
    harness.emit('pointerup', { clientX: 190, clientY: 230 });

    expect(nonMoveTypes(harness.events)).toEqual(['holdStart', 'holdEnd', 'swipeUp']);

    harness.destroy();
  });
});
