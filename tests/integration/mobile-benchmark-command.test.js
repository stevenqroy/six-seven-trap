import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

describe('mobile benchmark command integration', () => {
  it('writes machine-readable summary via benchmark:mobile dry-run mode', async () => {
    const outputPath = path.join(
      ROOT_DIR,
      'test-results',
      'benchmarks',
      'mobile-benchmark-integration-summary.json'
    );
    await fs.rm(outputPath, { force: true });

    const { stdout } = await execFileAsync(
      NPM_CMD,
      [
        'run',
        'benchmark:mobile',
        '--',
        '--dry-run',
        '--iterations',
        '2',
        '--duration-ms',
        '1200',
        '--warmup-ms',
        '100',
        '--output',
        outputPath,
      ],
      {
        cwd: ROOT_DIR,
        timeout: 120000,
      }
    );

    expect(stdout).toContain('[S7R-010]');

    const summaryText = await fs.readFile(outputPath, 'utf8');
    const summary = JSON.parse(summaryText);
    expect(summary.ticket).toBe('S7R-010');
    expect(summary.mode).toBe('dry-run');
    expect(Array.isArray(summary.runs)).toBe(true);
    expect(summary.runs.length).toBe(2);
    expect(Array.isArray(summary.checks)).toBe(true);
    expect(typeof summary.passed).toBe('boolean');
    expect(summary.runs.every((run) => Array.isArray(run.checks))).toBe(true);
  });

  it('returns non-zero when thresholds fail', async () => {
    const outputPath = path.join(
      ROOT_DIR,
      'test-results',
      'benchmarks',
      'mobile-benchmark-integration-fail.json'
    );
    await fs.rm(outputPath, { force: true });

    await expect(
      execFileAsync(
        NPM_CMD,
        [
          'run',
          'benchmark:mobile',
          '--',
          '--dry-run',
          '--iterations',
          '1',
          '--duration-ms',
          '800',
          '--warmup-ms',
          '0',
          '--min-average-fps',
          '120',
          '--min-sustained-fps',
          '120',
          '--max-spike-burst-ms',
          '20',
          '--output',
          outputPath,
        ],
        {
          cwd: ROOT_DIR,
          timeout: 120000,
        }
      )
    ).rejects.toThrow();
  });
});
