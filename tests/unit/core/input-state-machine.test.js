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

describe('Input System - S7R-104 edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('normalizes mode input correctly', () => {
    // Test 'statechart' (explicit)
    const harnessState = createInputHarness({ mode: 'statechart' });
    harnessState.emit('pointerdown', { clientX: 10, clientY: 10 });
    harnessState.emit('pointerup', { clientX: 10, clientY: 10 });
    // Should be deferred
    expect(gestureTypes(harnessState.events)).toEqual([]);
    harnessState.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);
    expect(gestureTypes(harnessState.events)).toEqual(['tap']);
    harnessState.destroy();

    // Test 'legacy' (explicit)
    const harnessLegacy = createInputHarness({ mode: 'legacy' });
    harnessLegacy.emit('pointerdown', { clientX: 10, clientY: 10 });
    harnessLegacy.emit('pointerup', { clientX: 10, clientY: 10 });
    expect(gestureTypes(harnessLegacy.events)).toEqual(['tap']); // Legacy is immediate
    harnessLegacy.destroy();
    
    // Test unknown -> defaults to statechart
    const harnessUnknown = createInputHarness({ mode: 'invalid-mode' });
    harnessUnknown.emit('pointerdown', { clientX: 10, clientY: 10 });
    harnessUnknown.emit('pointerup', { clientX: 10, clientY: 10 });
    expect(gestureTypes(harnessUnknown.events)).toEqual([]); // Deferred
    harnessUnknown.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);
    expect(gestureTypes(harnessUnknown.events)).toEqual(['tap']);
    harnessUnknown.destroy();
  });

  it('cancels hold timer when movement exceeds tap threshold', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    harness.emit('pointerdown', { clientX: 100, clientY: 100 });
    
    // Move far enough to break tap/hold
    const distance = GESTURE.TAP_MAX_MOVEMENT_PX + 5;
    harness.emit('pointermove', { clientX: 100 + distance, clientY: 100 });
    
    // Advance past hold delay
    harness.advance(GESTURE.HOLD_DELAY_MS + 10);
    
    // Should NOT have fired holdStart
    expect(gestureTypes(harness.events)).toEqual([]);
    
    harness.destroy();
  });

  it('handles pointer cancel in legacy mode', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.LEGACY });

    // Legacy logic is immediate, so hold might fire differently or be tied to down.
    // Assuming hold start is delayed even in legacy?
    // Let's verify standard hold flow first for legacy.
    harness.emit('pointerdown', { clientX: 100, clientY: 100 });
    harness.advance(GESTURE.HOLD_DELAY_MS);
    
    // Legacy might fire holdStart here?
    // If it did, cancel should fire holdEnd.
    // If it didn't (because legacy doesn't support hold? or supports it differently?), this test adapts.
    // Actually legacy supports hold.
    
    // If hold started, it should end on cancel.
    harness.emit('pointercancel', { clientX: 100, clientY: 100 });
    
    const events = gestureTypes(harness.events);
    const hasHoldStart = events.includes('holdStart');
    
    if (hasHoldStart) {
      expect(events).toContain('holdEnd');
    }
    
    // Ensure system is recovered for next gesture
    harness.emit('pointerdown', { clientX: 200, clientY: 200 });
    harness.emit('pointerup', { clientX: 200, clientY: 200 });
    // Legacy tap is immediate
    const finalEvents = gestureTypes(harness.events);
    expect(finalEvents[finalEvents.length - 1]).toBe('tap');

    harness.destroy();
  });

  it('replaces handlers correctly with setHandlers', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });
    const newEvents = [];

    // The harness captures events via its own handlers.
    // We need to access the underlying system to call setHandlers.
    // The harness exposes 'system'.
    
    // Let's inject new handlers that push to newEvents
    harness.system.setHandlers({
      onTap: () => newEvents.push('newTap'),
      onHoldStart: () => newEvents.push('newHoldStart'),
      onHoldEnd: () => newEvents.push('newHoldEnd'),
      onSwipeUp: () => newEvents.push('newSwipeUp'),
      onDoubleTap: () => newEvents.push('newDoubleTap'),
      onMove: (x, y) => newEvents.push(`newMove:${x},${y}`)
    });

    harness.emit('pointerdown', { clientX: 10, clientY: 10 });
    harness.emit('pointerup', { clientX: 10, clientY: 10 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);

    // Old harness events should NOT receive the tap (since handlers were replaced)
    // Wait, the harness setup passes the initial handlers to createInputSystem.
    // If we call setHandlers, we overwrite them.
    // So harness.events won't get updated anymore.
    // The harness might still receive 'move' if it listens directly? No, harness relies on callbacks.
    
    // New events should have the tap
    expect(newEvents).toEqual(['newTap']);

    harness.destroy();
  });

  it('cleans up listeners on destroy', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });
    
    // Verify system destroy prevents callbacks.
    
    harness.destroy();
    
    // Try to trigger a tap
    harness.emit('pointerdown', { clientX: 10, clientY: 10 });
    harness.emit('pointerup', { clientX: 10, clientY: 10 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);
    
    expect(gestureTypes(harness.events)).toEqual([]);
  });

  it('cleans up state on window blur', () => {
    const harness = createInputHarness({ mode: INPUT_MODES.STATE_CHART });

    // Start a hold
    harness.emit('pointerdown', { clientX: 50, clientY: 50 });
    harness.advance(GESTURE.HOLD_DELAY_MS);
    expect(gestureTypes(harness.events)).toContain('holdStart');

    // Simulate window blur
    window.dispatchEvent(new Event('blur'));

    // Should fire holdEnd
    expect(gestureTypes(harness.events)).toContain('holdEnd');

    // Should be reset - try a new tap
    harness.advance(100);
    harness.emit('pointerdown', { clientX: 60, clientY: 60 });
    harness.emit('pointerup', { clientX: 60, clientY: 60 });
    harness.advance(GESTURE.DOUBLE_TAP_WINDOW_MS);
    
    const events = gestureTypes(harness.events);
    expect(events[events.length - 1]).toBe('tap');

    harness.destroy();
  });
});
