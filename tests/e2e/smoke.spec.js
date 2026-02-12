import { test, expect } from 'playwright/test';

test('boots and starts a playable run', async ({ page }) => {
  const pageErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(String(err));
  });

  await page.goto('/');

  const titleScreen = page.locator('#titleScreen');
  const startButton = page.locator('#startGameBtn');
  const canvas = page.locator('#c');
  const hud = page.locator('#hud');
  const hpBar = page.locator('#shipHpBar');
  const powerBar = page.locator('#powerBar');

  await expect(titleScreen).toBeVisible();
  await expect(startButton).toBeVisible();
  await expect(canvas).toBeVisible();

  await startButton.click();

  await expect(titleScreen).not.toHaveClass(/active/);
  await expect(hud).toBeVisible();
  await expect(hpBar).toBeVisible();
  await expect(powerBar).toBeVisible();
  await expect(page.locator('#score')).toContainText('0');

  expect(pageErrors).toEqual([]);
});
