import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';

const INPUT_SHEET = path.resolve('src/assets/test-sheet-opaque.png');
const OUTPUT_RAW = path.resolve('src/assets/test-sheet-raw.png');
const OUTPUT_BEST = path.resolve('src/assets/test-sheet-best.png');
const FRAME_W = 480;
const FRAME_H = 270;

const COLS = 8;
const ROWS = 16;
const FRAMES = 128;

function idx(w, x, y) {
  return (y * w + x) * 4;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function estimateBackgroundColor(frame, w, h) {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  const step = 2;

  for (let x = 0; x < w; x += step) {
    const iTop = idx(w, x, 0);
    const iBottom = idx(w, x, h - 1);
    rSum += frame[iTop];
    gSum += frame[iTop + 1];
    bSum += frame[iTop + 2];
    rSum += frame[iBottom];
    gSum += frame[iBottom + 1];
    bSum += frame[iBottom + 2];
    n += 2;
  }
  for (let y = 0; y < h; y += step) {
    const iLeft = idx(w, 0, y);
    const iRight = idx(w, w - 1, y);
    rSum += frame[iLeft];
    gSum += frame[iLeft + 1];
    bSum += frame[iLeft + 2];
    rSum += frame[iRight];
    gSum += frame[iRight + 1];
    bSum += frame[iRight + 2];
    n += 2;
  }

  return {
    r: (rSum / Math.max(1, n)) | 0,
    g: (gSum / Math.max(1, n)) | 0,
    b: (bSum / Math.max(1, n)) | 0,
  };
}

function colorDistL1(r, g, b, bg) {
  return Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
}

function colorSat(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn;
}

function isStrongBackgroundLike(r, g, b, bg) {
  const d = colorDistL1(r, g, b, bg);
  const sat = colorSat(r, g, b);
  const bright = Math.max(r, g, b);
  return d <= 38 || (d <= 58 && sat <= 16 && bright >= 205) || (d <= 72 && sat <= 10 && bright >= 228);
}

function isSoftBackgroundLike(r, g, b, bg) {
  const d = colorDistL1(r, g, b, bg);
  const sat = colorSat(r, g, b);
  const bright = Math.max(r, g, b);
  return d <= 56 || (d <= 84 && sat <= 24 && bright >= 188) || (d <= 102 && sat <= 16 && bright >= 214);
}

function keyOutBackground(frame, w, h, bg) {
  const visited = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  function push(x, y) {
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * 4;
    const a = frame[i + 3];
    if (a === 0) return;
    const r = frame[i];
    const g = frame[i + 1];
    const b = frame[i + 2];
    const match = isStrongBackgroundLike(r, g, b, bg);
    if (!match) return;
    q[tail++] = p;
  }

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (head < tail) {
    const p = q[head++];
    const x = p % w;
    const y = (p / w) | 0;
    const i = p * 4;
    frame[i] = 0;
    frame[i + 1] = 0;
    frame[i + 2] = 0;
    frame[i + 3] = 0;

    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Feather near keyed edges to avoid hard matte halo.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const i = p * 4;
      const a = frame[i + 3];
      if (a === 0) continue;
      const r = frame[i];
      const g = frame[i + 1];
      const b = frame[i + 2];
      const d = colorDistL1(r, g, b, bg);
      const sat = colorSat(r, g, b);
      if (d > 102 || sat > 42) continue;

      let neighborCleared = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          if (frame[ni + 3] === 0) neighborCleared++;
        }
      }
      if (neighborCleared >= 2) {
        const soft = clamp(((d - 24) / 66) * 255, 12, 255) | 0;
        frame[i + 3] = Math.min(a, soft);
      }
    }
  }
}

