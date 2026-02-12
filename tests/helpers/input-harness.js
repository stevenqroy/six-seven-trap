import { vi } from 'vitest';
import { createInputSystem, INPUT_MODES } from '../../src/core/input.js';

function ensureWindowEventApi() {
  if (typeof window === 'undefined') return () => {};
  const hasApi =
    typeof window.addEventListener === 'function' &&
    typeof window.removeEventListener === 'function' &&
    typeof window.dispatchEvent === 'function';
  if (hasApi) return () => {};

  const listeners = new Map();
  const previousAdd = window.addEventListener;
  const previousRemove = window.removeEventListener;
  const previousDispatch = window.dispatchEvent;

  window.addEventListener = (type, handler) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
  };
  window.removeEventListener = (type, handler) => {
    const set = listeners.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) listeners.delete(type);
  };
  window.dispatchEvent = (event) => {
    const set = listeners.get(event.type);
    if (!set) return true;
    for (const handler of set) handler(event);
    return true;
  };

  return () => {
    if (typeof previousAdd === 'function') window.addEventListener = previousAdd;
    else delete window.addEventListener;
    if (typeof previousRemove === 'function') window.removeEventListener = previousRemove;
    else delete window.removeEventListener;
    if (typeof previousDispatch === 'function') window.dispatchEvent = previousDispatch;
    else delete window.dispatchEvent;
  };
}

export function createInputHarness({ mode = INPUT_MODES.STATE_CHART } = {}) {
  let nowMs = 0;
  const listeners = new Map();
  const restoreWindowEventApi = ensureWindowEventApi();

  const canvas = {
    addEventListener: vi.fn((type, handler) => {
      listeners.set(type, handler);
    }),
    removeEventListener: vi.fn((type, handler) => {
      const current = listeners.get(type);
      if (current === handler) listeners.delete(type);
    }),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  };

  const events = [];
  const input = createInputSystem(canvas, { mode });
  input.setHandlers({
    onMove: (x) => events.push({ type: 'move', x }),
    onTap: (payload) => events.push({ type: 'tap', payload }),
    onDoubleTap: (payload) => events.push({ type: 'doubleTap', payload }),
    onHoldStart: (payload) => events.push({ type: 'holdStart', payload }),
    onHoldEnd: (payload) => events.push({ type: 'holdEnd', payload }),
    onSwipeUp: (payload) => events.push({ type: 'swipeUp', payload }),
  });

  const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

  function setNow(value) {
    nowMs = value;
  }

  function advance(ms) {
    nowMs += ms;
    vi.advanceTimersByTime(ms);
  }

  function emit(type, overrides = {}) {
    const handler = listeners.get(type);
    if (!handler) throw new Error(`Missing listener for "${type}"`);
    const event = {
      isPrimary: true,
      pointerType: 'touch',
      pointerId: 1,
      clientX: 120,
      clientY: 240,
      touches: [{ clientX: 120, clientY: 240 }],
      preventDefault: vi.fn(),
      ...overrides,
    };
    handler(event);
    return event;
  }

  function destroy() {
    input.destroy();
    nowSpy.mockRestore();
    restoreWindowEventApi();
  }

  return {
    events,
    canvas,
    input,
    emit,
    setNow,
    advance,
    destroy,
  };
}
