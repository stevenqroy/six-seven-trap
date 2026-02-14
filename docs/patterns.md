# Mandatory Quality Patterns

Read this file before writing any support unit, enemy, or system module.

## Reference files — read first

- `src/supports/medic-firefly.js` — gold-standard support unit template
- `src/systems/support-runtime.js` — runtime all support units must use
- `src/enemies/harvester.js` — enemy module interface reference

## Match these patterns exactly

1. Use `createSupportRuntime` for support units — never manual lifecycle
2. Use internal clock (`runtimeNowMs += frameMs`) — never `performance.now()`
3. Receive state as parameter — never import `S` globally for logic
4. `destroy()` must reset EVERY instance field to default
5. `serializeDebug()` must list explicit named fields — never `...instance` spread
6. Add defensive helpers: `toFinite()`, `toNonNegativeFinite()`, `clamp()`, `normalizeState()`
7. Wrap external module reads in try/catch (see `readEnemyDebug()` in striker-hawk.js)
8. Add `buildProfile(context)` with a frozen `DEFAULT_PROFILE`
