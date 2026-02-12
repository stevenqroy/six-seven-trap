# S7R-002 Interactive Demo

## Deterministic RNG + Seed Replay

**Status:** ✅ Ready to test
**Dev Server:** http://127.0.0.1:5173

---

## Demo 1: Seeded Gameplay

### Test Same Seed Produces Same Behavior

1. Open: http://127.0.0.1:5173/?seed=2026
2. Open browser console (F12)
3. Look for: `[S7R:RNG] game-reset seed=2026 deterministic=true`
4. Start the game and note:
   - First few trap spawn positions
   - First few ability spawns
   - Enemy movement patterns
5. Refresh and play again with same seed
6. **Expected:** Exact same spawn sequence!

### Compare Different Seeds

1. Play with seed=2026 (note behavior)
2. Play with seed=9999 (note behavior)
3. **Expected:** Different spawn patterns

---

## Demo 2: Console Verification

Open console and run:

```javascript
// Import the RNG (already loaded in game)
// Check current run metadata
console.log('Seed:', window.S?.runSeed);
console.log('Deterministic:', window.S?.runDeterministicRng);
console.log('RNG Draws:', window.S?.runRngDrawCount);
```

---

## Demo 3: Feature Flag Control

### Method 1: Query String
```
http://127.0.0.1:5173/?flags=deterministicRNG:true
```
- Uses Date.now() as seed (different each time)
- But still deterministic for that run

### Method 2: Debug Panel
1. Press `Ctrl+Shift+D`
2. Find "Phase 0: Infrastructure"
3. Toggle `deterministicRNG` flag ON
4. Reload page
5. Console shows deterministic mode enabled

### Method 3: Explicit Seed
```
http://127.0.0.1:5173/?seed=12345
```
- Forces deterministic mode
- Uses seed=12345

---

## Demo 4: Console Logging

Play a full game and watch the console output:

**On Game Start:**
```
[S7R:RNG] game-reset seed=1234567890 deterministic=true
```

**On Victory/Game Over:**
```
[S7R:RUN] victory seed=1234567890 deterministic=true
          draws=2847 score=12500 bestCombo=45 timeMs=128400
```

**Metrics Explained:**
- `seed=` - The seed used for this run
- `deterministic=` - Was RNG deterministic?
- `draws=` - How many random numbers generated
- `score=` - Final score
- `bestCombo=` - Highest combo achieved
- `timeMs=` - Run duration

---

## Demo 5: Automated Test Demonstration

Run the replay parity test:

```bash
cd /Users/steven/Documents/Six\ Seven
npm run test:integration -- tests/integration/seeded-replay-parity.test.js
```

**What it tests:**
1. Creates two runs with seed=7777
2. Simulates 80 gameplay steps each
3. Compares event sequences
4. **Result:** Identical sequences = deterministic ✅

**Test output:**
```
✓ repeats identical event sequence for the same seed
✓ changes event sequence for different seeds
```

---

## Demo 6: Replay a Specific Run

### Share a Seed with Friends:

1. Play a game: http://127.0.0.1:5173/?seed=42
2. Note your final score
3. Share the URL with someone
4. They play with the same seed
5. **Expected:** They can get the exact same spawn sequence!

**Use Cases:**
- Challenge runs (who can score highest on seed X?)
- Bug reproduction (report: "Bug occurs on seed=7890")
- Speedrun routes (optimize specific seed)
- Testing enemy behaviors

---

## Demo 7: Draw Count Tracking

```javascript
// In console during gameplay:
setInterval(() => {
  console.log('RNG draws so far:', window.S?.runRngDrawCount);
}, 2000);
```

Watch the draw count increase as:
- Enemies spawn
- Abilities are selected
- Positions are randomized
- Flight paths are generated

---

## Demo 8: Verify Math.random Replacement

Check that NO `Math.random()` calls remain:

```bash
cd /Users/steven/Documents/Six\ Seven
grep -n "Math.random()" src/main.js
```

**Expected output:** (empty - no matches)

All randomness now goes through the seeded RNG!

---

## Demo 9: Test URL Formats

All of these work:

```
http://127.0.0.1:5173/?seed=2026
http://127.0.0.1:5173/?seed=999999999
http://127.0.0.1:5173/?seed=-1
http://127.0.0.1:5173/?flags=deterministicRNG:true&seed=2026
http://127.0.0.1:5173/?seed=42.7 (truncates to 42)
```

Invalid seeds fallback safely:
```
http://127.0.0.1:5173/?seed=abc (ignored, uses Date.now)
```

---

## Demo 10: Verify Test Coverage

```bash
npm run test:coverage
```

**Check RNG coverage:**
- `src/utils/rng.js` - Should be 100%
- `src/core/run-rng.js` - Should be high coverage

---

## Expected Behaviors

### ✅ Deterministic Mode (with seed)
- Same seed = same gameplay every time
- Spawn positions identical
- Ability spawns identical
- Enemy patterns identical
- Fully reproducible

### ✅ Non-Deterministic Mode (default)
- Each run is different
- Uses Date.now() as seed
- Traditional random behavior
- No replay capability

### ✅ Console Logs
- Run start shows seed and mode
- Run end shows statistics
- Draw count tracks RNG usage
- All metadata captured

---

## Troubleshooting

### Seed doesn't seem to work
- Check console for `[S7R:RNG]` messages
- Verify seed in URL is a valid number
- Try clearing cache and reloading

### Different behavior on same seed
- Make sure you're comparing from game start (not mid-run)
- Check that no other random elements exist (should not happen)
- Verify same game version/build

### Console doesn't show RNG messages
- Check console filters (should show "info" level)
- Look for any JavaScript errors
- Verify game loaded successfully

---

## Success Criteria

After testing, you should observe:

✅ **Deterministic Replay Works:**
- Same seed produces identical gameplay
- Spawn patterns repeat exactly
- Console logs confirm seed usage

✅ **Flag Integration Works:**
- `deterministicRNG` flag available
- Query string `?seed=` works
- Both methods enable deterministic mode

✅ **Logging Works:**
- Run start logs seed
- Run end logs statistics
- Draw count tracks correctly

✅ **Game Still Works:**
- No crashes or errors
- Performance is good
- Plays normally

---

## Next Steps After Verification

Once all demos pass:
1. ✅ Mark S7R-002 as verified
2. ✅ Merge to main branch
3. ✅ Proceed to S7R-003 (Telemetry)
4. ✅ Start using seeded runs for testing

---

**Happy Testing! 🎲**

S7R-002 provides the foundation for:
- Deterministic testing
- Bug reproduction
- Challenge runs
- Automated validation
- Performance profiling
