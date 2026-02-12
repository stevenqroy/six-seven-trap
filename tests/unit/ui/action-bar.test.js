/**
 * Unit tests for action bar UI (S7R-046)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActionBar } from '../../../src/ui/action-bar.js';

describe('Action Bar UI', () => {
  let container;

  beforeEach(() => {
    // Create mock DOM container
    container = document.createElement('div');
    container.id = 'actionBarContainer';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('createActionBar', () => {
    it('should create action bar with disabled state by default', () => {
      const actionBar = createActionBar({ enabled: false, buttons: [] });

      expect(actionBar).toBeDefined();
      expect(actionBar.setEnabled).toBeTypeOf('function');
      expect(actionBar.updateButton).toBeTypeOf('function');
      expect(actionBar.updateCooldowns).toBeTypeOf('function');
    });

    it('should hide container when disabled', () => {
      createActionBar({ enabled: false, buttons: [] });

      expect(container.hidden).toBe(true);
      expect(container.getAttribute('aria-hidden')).toBe('true');
    });

    it('should show container when enabled', () => {
      createActionBar({ enabled: true, buttons: [] });

      expect(container.hidden).toBe(false);
      expect(container.getAttribute('aria-hidden')).toBe('false');
    });

    it('should create button elements for each config', () => {
      const buttons = [
        { id: 'shield', label: 'Shield', icon: '🛡️', position: 'bottom-center', onActivate: vi.fn() },
        { id: 'projectile', label: 'Fire', icon: '🔫', position: 'bottom-center', onActivate: vi.fn() },
      ];

      createActionBar({ enabled: true, buttons });

      const buttonElements = container.querySelectorAll('.action-bar-button');
      expect(buttonElements.length).toBe(2);
    });

    it('should assign correct IDs to buttons', () => {
      const buttons = [
        { id: 'shield', label: 'Shield', icon: '🛡️', position: 'bottom-center', onActivate: vi.fn() },
      ];

      createActionBar({ enabled: true, buttons });

      const button = container.querySelector('#action-btn-shield');
      expect(button).toBeTruthy();
    });

    it('should add position classes to buttons', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      createActionBar({ enabled: true, buttons });

      const button = container.querySelector('.action-btn-bottom-center');
      expect(button).toBeTruthy();
    });

    it('should call onActivate when button is clicked', () => {
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      createActionBar({ enabled: true, buttons });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(onActivate).toHaveBeenCalledOnce();
      expect(onActivate).toHaveBeenCalledWith('test');
    });

    it('should not call onActivate when button is disabled', () => {
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { enabled: false });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('should not call onActivate when button is on cooldown', () => {
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 5, cooldownTotal: 10 });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('updateButton', () => {
    it('should update button enabled state', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { enabled: false });

      const button = container.querySelector('#action-btn-test');
      expect(button.disabled).toBe(true);
      expect(button.classList.contains('disabled')).toBe(true);
    });

    it('should display cooldown time', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 5.5, cooldownTotal: 10 });

      const cooldownText = container.querySelector('#action-btn-test .action-bar-cooldown-text');
      expect(cooldownText.textContent).toBe('6s'); // Ceiling of 5.5
      expect(cooldownText.hidden).toBe(false);
    });

    it('should hide cooldown text when cooldown is zero', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 5, cooldownTotal: 10 });
      actionBar.updateButton('test', { cooldownRemaining: 0 });

      const cooldownText = container.querySelector('#action-btn-test .action-bar-cooldown-text');
      expect(cooldownText.textContent).toBe('');
      expect(cooldownText.hidden).toBe(true);
    });
  });

  describe('updateCooldowns', () => {
    it('should decrease cooldown over time', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 5, cooldownTotal: 10 });

      const stateBefore = actionBar.getButtonState('test');
      expect(stateBefore.cooldownRemaining).toBe(5);

      actionBar.updateCooldowns(1); // 1 second elapsed

      const stateAfter = actionBar.getButtonState('test');
      expect(stateAfter.cooldownRemaining).toBe(4);
    });

    it('should not go below zero cooldown', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 1, cooldownTotal: 10 });

      actionBar.updateCooldowns(2); // More than cooldown remaining

      const state = actionBar.getButtonState('test');
      expect(state.cooldownRemaining).toBe(0);
    });

    it('should enable button when cooldown reaches zero', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      actionBar.updateButton('test', { cooldownRemaining: 1, cooldownTotal: 10 });

      actionBar.updateCooldowns(1);

      const button = container.querySelector('#action-btn-test');
      expect(button.disabled).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should hide container when disabled', () => {
      const actionBar = createActionBar({ enabled: true, buttons: [] });
      actionBar.setEnabled(false);

      expect(container.hidden).toBe(true);
    });

    it('should show container when enabled', () => {
      const actionBar = createActionBar({ enabled: false, buttons: [] });
      actionBar.setEnabled(true);

      expect(container.hidden).toBe(false);
    });
  });

  describe('getButtonState', () => {
    it('should return button state', () => {
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      const state = actionBar.getButtonState('test');

      expect(state).toBeDefined();
      expect(state.enabled).toBe(true);
      expect(state.active).toBe(false);
      expect(state.cooldownRemaining).toBe(0);
      expect(state.cooldownTotal).toBe(0);
    });

    it('should return null for unknown button', () => {
      const actionBar = createActionBar({ enabled: true, buttons: [] });
      const state = actionBar.getButtonState('unknown');

      expect(state).toBeNull();
    });
  });

  describe('beforeActivate callback', () => {
    it('should call beforeActivate before button activation', () => {
      const beforeActivate = vi.fn(() => true);
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      createActionBar({ enabled: true, buttons, beforeActivate });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(beforeActivate).toHaveBeenCalledBefore(onActivate);
    });

    it('should block activation if beforeActivate returns false', () => {
      const beforeActivate = vi.fn(() => false);
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      createActionBar({ enabled: true, buttons, beforeActivate });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(beforeActivate).toHaveBeenCalled();
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('afterActivate callback', () => {
    it('should call afterActivate after button activation', () => {
      const afterActivate = vi.fn();
      const onActivate = vi.fn();
      const buttons = [
        { id: 'test', label: 'Test', position: 'bottom-center', onActivate },
      ];

      createActionBar({ enabled: true, buttons, afterActivate });

      const button = container.querySelector('#action-btn-test');
      button.click();

      expect(onActivate).toHaveBeenCalledBefore(afterActivate);
    });
  });

  describe('destroy', () => {
    it('should remove all buttons from DOM', () => {
      const buttons = [
        { id: 'test1', label: 'Test 1', position: 'bottom-center', onActivate: vi.fn() },
        { id: 'test2', label: 'Test 2', position: 'bottom-center', onActivate: vi.fn() },
      ];

      const actionBar = createActionBar({ enabled: true, buttons });
      expect(container.querySelectorAll('.action-bar-button').length).toBe(2);

      actionBar.destroy();

      expect(container.querySelectorAll('.action-bar-button').length).toBe(0);
    });
  });
});
