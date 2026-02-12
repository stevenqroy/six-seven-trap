import { GESTURE } from '../constants.js';
import { getFlag } from '../config/flags.js';

const NOOP = () => {};
const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;

export const INPUT_MODES = Object.freeze({
  LEGACY: 'legacy',
  STATE_CHART: 'state-chart',
});

export const GESTURE_STATES = Object.freeze({
  IDLE: 'IDLE',
  TRACKING: 'TRACKING',
  HOLDING: 'HOLDING',
  TAP_PENDING: 'TAP_PENDING',
});

function normalizeMode(mode) {
  if (mode === INPUT_MODES.LEGACY) return INPUT_MODES.LEGACY;
  if (mode === 'statechart') return INPUT_MODES.STATE_CHART;
  return INPUT_MODES.STATE_CHART;
}

function isMultiTouchActionEnabled() {
  return getFlag('multiTouchAction');
}

/**
 * Canvas gesture/input system.
 * Keeps move handling always active and layers gesture detection on top.
 */
export function createInputSystem(canvas, options = {}) {
  const handlers = {
    onMove: NOOP,
    onTap: NOOP,
    onDoubleTap: NOOP,
    onHoldStart: NOOP,
    onHoldEnd: NOOP,
    onSwipeUp: NOOP,
  };

  const mode = normalizeMode(options.mode);
  const destroyRuntime =
    mode === INPUT_MODES.LEGACY
      ? createLegacyRuntime(canvas, handlers)
      : createStateChartRuntime(canvas, handlers);

  return {
    setHandlers(nextHandlers = {}) {
      handlers.onMove = nextHandlers.onMove || NOOP;
      handlers.onTap = nextHandlers.onTap || NOOP;
      handlers.onDoubleTap = nextHandlers.onDoubleTap || NOOP;
      handlers.onHoldStart = nextHandlers.onHoldStart || NOOP;
      handlers.onHoldEnd = nextHandlers.onHoldEnd || NOOP;
      handlers.onSwipeUp = nextHandlers.onSwipeUp || NOOP;
    },
    destroy() {
      destroyRuntime();
    },
  };
}

function createLegacyRuntime(canvas, handlers) {
  let pointerDown = false;
  let pointerId = null;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let movedBeyondTap = false;
  let holdStarted = false;
  let holdTimerId = null;

  let pendingTapTimerId = null;
  let lastTapAt = -Infinity;

  function clearHoldTimer() {
    if (holdTimerId !== null) {
      clearTimeout(holdTimerId);
      holdTimerId = null;
    }
  }

  function clearPendingTap() {
    if (pendingTapTimerId !== null) {
      clearTimeout(pendingTapTimerId);
      pendingTapTimerId = null;
    }
  }

  function resetPointerState() {
    pointerDown = false;
    pointerId = null;
    movedBeyondTap = false;
    holdStarted = false;
    clearHoldTimer();
  }

  function pointerDistance(x, y) {
    return Math.hypot(x - downX, y - downY);
  }

  function onPointerDown(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerDown) return;
    if (e.pointerType === 'touch') e.preventDefault();
    pointerDown = true;
    pointerId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    downAt = performance.now();
    movedBeyondTap = false;
    holdStarted = false;
    clearHoldTimer();
    holdTimerId = setTimeout(() => {
      holdTimerId = null;
      if (!pointerDown || movedBeyondTap || holdStarted) return;
      holdStarted = true;
      handlers.onHoldStart({ x: downX, y: downY, event: e });
    }, GESTURE.HOLD_DELAY_MS);

    if (typeof canvas.setPointerCapture === 'function') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Some environments can reject pointer capture; gesture tracking still works.
      }
    }
  }

  function onPointerMove(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerDown && pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();
    handlers.onMove(e.clientX);
    if (!pointerDown || pointerId !== e.pointerId) return;

    if (!movedBeyondTap && pointerDistance(e.clientX, e.clientY) > GESTURE.TAP_MAX_MOVEMENT_PX) {
      movedBeyondTap = true;
      clearHoldTimer();
    }
  }

  function onTouchMove(e) {
    const touchCount = Number.isFinite(e.touches?.length) ? e.touches.length : 0;
    if (isMultiTouchActionEnabled() && touchCount > 1) {
      return;
    }
    e.preventDefault();
    if (!e.touches || !e.touches.length) return;
    handlers.onMove(e.touches[0].clientX);
  }

  function onPointerUp(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (!pointerDown || pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();

    const upAt = performance.now();
    const duration = upAt - downAt;
    const upX = e.clientX;
    const upY = e.clientY;
    const dy = downY - upY;
    const travel = pointerDistance(upX, upY);
    const isTap =
      duration < GESTURE.TAP_MAX_DURATION_MS && travel <= GESTURE.TAP_MAX_MOVEMENT_PX && !holdStarted;
    const isSwipeUp = duration <= GESTURE.SWIPE_MAX_DURATION_MS && dy > GESTURE.SWIPE_UP_MIN_DISTANCE_PX;

    if (holdStarted) {
      handlers.onHoldEnd({ x: upX, y: upY, event: e });
      resetPointerState();
      return;
    }

    if (isSwipeUp) {
      handlers.onSwipeUp({ x: upX, y: upY, dy, event: e });
      resetPointerState();
      return;
    }

    if (isTap) {
      const tapPayload = { x: upX, y: upY, event: e };
      if (upAt - lastTapAt <= GESTURE.DOUBLE_TAP_WINDOW_MS) {
        clearPendingTap();
        lastTapAt = -Infinity;
        handlers.onDoubleTap(tapPayload);
      } else {
        lastTapAt = upAt;
        clearPendingTap();
        pendingTapTimerId = setTimeout(() => {
          pendingTapTimerId = null;
          handlers.onTap(tapPayload);
        }, GESTURE.DOUBLE_TAP_WINDOW_MS);
      }
    }

    if (typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Capture might already be released.
      }
    }
    resetPointerState();
  }

  function onPointerCancel(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (!pointerDown || pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();
    if (holdStarted) {
      handlers.onHoldEnd({ x: e.clientX, y: e.clientY, event: e });
    }
    if (typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Capture might already be released.
      }
    }
    resetPointerState();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });

  return () => {
    clearHoldTimer();
    clearPendingTap();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('touchmove', onTouchMove);
  };
}

