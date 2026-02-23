/**
 * Unit tests for action bar configuration (S7R-108)
 */

import { describe, it, expect } from 'vitest';
import { createActionBarButtons } from '../../../src/ui/action-bar-config.js';

describe('Action Bar Config', () => {
  it('should return an array of exactly 3 buttons', () => {
    const buttons = createActionBarButtons();
    expect(Array.isArray(buttons)).toBe(true);
    expect(buttons).toHaveLength(3);
  });

  it('should have the correct IDs in the correct order', () => {
    const buttons = createActionBarButtons();
    const ids = buttons.map((b) => b.id);
    expect(ids).toEqual(['shield', 'projectile', 'slam']);
  });

  it('should have required properties for each button', () => {
    const buttons = createActionBarButtons();
    
    buttons.forEach((button) => {
      expect(button).toHaveProperty('id');
      expect(button).toHaveProperty('label');
      expect(button).toHaveProperty('icon');
      expect(button).toHaveProperty('position');
      
      expect(typeof button.id).toBe('string');
      expect(typeof button.label).toBe('string');
      expect(typeof button.icon).toBe('string');
      expect(typeof button.position).toBe('string');
    });
  });

  it('should have non-empty labels and icons', () => {
    const buttons = createActionBarButtons();
    
    buttons.forEach((button) => {
      expect(button.label.length).toBeGreaterThan(0);
      expect(button.icon.length).toBeGreaterThan(0);
    });
  });

  it('should return a fresh array on each call (mutation safety)', () => {
    const buttons1 = createActionBarButtons();
    const buttons2 = createActionBarButtons();
    
    expect(buttons1).not.toBe(buttons2);
    expect(buttons1[0]).not.toBe(buttons2[0]);
    
    // Mutate the first one
    buttons1[0].label = 'Mutated';
    
    // Second one should be unaffected
    expect(buttons2[0].label).not.toBe('Mutated');
  });
});
