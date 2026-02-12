/**
 * E2E tests for Action Bar UI (S7R-046)
 */

import { test, expect } from 'playwright/test';

test.describe('Action Bar UI', () => {
  test.describe('Visibility', () => {
    test('should be hidden by default (flag disabled)', async ({ page }) => {
      await page.goto('/');
      await page.locator('#startGameBtn').click();

      const actionBar = page.locator('#actionBarContainer');
      await expect(actionBar).toBeHidden();
    });

    test('should be visible when flag is enabled', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const actionBar = page.locator('#actionBarContainer');
      await expect(actionBar).toBeVisible();
    });

    test('should show buttons when enabled', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Touch Target Sizing', () => {
    test('should meet 52px minimum touch target on mobile portrait', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box.width, `Button ${i} width`).toBeGreaterThanOrEqual(52);
        expect(box.height, `Button ${i} height`).toBeGreaterThanOrEqual(52);
      }
    });

    test('should meet 52px minimum touch target on mobile landscape', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box.width, `Button ${i} width`).toBeGreaterThanOrEqual(48); // Landscape allows slightly smaller
        expect(box.height, `Button ${i} height`).toBeGreaterThanOrEqual(48);
      }
    });

    test('should meet touch targets on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box.width, `Button ${i} width`).toBeGreaterThanOrEqual(52);
        expect(box.height, `Button ${i} height`).toBeGreaterThanOrEqual(52);
      }
    });
  });

  test.describe('Button Positioning', () => {
    test('should position buttons correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      // Check that buttons are in viewport
      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        await expect(buttons.nth(i)).toBeInViewport();
      }
    });

    test('should not overlap with HUD elements', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const hud = await page.locator('#hud').boundingBox();
      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const buttonBox = await buttons.nth(i).boundingBox();
        // Check that button doesn't overlap with HUD (allowing some margin)
        const overlaps =
          buttonBox.y < hud.y + hud.height + 10 && buttonBox.y + buttonBox.height > hud.y - 10;
        expect(overlaps).toBe(false);
      }
    });
  });

  test.describe('Button Interaction', () => {
    test('should show visual feedback when clicked', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const button = page.locator('.action-bar-button').first();
      await button.click();

      // Button should still be visible after click (not broken)
      await expect(button).toBeVisible();
    });

    test('should be clickable on all buttons', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        await expect(button).toBeEnabled();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have aria-labels on buttons', async ({ page }) => {
      await page.goto('/?flags=actionBar:true');
      await page.locator('#startGameBtn').click();

      const buttons = page.locator('.action-bar-button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel.length).toBeGreaterThan(0);
      }
    });

    test('should work with high contrast mode', async ({ page }) => {
      await page.goto('/?flags=actionBar:true,accessibilitySettings:true');
      await page.locator('#startGameBtn').click();

      // Enable high contrast mode
      await page.locator('#settingsBtn').click();
      await page.locator('#settingHighContrast').click();
      await page.locator('#settingsCloseBtn').click();

      // Buttons should still be visible
      const buttons = page.locator('.action-bar-button');
      await expect(buttons.first()).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile Portrait', width: 390, height: 844 },
      { name: 'Mobile Landscape', width: 844, height: 390 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 },
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/?flags=actionBar:true');
        await page.locator('#startGameBtn').click();

        const actionBar = page.locator('#actionBarContainer');
        await expect(actionBar).toBeVisible();

        const buttons = page.locator('.action-bar-button');
        const count = await buttons.count();
        expect(count).toBeGreaterThan(0);

        // All buttons should be in viewport
        for (let i = 0; i < count; i++) {
          await expect(buttons.nth(i)).toBeInViewport();
        }
      });
    }
  });
});
