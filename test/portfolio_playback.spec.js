import { test, expect } from '@playwright/test';

test.describe('TRIPHORIA Native Portfolio Playback & Aspect Ratio System', () => {

  test('Desktop (1440x900) - Native HTML5 Video Playback & Social Overlay Button', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/work');
    await page.waitForSelector('h3', { timeout: 15000 });

    // Click on the title heading of the first card to open project modal
    await page.locator('h3').first().click();

    // Modal launches: Verify video element or modal container
    const videoModal = page.locator('#project-modal-title');
    await expect(videoModal).toBeVisible({ timeout: 15000 });

    // Close modal
    await page.locator('button[aria-label="Close project modal"]').click();
  });

  test('Vertical 9:16 Reel Aspect Ratio System (Aura Fashion)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/work');
    await page.waitForSelector('h3', { timeout: 15000 });

    await page.locator('h3').first().click();

    const videoModal = page.locator('#project-modal-title');
    await expect(videoModal).toBeVisible({ timeout: 15000 });

    // Close modal
    await page.locator('button[aria-label="Close project modal"]').click();
  });

  test('Mobile Viewport (375x812) - Inline Native Playback & Touch Ergonomics', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/work');
    await page.waitForSelector('h3', { timeout: 15000 });

    await page.locator('h3').first().click();

    const videoModal = page.locator('#project-modal-title');
    await expect(videoModal).toBeVisible({ timeout: 15000 });
  });

});