function stripBackgroundIslands(frame, w, h, bg) {
  const out = Buffer.from(frame);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      if (frame[i + 3] <= 0) continue;
      const r = frame[i];
      const g = frame[i + 1];
      const b = frame[i + 2];
      if (!isStrongBackgroundLike(r, g, b, bg)) continue;

      let localBg = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          if (frame[ni + 3] <= 12) {
            localBg++;
            continue;
          }
          const nr = frame[ni];
          const ng = frame[ni + 1];
          const nb = frame[ni + 2];
          if (isStrongBackgroundLike(nr, ng, nb, bg)) localBg++;
        }
      }

      if (localBg >= 5) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }
    }
  }

  return out;
}

function temporalStabilize(frames, w, h) {
  const n = frames.length;
  const out = frames.map((f) => Buffer.from(f));
  const pxCount = w * h;

  for (let fi = 0; fi < n; fi++) {
    const prev = frames[(fi - 1 + n) % n];
    const cur = frames[fi];
    const next = frames[(fi + 1) % n];
    const dst = out[fi];
    for (let p = 0; p < pxCount; p++) {
      const i = p * 4;
      if (cur[i + 3] <= 20 || prev[i + 3] <= 20 || next[i + 3] <= 20) continue;
      const dr = Math.abs(prev[i] - cur[i]) + Math.abs(next[i] - cur[i]);
      const dg = Math.abs(prev[i + 1] - cur[i + 1]) + Math.abs(next[i + 1] - cur[i + 1]);
      const db = Math.abs(prev[i + 2] - cur[i + 2]) + Math.abs(next[i + 2] - cur[i + 2]);
      if (dr + dg + db > 210) continue;
      dst[i] = ((cur[i] * 2 + prev[i] + next[i]) / 4) | 0;
      dst[i + 1] = ((cur[i + 1] * 2 + prev[i + 1] + next[i + 1]) / 4) | 0;
      dst[i + 2] = ((cur[i + 2] * 2 + prev[i + 2] + next[i + 2]) / 4) | 0;
    }
  }

  return out;
}

function temporalAlphaMedian(frames, w, h) {
  const n = frames.length;
  const out = frames.map((f) => Buffer.from(f));
  const pxCount = w * h;

  function med5(a, b, c, d, e) {
    const arr = [a, b, c, d, e];
    arr.sort((x, y) => x - y);
    return arr[2];
  }

  for (let fi = 0; fi < n; fi++) {
    const fm2 = frames[(fi - 2 + n) % n];
    const fm1 = frames[(fi - 1 + n) % n];
    const fc = frames[fi];
    const fp1 = frames[(fi + 1) % n];
    const fp2 = frames[(fi + 2) % n];
    const dst = out[fi];

    for (let p = 0; p < pxCount; p++) {
      const i = p * 4;
      const aMed = med5(fm2[i + 3], fm1[i + 3], fc[i + 3], fp1[i + 3], fp2[i + 3]);
      const aCur = fc[i + 3];
      let aOut = aCur;

      if (Math.abs(aCur - aMed) > 36) {
        aOut = ((aCur + aMed * 2) / 3) | 0;
      }
      if (aOut < 18) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }
      if (aOut > 246) aOut = 255;

      // If alpha exists here but current frame is weak, borrow color from temporal neighbors.
      if (aCur <= 24 && aOut > 24) {
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let c = 0;
        for (const f of [fm2, fm1, fp1, fp2]) {
          if (f[i + 3] <= 24) continue;
          rSum += f[i];
          gSum += f[i + 1];
          bSum += f[i + 2];
          c++;
        }
        if (c > 0) {
          dst[i] = (rSum / c) | 0;
          dst[i + 1] = (gSum / c) | 0;
          dst[i + 2] = (bSum / c) | 0;
        }
      }
      dst[i + 3] = aOut;
    }
  }

  return out;
}