function createStateChartRuntime(canvas, handlers) {
  let state = GESTURE_STATES.IDLE;
  let pointerId = null;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let movedBeyondTap = false;
  let holdTimerId = null;

  let pendingTapTimerId = null;
  let pendingTapAt = NEGATIVE_INFINITY;
  let pendingTapPayload = null;

  function clearHoldTimer() {
    if (holdTimerId !== null) {
      clearTimeout(holdTimerId);
      holdTimerId = null;
    }
  }

  function clearPendingTapTimer() {
    if (pendingTapTimerId !== null) {
      clearTimeout(pendingTapTimerId);
      pendingTapTimerId = null;
    }
  }

  function clearPendingTap() {
    clearPendingTapTimer();
    pendingTapAt = NEGATIVE_INFINITY;
    pendingTapPayload = null;
  }

  function hasPendingTap() {
    return pendingTapPayload !== null;
  }

  function pointerDistance(x, y) {
    return Math.hypot(x - downX, y - downY);
  }

  function safeSetPointerCapture(nextPointerId) {
    if (typeof canvas.setPointerCapture !== 'function') return;
    try {
      canvas.setPointerCapture(nextPointerId);
    } catch {
      // Capture can fail in some environments; recognition still works.
    }
  }

  function safeReleasePointerCapture(nextPointerId) {
    if (typeof canvas.releasePointerCapture !== 'function') return;
    try {
      canvas.releasePointerCapture(nextPointerId);
    } catch {
      // Capture can already be released.
    }
  }

  function clearActivePointer({ releaseCapture = true } = {}) {
    clearHoldTimer();
    if (releaseCapture && pointerId !== null) safeReleasePointerCapture(pointerId);
    pointerId = null;
    movedBeyondTap = false;
  }

  function setIdleOrPending() {
    state = hasPendingTap() ? GESTURE_STATES.TAP_PENDING : GESTURE_STATES.IDLE;
  }

  function beginTracking(e, now) {
    pointerId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    downAt = now;
    movedBeyondTap = false;
    state = GESTURE_STATES.TRACKING;
    clearHoldTimer();
    holdTimerId = setTimeout(() => {
      holdTimerId = null;
      if (state !== GESTURE_STATES.TRACKING) return;
      if (pointerId !== e.pointerId) return;
      if (movedBeyondTap) return;
      state = GESTURE_STATES.HOLDING;
      handlers.onHoldStart({ x: downX, y: downY, event: e });
    }, GESTURE.HOLD_DELAY_MS);
    safeSetPointerCapture(e.pointerId);
  }

  function schedulePendingTap(upAt, tapPayload) {
    clearPendingTapTimer();
    pendingTapAt = upAt;
    pendingTapPayload = tapPayload;
    state = GESTURE_STATES.TAP_PENDING;
    pendingTapTimerId = setTimeout(() => {
      pendingTapTimerId = null;
      if (!pendingTapPayload) return;
      const payload = pendingTapPayload;
      pendingTapAt = NEGATIVE_INFINITY;
      pendingTapPayload = null;
      if (state === GESTURE_STATES.TAP_PENDING) state = GESTURE_STATES.IDLE;
      handlers.onTap(payload);
    }, GESTURE.DOUBLE_TAP_WINDOW_MS);
  }

  function endHold(payload) {
    handlers.onHoldEnd(payload);
    clearActivePointer();
    setIdleOrPending();
  }

  function cancelPointer(e, { releaseCapture = true } = {}) {
    if (pointerId === null || pointerId !== e.pointerId) return;
    if (state === GESTURE_STATES.HOLDING) {
      handlers.onHoldEnd({ x: e.clientX, y: e.clientY, event: e });
    }
    clearActivePointer({ releaseCapture });
    setIdleOrPending();
  }

  function onPointerDown(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerId !== null) return;
    if (e.pointerType === 'touch') e.preventDefault();
    beginTracking(e, performance.now());
  }

  function onPointerMove(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerId !== null && pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();
    handlers.onMove(e.clientX);
    if (pointerId === null || pointerId !== e.pointerId) return;
    if (state !== GESTURE_STATES.TRACKING) return;

    if (!movedBeyondTap && pointerDistance(e.clientX, e.clientY) > GESTURE.TAP_MAX_MOVEMENT_PX) {
      movedBeyondTap = true;
      clearHoldTimer();
    }
  }

  function onTouchMove(e) {
    const touchCount = Number.isFinite(e.touches?.length) ? e.touches.length : 0;
    if (isMultiTouchActionEnabled() && touchCount > 1) {
      return;
    }
    e.preventDefault();
    if (!e.touches || !e.touches.length) return;
    handlers.onMove(e.touches[0].clientX);
  }

  function onPointerUp(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerId === null || pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();

    const upAt = performance.now();
    const duration = upAt - downAt;
    const upX = e.clientX;
    const upY = e.clientY;

    if (state === GESTURE_STATES.HOLDING) {
      endHold({ x: upX, y: upY, event: e });
      return;
    }

    const dy = downY - upY;
    const travel = pointerDistance(upX, upY);
    const isTap = duration < GESTURE.TAP_MAX_DURATION_MS && travel <= GESTURE.TAP_MAX_MOVEMENT_PX;
    const isSwipeUp = duration <= GESTURE.SWIPE_MAX_DURATION_MS && dy > GESTURE.SWIPE_UP_MIN_DISTANCE_PX;

    if (isSwipeUp) {
      handlers.onSwipeUp({ x: upX, y: upY, dy, event: e });
      clearActivePointer();
      setIdleOrPending();
      return;
    }

    if (isTap) {
      const tapPayload = { x: upX, y: upY, event: e };
      if (hasPendingTap() && upAt - pendingTapAt <= GESTURE.DOUBLE_TAP_WINDOW_MS) {
        clearPendingTap();
        handlers.onDoubleTap(tapPayload);
      } else {
        schedulePendingTap(upAt, tapPayload);
      }
    }

    clearActivePointer();
    if (!isTap) setIdleOrPending();
  }

  function onPointerCancel(e) {
    const multiTouchEnabled = isMultiTouchActionEnabled();
    if (!multiTouchEnabled && !e.isPrimary) return;
    if (pointerId === null || pointerId !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();
    cancelPointer(e);
  }

  function onLostPointerCapture(e) {
    if (pointerId === null || pointerId !== e.pointerId) return;
    cancelPointer(e, { releaseCapture: false });
  }

  function onWindowBlur() {
    if (pointerId === null) {
      clearPendingTap();
      state = GESTURE_STATES.IDLE;
      return;
    }
    if (state === GESTURE_STATES.HOLDING) {
      handlers.onHoldEnd({ x: downX, y: downY, event: null });
    }
    clearActivePointer({ releaseCapture: false });
    clearPendingTap();
    state = GESTURE_STATES.IDLE;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('lostpointercapture', onLostPointerCapture);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  const canListenOnWindow =
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function' &&
    typeof window.removeEventListener === 'function';
  if (canListenOnWindow) window.addEventListener('blur', onWindowBlur);

  return () => {
    clearHoldTimer();
    clearPendingTap();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('lostpointercapture', onLostPointerCapture);
    canvas.removeEventListener('touchmove', onTouchMove);
    if (canListenOnWindow) window.removeEventListener('blur', onWindowBlur);
  };
}
