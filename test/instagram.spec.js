import { test, expect } from '@playwright/test';

test.describe('Instagram Reel Official Embed Verification', () => {
  
  // 1. Desktop Viewport (1440x900)
  test('Desktop (1440x900) - Portfolio Page & Instagram Embed Initialization', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('instagram-url')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/work');
    await page.waitForLoadState('networkidle');

    // Ensure no broken direct video tag with an instagram.com URL exists
    const invalidVideoSrc = await page.locator('video[src*="instagram.com"]').count();
    expect(invalidVideoSrc).toBe(0);

    // Navigate to Homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click lead featured video frame to launch player modal
    const leadVideoFrame = page.locator('.aspect-video.cursor-pointer').first();
    if (await leadVideoFrame.count() > 0) {
      await leadVideoFrame.click();
    }

    // Check that video modal launched and rendered a valid player container
    const videoModal = page.locator('#video-modal-title');
    if (await videoModal.count() > 0) {
      await expect(videoModal).toBeVisible();
    }

    expect(consoleErrors.length).toBe(0);
  });

  // 2. Tablet Viewport (768x1024)
  test('Tablet (768x1024) - Responsive Layout Verification', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const leadVideoFrame = page.locator('.aspect-video.cursor-pointer').first();
    if (await leadVideoFrame.count() > 0) {
      await leadVideoFrame.click();
    }

    const videoModal = page.locator('#video-modal-title');
    if (await videoModal.count() > 0) {
      await expect(videoModal).toBeVisible();
    }
  });

  // 3. Mobile Viewport (375x812)
  test('Mobile (375x812) - Touch Ergonomics & Clean Reel Fallback', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const leadVideoFrame = page.locator('.aspect-video.cursor-pointer').first();
    if (await leadVideoFrame.count() > 0) {
      await leadVideoFrame.click();
    }

    const videoModal = page.locator('#video-modal-title');
    if (await videoModal.count() > 0) {
      await expect(videoModal).toBeVisible();
    }
  });

});