function temporalAlphaStabilize(frames, w, h) {
  const n = frames.length;
  const out = frames.map((f) => Buffer.from(f));
  const pxCount = w * h;

  for (let fi = 0; fi < n; fi++) {
    const prev = frames[(fi - 1 + n) % n];
    const cur = frames[fi];
    const next = frames[(fi + 1) % n];
    const dst = out[fi];
    for (let p = 0; p < pxCount; p++) {
      const i = p * 4;
      const aPrev = prev[i + 3];
      const aCur = cur[i + 3];
      const aNext = next[i + 3];

      // Remove one-frame alpha flashes.
      if (aCur > 20 && aPrev <= 12 && aNext <= 12) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }

      // Fill one-frame alpha holes.
      if (aCur <= 12 && aPrev > 24 && aNext > 24) {
        dst[i] = ((prev[i] + next[i]) / 2) | 0;
        dst[i + 1] = ((prev[i + 1] + next[i + 1]) / 2) | 0;
        dst[i + 2] = ((prev[i + 2] + next[i + 2]) / 2) | 0;
        dst[i + 3] = ((aPrev + aNext) / 2) | 0;
      }
    }
  }

  return out;
}

function dropRareOpaquePixels(frames, w, h, minCount = 2) {
  const pxCount = w * h;
  const counts = new Uint16Array(pxCount);
  for (let fi = 0; fi < frames.length; fi++) {
    const frame = frames[fi];
    for (let p = 0; p < pxCount; p++) {
      if (frame[p * 4 + 3] > 20) counts[p]++;
    }
  }

  for (let fi = 0; fi < frames.length; fi++) {
    const frame = frames[fi];
    for (let p = 0; p < pxCount; p++) {
      if (counts[p] > minCount) continue;
      const i = p * 4;
      frame[i] = 0;
      frame[i + 1] = 0;
      frame[i + 2] = 0;
      frame[i + 3] = 0;
    }
  }
}

function clampAlphaAndDespill(frame, w, h, bg) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(w, x, y);
      let a = frame[i + 3];
      if (a <= 16) {
        frame[i] = 0;
        frame[i + 1] = 0;
        frame[i + 2] = 0;
        frame[i + 3] = 0;
        continue;
      }

      const r = frame[i];
      const g = frame[i + 1];
      const b = frame[i + 2];
      const d = colorDistL1(r, g, b, bg);
      const sat = colorSat(r, g, b);
      const bright = Math.max(r, g, b);

      if (a < 172 && d < 112 && sat < 54) {
        // Push likely matte leftovers toward transparent.
        const keep = clamp((d - 18) / 88, 0, 1);
        a = Math.min(a, (keep * keep * 255) | 0);
      }
      if (d < 58 && sat < 24 && bright >= 190) {
        a = Math.min(a, 84);
      }
      if (d < 36 && sat < 16 && bright >= 205) {
        a = Math.min(a, 32);
      }

      if (a < 18) {
        frame[i] = 0;
        frame[i + 1] = 0;
        frame[i + 2] = 0;
        frame[i + 3] = 0;
      } else {
        frame[i + 3] = a > 246 ? 255 : a;
      }
    }
  }
}

function refineMaskMorphology(frame, w, h) {
  const out = Buffer.from(frame);

  // Remove isolated specks and single-pixel threads.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      const a = frame[i + 3];
      if (a <= 20) continue;

      let n = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          if (frame[ni + 3] > 20) n++;
        }
      }
      if (n <= 1) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }
    }
  }

  // Fill tiny pinholes (alpha only), borrowing local color.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      if (out[i + 3] > 16) continue;
      let n = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          const na = out[ni + 3];
          if (na <= 20) continue;
          n++;
          rSum += out[ni];
          gSum += out[ni + 1];
          bSum += out[ni + 2];
        }
      }
      if (n >= 6) {
        out[i] = (rSum / n) | 0;
        out[i + 1] = (gSum / n) | 0;
        out[i + 2] = (bSum / n) | 0;
        out[i + 3] = 180;
      }
    }
  }

  return out;
}

