import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const flagsMock = vi.hoisted(() => ({
  getAllFlags: vi.fn(),
  toggleFlag: vi.fn(),
  resetFlags: vi.fn(),
  exportFlagURL: vi.fn(() => 'http://localhost/game'),
  getFlagMetadata: vi.fn(),
}));

vi.mock('../../../src/config/flags.js', () => ({
  getAllFlags: flagsMock.getAllFlags,
  toggleFlag: flagsMock.toggleFlag,
  resetFlags: flagsMock.resetFlags,
  exportFlagURL: flagsMock.exportFlagURL,
  getFlagMetadata: flagsMock.getFlagMetadata,
}));

async function loadDebugPanelModule() {
  vi.resetModules();
  return import('../../../src/config/debug-panel.js');
}

function ensureWindowEventApi() {
  const listeners = new Map();
  const previousAdd = window.addEventListener;
  const previousRemove = window.removeEventListener;
  const previousDispatch = window.dispatchEvent;

  window.addEventListener = vi.fn((type, handler) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
  });

  window.removeEventListener = vi.fn((type, handler) => {
    const set = listeners.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) listeners.delete(type);
  });

  window.dispatchEvent = vi.fn((event) => {
    const set = listeners.get(event.type);
    if (!set) return true;
    for (const handler of set) handler(event);
    return true;
  });

  return () => {
    if (typeof previousAdd === 'function') window.addEventListener = previousAdd;
    else delete window.addEventListener;
    if (typeof previousRemove === 'function') window.removeEventListener = previousRemove;
    else delete window.removeEventListener;
    if (typeof previousDispatch === 'function') window.dispatchEvent = previousDispatch;
    else delete window.dispatchEvent;
  };
}

