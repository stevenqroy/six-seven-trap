import { test, expect } from 'playwright/test';

const MOBILE_VIEWPORTS = [
  {
    name: 'iphone-portrait',
    size: { width: 390, height: 844 },
    safe: { top: 47, right: 0, bottom: 34, left: 0 },
  },
  {
    name: 'iphone-landscape',
    size: { width: 844, height: 390 },
    safe: { top: 0, right: 47, bottom: 21, left: 47 },
  },
  {
    name: 'android-portrait',
    size: { width: 412, height: 915 },
    safe: { top: 24, right: 0, bottom: 16, left: 0 },
  },
  {
    name: 'android-landscape',
    size: { width: 915, height: 412 },
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
  },
];

function assertWithinSafeArea(box, safe, viewport, label) {
  if (!box) throw new Error(`${label}: missing bounding box`);
  const minX = safe.left;
  const maxX = viewport.width - safe.right;
  const minY = safe.top;
  const maxY = viewport.height - safe.bottom;

  expect(box.x, `${label} left edge`).toBeGreaterThanOrEqual(minX - 1);
  expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(minY - 1);
  expect(box.x + box.width, `${label} right edge`).toBeLessThanOrEqual(maxX + 1);
  expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(maxY + 1);
}

test.describe('S7R-005 mobile-safe layout', () => {
  for (const viewportCase of MOBILE_VIEWPORTS) {
    test(`keeps controls visible on ${viewportCase.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewportCase.size);
      await page.goto('/?flags=mobileSafeAreas:true');

      // Emulate notched-device safe area values in Chromium desktop.
      await page.evaluate((safe) => {
        const root = document.documentElement;
        root.style.setProperty('--s7r-safe-top', `${safe.top}px`);
        root.style.setProperty('--s7r-safe-right', `${safe.right}px`);
        root.style.setProperty('--s7r-safe-bottom', `${safe.bottom}px`);
        root.style.setProperty('--s7r-safe-left', `${safe.left}px`);
      }, viewportCase.safe);

      const fsBtn = page.locator('#fsBtn');
      const startBtn = page.locator('#startGameBtn');
      const titleBox = page.locator('#titleBox');

      await expect(fsBtn).toBeVisible();
      await expect(startBtn).toBeVisible();
      await expect(titleBox).toBeVisible();

      const fsBox = await fsBtn.boundingBox();
      assertWithinSafeArea(fsBox, viewportCase.safe, viewportCase.size, `${viewportCase.name} fsBtn`);
      expect(fsBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(fsBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      const titleBoxBounds = await titleBox.boundingBox();
      assertWithinSafeArea(
        titleBoxBounds,
        viewportCase.safe,
        viewportCase.size,
        `${viewportCase.name} titleBox`
      );

      await startBtn.click();
      await expect(page.locator('#titleScreen')).not.toHaveClass(/active/);

      const hudInner = page.locator('#hudInner');
      const shipHpBar = page.locator('#shipHpBar');
      const powerBar = page.locator('#powerBar');
      const pauseBtn = page.locator('#pauseBtn');
      const resetBtn = page.locator('#resetBtn');

      await expect(hudInner).toBeVisible();
      await expect(shipHpBar).toBeVisible();
      await expect(powerBar).toBeVisible();

      assertWithinSafeArea(
        await hudInner.boundingBox(),
        viewportCase.safe,
        viewportCase.size,
        `${viewportCase.name} hudInner`
      );
      assertWithinSafeArea(
        await shipHpBar.boundingBox(),
        viewportCase.safe,
        viewportCase.size,
        `${viewportCase.name} shipHpBar`
      );
      assertWithinSafeArea(
        await powerBar.boundingBox(),
        viewportCase.safe,
        viewportCase.size,
        `${viewportCase.name} powerBar`
      );

      const pauseBox = await pauseBtn.boundingBox();
      const resetBox = await resetBtn.boundingBox();
      expect(pauseBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(pauseBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(resetBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(resetBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await testInfo.attach(`${viewportCase.name}-title`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });
    });
  }
});
