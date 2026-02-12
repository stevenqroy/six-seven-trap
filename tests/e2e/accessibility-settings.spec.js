import { test, expect } from 'playwright/test';

test('S7R-007 persists accessibility settings across reload', async ({ page }) => {
  await page.goto('/?flags=accessibilitySettings:true');

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#settingsBtn')).toBeVisible();

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveClass(/active/);

  await page.locator('#settingReducedMotion').check();
  await page.locator('#settingLowGraphics').check();
  await page.locator('#settingHighContrast').check();
  await page.locator('input[name="settingControlScale"][value="xlarge"]').check();

  await page.locator('#settingsCloseBtn').click();
  await expect(page.locator('#settingsOverlay')).not.toHaveClass(/active/);

  const settingsSnapshot = await page.evaluate(() =>
    localStorage.getItem('s7r-accessibility-settings')
  );
  expect(settingsSnapshot).toContain('"reducedMotion":true');
  expect(settingsSnapshot).toContain('"lowGraphicsMode":true');
  expect(settingsSnapshot).toContain('"highContrast":true');
  expect(settingsSnapshot).toContain('"controlScale":"xlarge"');

  const touchTargetPx = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--s7r-touch-target-min')
      .trim()
  );
  expect(touchTargetPx).toBe('60px');

  await page.reload();
  await page.locator('#startGameBtn').click();
  await page.locator('#settingsBtn').click();

  await expect(page.locator('#settingReducedMotion')).toBeChecked();
  await expect(page.locator('#settingLowGraphics')).toBeChecked();
  await expect(page.locator('#settingHighContrast')).toBeChecked();
  await expect(page.locator('input[name="settingControlScale"][value="xlarge"]')).toBeChecked();
});
