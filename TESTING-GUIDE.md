# Feature Flags Testing Guide

The dev server is running at: **http://127.0.0.1:5173**

## Quick Tests You Can Run

### 1. Test Debug Panel (Visual UI)

1. Open the game in your browser: http://127.0.0.1:5173
2. Press **`Ctrl+Shift+D`** (or `Cmd+Shift+D` on Mac)
3. You should see a green terminal-style debug panel appear in the top-right
4. Try the following:
   - ✅ Toggle a flag (e.g., `debugMode`) - button should change from OFF to ON
   - ✅ Click "Reset All" - all flags should return to OFF
   - ✅ Click "Copy URL" - should copy a shareable URL to clipboard
   - ✅ Drag the panel header - panel should move
   - ✅ Press `Ctrl+Shift+D` again - panel should close

### 2. Test Console API

Open the browser console (F12) and try these commands:

```javascript
// Get a flag value
window.getFlag('debugMode')
// Should return: false

// Set a flag
window.setFlag('debugMode', true)
// Should log: [Flags] debugMode: false → true
// Should return: true

// Check the flag again
window.getFlag('debugMode')
// Should return: true

// Toggle a flag
window.toggleFlag('debugMode')
// Should log: [Flags] debugMode: true → false

// Get all flags
window.getAllFlags()
// Should return: Object with 45+ flags

// Reset all flags
window.resetFlags()
// Should log: [Flags] Reset to defaults
```

### 3. Test Query String Flags

1. Visit: http://127.0.0.1:5173/?flags=debugMode:true,telemetry:1
2. Open console (F12)
3. Check for: `[Flags] Active overrides: debugMode=true, telemetry=true`
4. Verify flags are enabled:
   ```javascript
   window.getFlag('debugMode')   // Should return: true
   window.getFlag('telemetry')   // Should return: true
   ```

### 4. Test localStorage Persistence

```javascript
// In console:
window.setFlag('debugMode', true)
window.setFlag('telemetry', true)

// Reload the page (F5)

// After reload, check flags:
window.getFlag('debugMode')   // Should return: true (persisted!)
window.getFlag('telemetry')   // Should return: true (persisted!)

// Clean up:
window.resetFlags()
```

### 5. Test Flag Events

```javascript
// Listen for flag changes
window.addEventListener('flagchange', (e) => {
  console.log('Flag changed:', e.detail);
});

// Now toggle a flag
window.toggleFlag('debugMode');
// You should see: Flag changed: {flagName: "debugMode", oldValue: false, newValue: true}

// Listen for reset events
window.addEventListener('flagsreset', () => {
  console.log('All flags were reset!');
});

// Trigger reset
window.resetFlags();
// You should see: All flags were reset!
```

### 6. Test Game Still Works

1. Make sure the game loads normally
2. Click "Start Game"
3. Verify the game plays as expected
4. The flag system should not interfere with gameplay at all

### 7. Test S7R-007 Accessibility Settings

1. Open: `http://127.0.0.1:5173/?flags=accessibilitySettings:true`
2. Start a run and click `Settings` in HUD
3. Toggle:
   - `Reduced Motion`
   - `Low Graphics Mode`
   - `High Contrast UI`
   - `Control Size` -> `Extra Large`
4. Close panel and reload page
5. Re-open Settings and verify all values persisted

---

## Expected Console Output on Load

When you first load the game, you should see in the console:

```
[Flags] Reset to defaults
[DebugPanel] Initialized. Press Ctrl+Shift+D or call window.toggleDebugPanel()
```

If you load with query string flags:
```
[Flags] Active overrides: debugMode=true, telemetry=true
[DebugPanel] Initialized. Press Ctrl+Shift+D or call window.toggleDebugPanel()
```

---

## Visual Debug Panel Features

The debug panel shows all 45 flags organized by phase:

- **Phase 0: Infrastructure** (3 flags)
- **Phase 1: Mobile Runtime** (4 flags)
- **Phase 2: Enemy System** (5 flags)
- **Phase 3: Enemy Pack Alpha** (6 flags)
- **Phase 4: Enemy Pack Beta** (12 flags)
- **Phase 5: Player Counterplay** (4 flags)
- **Phase 6: Guardian Command** (8 flags)
- **Phase 7: App Productization** (3 flags)

**Visual Indicators:**
- Green border on left = Flag is ON
- Yellow border = Flag was modified from default
- Stats at bottom show: Total / Active / Modified counts

---

## Automated Tests

You can also run the automated test suite:

```bash
# Install Playwright Chromium once (first machine setup)
npm run test:e2e:install

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end smoke test
npm run test:e2e

# Run all tests (unit + integration + e2e)
npm run test:all

# Watch mode (Vitest)
npm run test:watch

# Coverage report
npm run test:coverage

# Deliberate failure gate check (should exit non-zero)
npm run test:fail-check

# Mobile benchmark harness summary (S7R-010)
npm run benchmark:mobile
```

`npm run test:all` is the required baseline validation gate for tickets.

---

## Build Verification

```bash
# Lint check
npm run lint

# Production build
npm run build

# Both lint + build
npm run verify

# Full validation (lint + tests + build)
npm run validate:all
```

All should pass with no errors.

---

## Troubleshooting

### Debug panel doesn't appear
- Check console for errors
- Try: `window.toggleDebugPanel()` directly
- Make sure you pressed `Ctrl+Shift+D` (not just Ctrl+D)

### Flags don't persist
- Check browser allows localStorage
- Try opening DevTools → Application → Local Storage
- Look for key: `s7r-flags`

### Console API not working
- Make sure game has loaded fully
- Check for: `window.getFlag` - should be a function
- If undefined, check console for initialization errors

---

## Clean Up

When done testing:

```bash
# Stop dev server
killall node

# Or find the process
lsof -ti:5173 | xargs kill
```

---

## What to Look For

✅ **Success Indicators:**
- Debug panel appears and is interactive
- Console API commands work
- Query string flags parse correctly
- localStorage persists across reload
- Game still loads and plays normally
- No console errors during operation

❌ **Failure Indicators:**
- Any console errors
- Debug panel doesn't render
- Flags don't toggle
- Game fails to load
- localStorage doesn't persist

---

**Happy Testing! 🎮**

If everything works as described above, S7R-001 is fully functional and ready for production.