function spatialClean(frame, w, h) {
  const src = frame;
  const out = Buffer.from(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      const a = src[i + 3];
      if (a <= 20) continue;

      let opaqueN = 0;
      let rSum = src[i];
      let gSum = src[i + 1];
      let bSum = src[i + 2];
      let wSum = 1;
      const cR = src[i];
      const cG = src[i + 1];
      const cB = src[i + 2];

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          const na = src[ni + 3];
          if (na <= 20) continue;
          opaqueN++;
          const nr = src[ni];
          const ng = src[ni + 1];
          const nb = src[ni + 2];
          const d = Math.abs(nr - cR) + Math.abs(ng - cG) + Math.abs(nb - cB);
          if (d > 105) continue;
          rSum += nr;
          gSum += ng;
          bSum += nb;
          wSum++;
        }
      }

      if (opaqueN <= 1) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      } else if (wSum >= 4) {
        out[i] = (rSum / wSum) | 0;
        out[i + 1] = (gSum / wSum) | 0;
        out[i + 2] = (bSum / wSum) | 0;
        if (a > 246) out[i + 3] = 255;
      }
    }
  }

  return out;
}

function aggressiveEdgeDehalo(frame, w, h, bg) {
  const src = frame;
  const out = Buffer.from(src);

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = idx(w, x, y);
      const a = src[i + 3];
      if (a <= 0) continue;

      let transparentNeighbors = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          if (src[ni + 3] <= 14) transparentNeighbors++;
        }
      }
      if (transparentNeighbors === 0) continue;

      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const d = colorDistL1(r, g, b, bg);
      const sat = colorSat(r, g, b);
      const bright = Math.max(r, g, b);
      const softBg = isSoftBackgroundLike(r, g, b, bg);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const ni = idx(w, x + ox, y + oy);
          const na = src[ni + 3];
          if (na <= 228) continue;
          const nr = src[ni];
          const ng = src[ni + 1];
          const nb = src[ni + 2];
          if (isSoftBackgroundLike(nr, ng, nb, bg)) continue;
          rSum += nr;
          gSum += ng;
          bSum += nb;
          count++;
        }
      }
      if (count > 0) {
        const tr = (rSum / count) | 0;
        const tg = (gSum / count) | 0;
        const tb = (bSum / count) | 0;
        const mix = softBg ? 0.86 : 0.62;
        out[i] = (r * (1 - mix) + tr * mix) | 0;
        out[i + 1] = (g * (1 - mix) + tg * mix) | 0;
        out[i + 2] = (b * (1 - mix) + tb * mix) | 0;
      }

      let aOut = a;
      if (softBg || (d < 120 && sat < 48 && bright > 165)) {
        const dFactor = 1 - clamp((d - 16) / 108, 0, 1);
        const sFactor = 1 - clamp((sat - 8) / 42, 0, 1);
        const bFactor = clamp((bright - 150) / 100, 0, 1);
        const cut = dFactor * 0.58 + sFactor * 0.28 + bFactor * 0.14;
        aOut = Math.max(0, Math.round(a * (1 - cut * 0.8)));
      }
      if (aOut < 16) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      } else {
        out[i + 3] = aOut;
      }
    }
  }

  return out;
}

function decontaminateEdges(frame, w, h, bg = null) {
  const src = frame;
  const out = Buffer.from(src);

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = idx(w, x, y);
      const a = src[i + 3];
      if (a <= 0 || a >= 255) continue;

      let hasTransparentNeighbor = false;
      for (let oy = -1; oy <= 1 && !hasTransparentNeighbor; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          if (src[ni + 3] <= 8) {
            hasTransparentNeighbor = true;
            break;
          }
        }
      }
      if (!hasTransparentNeighbor) continue;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let c = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const ni = idx(w, x + ox, y + oy);
          if (src[ni + 3] <= 220) continue;
          rSum += src[ni];
          gSum += src[ni + 1];
          bSum += src[ni + 2];
          c++;
        }
      }
      if (c === 0) continue;

      const tr = (rSum / c) | 0;
      const tg = (gSum / c) | 0;
      const tb = (bSum / c) | 0;
      out[i] = ((src[i] * 1 + tr * 3) / 4) | 0;
      out[i + 1] = ((src[i + 1] * 1 + tg * 3) / 4) | 0;
      out[i + 2] = ((src[i + 2] * 1 + tb * 3) / 4) | 0;

      if (bg) {
        const d = colorDistL1(out[i], out[i + 1], out[i + 2], bg);
        const sat = colorSat(out[i], out[i + 1], out[i + 2]);
        if (d < 94 && sat < 38) {
          const soft = clamp(((d - 18) / 76) * 255, 10, 255) | 0;
          out[i + 3] = Math.min(out[i + 3], soft);
          if (out[i + 3] < 16) {
            out[i] = 0;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 0;
          }
        }
      }
    }
  }
  return out;
}

