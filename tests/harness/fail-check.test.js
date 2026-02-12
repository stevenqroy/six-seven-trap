import { describe, it, expect } from 'vitest';

describe('pipeline fail check', () => {
  it('fails when deliberate fail mode is enabled', () => {
    if (process.env.S7R_FORCE_FAIL !== '1') {
      expect(true).toBe(true);
      return;
    }
    expect('deliberate failure').toBe('pipeline should block');
  });
});
