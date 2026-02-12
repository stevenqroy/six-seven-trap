import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const FRAME_W = 480;
const FRAME_H = 270;
const COLS = 8;
const ROWS = 16;
const TOTAL_FRAMES = 128;

const inputPath = path.resolve('src/assets/sprite-laugh.png');
const outputPath = path.resolve('src/assets/sprite-laugh-clean.png');

const raw = fs.readFileSync(inputPath);
const png = PNG.sync.read(raw);

const expectedW = FRAME_W * COLS;
const expectedH = FRAME_H * ROWS;
if (png.width !== expectedW || png.height !== expectedH) {
  throw new Error(
    `Unexpected sheet size ${png.width}x${png.height}. Expected ${expectedW}x${expectedH}.`
  );
}

const out = new PNG({ width: png.width, height: png.height });
const src = png.data;
const dst = out.data;

function median(values) {
  values.sort((a, b) => a - b);
  return values[(values.length / 2) | 0];
}

function idx(width, x, y) {
  return (y * width + x) * 4;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const frameX = (frame % COLS) * FRAME_W;
  const frameY = Math.floor(frame / COLS) * FRAME_H;

  const pixelCount = FRAME_W * FRAME_H;
  const r0 = new Uint8Array(pixelCount);
  const g0 = new Uint8Array(pixelCount);
  const b0 = new Uint8Array(pixelCount);
  const a0 = new Uint8Array(pixelCount);
  const a1 = new Uint8Array(pixelCount);
  const r1 = new Uint8Array(pixelCount);
  const g1 = new Uint8Array(pixelCount);
  const b1 = new Uint8Array(pixelCount);

  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const si = idx(png.width, frameX + x, frameY + y);
      const pi = y * FRAME_W + x;
      r0[pi] = src[si];
      g0[pi] = src[si + 1];
      b0[pi] = src[si + 2];
      a0[pi] = src[si + 3];
    }
  }

  // Pass 1: remove transparent/near-transparent noise and tiny alpha speckles.
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const pi = y * FRAME_W + x;
      const a = a0[pi];
      if (a < 18) {
        a1[pi] = 0;
        continue;
      }

      let neighbors = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
          const ni = ny * FRAME_W + nx;
          if (a0[ni] > 22) neighbors++;
        }
      }

      if (a < 72 && neighbors <= 1) {
        a1[pi] = 0;
      } else if (a > 245) {
        a1[pi] = 255;
      } else {
        a1[pi] = a;
      }
    }
  }

  // Pass 2: edge-preserving median cleanup in visible pixels.
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const pi = y * FRAME_W + x;
      if (a1[pi] <= 20) {
        r1[pi] = 0;
        g1[pi] = 0;
        b1[pi] = 0;
        continue;
      }

      const cr = r0[pi];
      const cg = g0[pi];
      const cb = b0[pi];

      const rs = [];
      const gs = [];
      const bs = [];

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
          const ni = ny * FRAME_W + nx;
          if (a1[ni] <= 20) continue;

          const dr = r0[ni] - cr;
          const dg = g0[ni] - cg;
          const db = b0[ni] - cb;
          const dist = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
          if (dist > 120) continue;

          rs.push(r0[ni]);
          gs.push(g0[ni]);
          bs.push(b0[ni]);
        }
      }

      if (rs.length >= 4) {
        r1[pi] = median(rs);
        g1[pi] = median(gs);
        b1[pi] = median(bs);
      } else {
        r1[pi] = cr;
        g1[pi] = cg;
        b1[pi] = cb;
      }
    }
  }

  // Pass 3: write frame back, with a tiny contrast lift for clarity.
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const pi = y * FRAME_W + x;
      const di = idx(out.width, frameX + x, frameY + y);
      const a = a1[pi];
      if (a === 0) {
        dst[di] = 0;
        dst[di + 1] = 0;
        dst[di + 2] = 0;
        dst[di + 3] = 0;
      } else {
        dst[di] = clamp((r1[pi] - 128) * 1.04 + 128, 0, 255) | 0;
        dst[di + 1] = clamp((g1[pi] - 128) * 1.04 + 128, 0, 255) | 0;
        dst[di + 2] = clamp((b1[pi] - 128) * 1.04 + 128, 0, 255) | 0;
        dst[di + 3] = a;
      }
    }
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(out, { colorType: 6 }));