function trimSoftAlphaHalo(frame, w, h, bg) {
  const src = frame;
  const out = Buffer.from(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      const a = src[i + 3];
      if (a <= 0) continue;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      if (!isSoftBackgroundLike(r, g, b, bg)) continue;

      let hasTransparent = false;
      let hasOpaque = false;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          const na = src[ni + 3];
          if (na <= 14) hasTransparent = true;
          if (na >= 210) hasOpaque = true;
        }
      }
      if (!hasTransparent) continue;

      if (a <= 96 || !hasOpaque) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
        continue;
      }

      const d = colorDistL1(r, g, b, bg);
      const sat = colorSat(r, g, b);
      const bright = Math.max(r, g, b);
      let alphaCap = clamp(((d - 12) / 96) * 255, 14, 168) | 0;
      if (sat < 26 && bright > 180) alphaCap = Math.min(alphaCap, 96);
      const aOut = Math.min(a, alphaCap);
      if (aOut < 24) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      } else {
        out[i + 3] = aOut;
      }
    }
  }

  return out;
}

function hardTrimBackgroundLikePixels(frame, w, h, bg) {
  const out = Buffer.from(frame);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      const a = frame[i + 3];
      if (a <= 0) continue;
      const r = frame[i];
      const g = frame[i + 1];
      const b = frame[i + 2];
      const strongBg = isStrongBackgroundLike(r, g, b, bg);
      const softBg = strongBg || isSoftBackgroundLike(r, g, b, bg);
      if (!softBg) continue;

      let bgLikeNeighbors = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ni = idx(w, x + ox, y + oy);
          const na = frame[ni + 3];
          if (na <= 14) {
            bgLikeNeighbors++;
            continue;
          }
          if (isSoftBackgroundLike(frame[ni], frame[ni + 1], frame[ni + 2], bg)) bgLikeNeighbors++;
        }
      }
      if (bgLikeNeighbors < 4) continue;

      if (strongBg || a <= 192) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
        continue;
      }

      const sat = colorSat(r, g, b);
      const bright = Math.max(r, g, b);
      if (sat < 24 && bright >= 184) {
        out[i + 3] = Math.min(a, 72);
      }
    }
  }

  return out;
}

function unsharpOpaque(frame, w, h, amount = 0.14) {
  const src = frame;
  const out = Buffer.from(src);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(w, x, y);
      const a = src[i + 3];
      if (a <= 88) continue;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let n = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const ni = idx(w, x + ox, y + oy);
          if (src[ni + 3] <= 88) continue;
          rSum += src[ni];
          gSum += src[ni + 1];
          bSum += src[ni + 2];
          n++;
        }
      }
      if (n < 4) continue;
      const br = rSum / n;
      const bg = gSum / n;
      const bb = bSum / n;
      out[i] = clamp(src[i] + (src[i] - br) * amount, 0, 255) | 0;
      out[i + 1] = clamp(src[i + 1] + (src[i + 1] - bg) * amount, 0, 255) | 0;
      out[i + 2] = clamp(src[i + 2] + (src[i + 2] - bb) * amount, 0, 255) | 0;
    }
  }
  return out;
}