function createKeyboardToggleEvent() {
  return new KeyboardEvent('keydown', {
    key: 'D',
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
}

describe('debug panel (S7R-079)', () => {
  let debugPanelModule;
  let destroy;
  let flagsState;
  let restoreWindowEventApi;

  beforeEach(async () => {
    flagsMock.getAllFlags.mockReset();
    flagsMock.toggleFlag.mockReset();
    flagsMock.resetFlags.mockReset();
    flagsMock.exportFlagURL.mockReset();
    flagsMock.getFlagMetadata.mockReset();

    flagsState = {
      debugMode: true,
      telemetry: false,
      deterministicRNG: false,
    };

    flagsMock.getAllFlags.mockImplementation(() => ({ ...flagsState }));
    flagsMock.toggleFlag.mockImplementation((flagName) => {
      flagsState[flagName] = !flagsState[flagName];
    });
    flagsMock.exportFlagURL.mockReturnValue('http://localhost/game?flags=debugMode:true');
    flagsMock.getFlagMetadata.mockImplementation(() => ({
      defaults: {},
      active: { ...flagsState },
      modified: { debugMode: true },
    }));

    restoreWindowEventApi = ensureWindowEventApi();

    document.getElementById('s7r-debug-panel')?.remove();
    document.getElementById('s7r-debug-panel-style')?.remove();
    window.showDebugPanel = undefined;
    window.hideDebugPanel = undefined;
    window.toggleDebugPanel = undefined;

    vi.spyOn(console, 'log').mockImplementation(() => {});

    debugPanelModule = await loadDebugPanelModule();
    destroy = null;
  });

  afterEach(() => {
    if (destroy) {
      destroy();
    }
    if (restoreWindowEventApi) {
      restoreWindowEventApi();
      restoreWindowEventApi = null;
    }
    document.getElementById('s7r-debug-panel')?.remove();
    document.getElementById('s7r-debug-panel-style')?.remove();
    window.showDebugPanel = undefined;
    window.hideDebugPanel = undefined;
    window.toggleDebugPanel = undefined;
    vi.restoreAllMocks();
  });

  it('initDebugPanel registers listeners once and showDebugPanel creates a single DOM panel', () => {
    const documentAddSpy = vi.spyOn(document, 'addEventListener');
    const windowAddSpy = window.addEventListener;

    const firstInit = debugPanelModule.initDebugPanel();
    destroy = firstInit.destroy;
    debugPanelModule.initDebugPanel();

    const keydownAdds = documentAddSpy.mock.calls.filter(([eventType]) => eventType === 'keydown').length;
    const flagChangeAdds = windowAddSpy.mock.calls.filter(([eventType]) => eventType === 'flagchange').length;
    const flagsResetAdds = windowAddSpy.mock.calls.filter(([eventType]) => eventType === 'flagsreset').length;

    expect(keydownAdds).toBe(1);
    expect(flagChangeAdds).toBe(1);
    expect(flagsResetAdds).toBe(1);

    debugPanelModule.showDebugPanel();
    debugPanelModule.showDebugPanel();

    expect(document.querySelectorAll('#s7r-debug-panel')).toHaveLength(1);
    expect(document.querySelectorAll('#s7r-debug-panel-style')).toHaveLength(1);
    expect(window.showDebugPanel).toBeTypeOf('function');
    expect(window.hideDebugPanel).toBeTypeOf('function');
    expect(window.toggleDebugPanel).toBeTypeOf('function');
  });

  it('toggleDebugPanel shows then hides the panel', () => {
    const panelApi = debugPanelModule.initDebugPanel();
    destroy = panelApi.destroy;

    debugPanelModule.toggleDebugPanel();
    const panel = document.getElementById('s7r-debug-panel');
    expect(panel).toBeTruthy();
    expect(panel.style.display).toBe('flex');

    debugPanelModule.toggleDebugPanel();
    expect(panel.style.display).toBe('none');
  });

  it('keyboard shortcut toggles visibility', () => {
    const panelApi = debugPanelModule.initDebugPanel();
    destroy = panelApi.destroy;

    const showEvent = createKeyboardToggleEvent();
    document.dispatchEvent(showEvent);
    const panel = document.getElementById('s7r-debug-panel');
    expect(panel).toBeTruthy();
    expect(panel.style.display).toBe('flex');

    const hideEvent = createKeyboardToggleEvent();
    document.dispatchEvent(hideEvent);
    expect(panel.style.display).toBe('none');
  });

  it('destroy removes panel, globals, and listeners across repeated init/destroy cycles', () => {
    const documentAddSpy = vi.spyOn(document, 'addEventListener');
    const documentRemoveSpy = vi.spyOn(document, 'removeEventListener');
    const windowAddSpy = window.addEventListener;
    const windowRemoveSpy = window.removeEventListener;

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const panelApi = debugPanelModule.initDebugPanel();
      debugPanelModule.showDebugPanel();
      panelApi.destroy();
    }

    const keydownAdds = documentAddSpy.mock.calls.filter(([eventType]) => eventType === 'keydown').length;
    const keydownRemoves = documentRemoveSpy.mock.calls.filter(([eventType]) => eventType === 'keydown').length;
    const flagChangeAdds = windowAddSpy.mock.calls.filter(([eventType]) => eventType === 'flagchange').length;
    const flagChangeRemoves = windowRemoveSpy.mock.calls.filter(([eventType]) => eventType === 'flagchange').length;
    const flagsResetAdds = windowAddSpy.mock.calls.filter(([eventType]) => eventType === 'flagsreset').length;
    const flagsResetRemoves = windowRemoveSpy.mock.calls.filter(([eventType]) => eventType === 'flagsreset').length;

    expect(keydownAdds).toBe(3);
    expect(keydownRemoves).toBe(3);
    expect(flagChangeAdds).toBe(3);
    expect(flagChangeRemoves).toBe(3);
    expect(flagsResetAdds).toBe(3);
    expect(flagsResetRemoves).toBe(3);
    expect(document.getElementById('s7r-debug-panel')).toBeNull();
    expect(document.getElementById('s7r-debug-panel-style')).toBeNull();
    expect(window.showDebugPanel).toBeUndefined();
    expect(window.hideDebugPanel).toBeUndefined();
    expect(window.toggleDebugPanel).toBeUndefined();

    document.dispatchEvent(createKeyboardToggleEvent());
    expect(document.getElementById('s7r-debug-panel')).toBeNull();
  });

  it('renders flags from getAllFlags and toggles a flag from the panel UI', () => {
    const panelApi = debugPanelModule.initDebugPanel();
    destroy = panelApi.destroy;
    debugPanelModule.showDebugPanel();

    const debugModeToggle = document.querySelector('[data-flag="debugMode"]');
    const telemetryToggle = document.querySelector('[data-flag="telemetry"]');

    expect(debugModeToggle.textContent).toContain('ON');
    expect(debugModeToggle.className).toContain('active');
    expect(telemetryToggle.textContent).toContain('OFF');

    telemetryToggle.click();

    expect(flagsMock.toggleFlag).toHaveBeenCalledWith('telemetry');
    const rerenderedTelemetryToggle = document.querySelector('[data-flag="telemetry"]');
    expect(rerenderedTelemetryToggle.textContent).toContain('ON');
    expect(flagsMock.getAllFlags).toHaveBeenCalled();
    expect(flagsMock.getFlagMetadata).toHaveBeenCalled();
  });
});