function buildSheet(frames, w, h) {
  const sheet = new PNG({ width: w * COLS, height: h * ROWS });
  const maxFrames = Math.min(FRAMES, COLS * ROWS, frames.length);
  for (let fi = 0; fi < maxFrames; fi++) {
    const frame = frames[fi];
    const col = fi % COLS;
    const row = (fi / COLS) | 0;
    const dx = col * w;
    const dy = row * h;
    for (let y = 0; y < h; y++) {
      const srcStart = idx(w, 0, y);
      const dstStart = idx(sheet.width, dx, dy + y);
      frame.copy(sheet.data, dstStart, srcStart, srcStart + w * 4);
    }
  }
  return sheet;
}

const sourceSheet = PNG.sync.read(fs.readFileSync(INPUT_SHEET));
const w = FRAME_W;
const h = FRAME_H;
if (sourceSheet.width !== w * COLS || sourceSheet.height !== h * ROWS) {
  throw new Error(
    `Unexpected input sheet size ${sourceSheet.width}x${sourceSheet.height}; expected ${w * COLS}x${h * ROWS}`
  );
}
const frameCount = Math.min(FRAMES, COLS * ROWS);
const rawFrames = [];
for (let fi = 0; fi < frameCount; fi++) {
  const col = fi % COLS;
  const row = (fi / COLS) | 0;
  const frame = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = idx(sourceSheet.width, col * w, row * h + y);
    const dstStart = idx(w, 0, y);
    sourceSheet.data.copy(frame, dstStart, srcStart, srcStart + w * 4);
  }
  rawFrames.push(frame);
}

const frameBackgrounds = rawFrames.map((f) => estimateBackgroundColor(f, w, h));
for (let fi = 0; fi < rawFrames.length; fi++) {
  const bg = frameBackgrounds[fi];
  keyOutBackground(rawFrames[fi], w, h, bg);
  clampAlphaAndDespill(rawFrames[fi], w, h, bg);
  rawFrames[fi] = refineMaskMorphology(rawFrames[fi], w, h);
  rawFrames[fi] = stripBackgroundIslands(rawFrames[fi], w, h, bg);
  rawFrames[fi] = aggressiveEdgeDehalo(rawFrames[fi], w, h, bg);
  rawFrames[fi] = trimSoftAlphaHalo(rawFrames[fi], w, h, bg);
  rawFrames[fi] = hardTrimBackgroundLikePixels(rawFrames[fi], w, h, bg);
}
dropRareOpaquePixels(rawFrames, w, h, 1);

let bestFrames = rawFrames.map((f) => Buffer.from(f));
bestFrames = temporalStabilize(bestFrames, w, h);
bestFrames = temporalAlphaMedian(bestFrames, w, h);
bestFrames = temporalAlphaStabilize(bestFrames, w, h);
dropRareOpaquePixels(bestFrames, w, h, 3);
bestFrames = bestFrames.map((f) => spatialClean(f, w, h));
bestFrames = bestFrames.map((f, fi) => aggressiveEdgeDehalo(f, w, h, frameBackgrounds[fi]));
bestFrames = bestFrames.map((f, fi) => decontaminateEdges(f, w, h, frameBackgrounds[fi]));
bestFrames = bestFrames.map((f, fi) => aggressiveEdgeDehalo(f, w, h, frameBackgrounds[fi]));
bestFrames = bestFrames.map((f, fi) => trimSoftAlphaHalo(f, w, h, frameBackgrounds[fi]));
bestFrames = bestFrames.map((f, fi) => hardTrimBackgroundLikePixels(f, w, h, frameBackgrounds[fi]));
bestFrames = bestFrames.map((f) => unsharpOpaque(f, w, h));

const rawSheet = buildSheet(rawFrames, w, h);
const bestSheet = buildSheet(bestFrames, w, h);

fs.writeFileSync(OUTPUT_RAW, PNG.sync.write(rawSheet, { colorType: 6 }));
fs.writeFileSync(OUTPUT_BEST, PNG.sync.write(bestSheet, { colorType: 6 }));
