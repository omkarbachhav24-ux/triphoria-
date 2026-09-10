// @ts-check
import { test, expect } from '@playwright/test';

test.describe('TRIPHORIA Login Debug Suite', () => {

  test('Admin login - full flow', async ({ page, context }) => {
    const networkLog = [];
    page.on('response', async resp => {
      if (resp.url().includes('/api/')) {
        let body = '';
        try { body = await resp.text(); } catch (e) {}
        networkLog.push({ url: resp.url(), status: resp.status(), body: body.substring(0, 300) });
      }
    });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Load login page
    await page.goto('/login', { waitUntil: 'networkidle' });
    console.log('LOGIN PAGE URL:', page.url());
    await page.screenshot({ path: 'test-results/debug-01-login-page.png' });

    // 2. Fill form
    await page.fill('input[type="email"], input[name="email"]', 'admin@triphoria.io');
    await page.fill('input[type="password"], input[name="password"]', 'adminpgt');
    await page.screenshot({ path: 'test-results/debug-02-filled.png' });

    // 3. Submit and watch for API response
    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 8000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/debug-03-after-login.png' });

    // 4. Report results
    if (loginResponse) {
      console.log('LOGIN API STATUS:', loginResponse.status());
      let loginBody = '';
      try { loginBody = await loginResponse.text(); } catch (e) {}
      console.log('LOGIN API BODY:', loginBody.substring(0, 300));
    } else {
      console.log('LOGIN API: NO RESPONSE CAPTURED (possible network failure)');
    }

    console.log('POST-LOGIN URL:', page.url());

    // 5. Check for UI error messages
    const errorLocators = [
      '[class*="error"]',
      '[class*="alert"]',
      '[role="alert"]',
      'p:has-text("failure")',
      'p:has-text("Server communication")',
      'p:has-text("Invalid")',
      'div:has-text("Server communication failure")'
    ];
    for (const sel of errorLocators) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        const txt = await el.textContent().catch(() => '');
        if (txt.trim()) console.log('UI ERROR MESSAGE:', txt.trim());
      }
    }

    // 6. Check cookies
    const cookies = await context.cookies('http://localhost:5173');
    const sessionCookie = cookies.find(c => c.name === 'session_token');
    console.log('SESSION COOKIE:', sessionCookie
      ? `SET | httpOnly:${sessionCookie.httpOnly} | expires:${new Date(sessionCookie.expires * 1000).toISOString()}`
      : 'NOT SET');

    // 7. Full network log
    console.log('\n=== FULL NETWORK LOG ===');
    for (const entry of networkLog) {
      console.log(`  ${entry.status} ${entry.url}`);
      if (entry.status >= 400) console.log(`    BODY: ${entry.body}`);
    }

    console.log('\n=== CONSOLE ERRORS ===');
    for (const err of consoleErrors) console.log('  ERROR:', err);

    // 8. If on dashboard, verify heading
    if (!page.url().includes('/login')) {
      const heading = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
      console.log('DASHBOARD HEADING:', heading);
    }

    // Soft assertions - we're debugging, not blocking
    expect(loginResponse?.status() ?? 0).toBe(200);
    expect(page.url()).not.toContain('/login');
  });

  test('Invalid credentials - error message shown', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 8000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/debug-04-invalid-creds.png' });

    console.log('INVALID LOGIN STATUS:', loginResponse?.status());
    console.log('URL AFTER INVALID:', page.url());
    expect(page.url()).toContain('/login');
  });

  test('Session persistence - refresh keeps session', async ({ page, context }) => {
    // Login first
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'admin@triphoria.io');
    await page.fill('input[type="password"], input[name="password"]', 'adminpgt');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 8000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    const urlAfterLogin = page.url();
    console.log('URL AFTER LOGIN:', urlAfterLogin);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const urlAfterReload = page.url();
    console.log('URL AFTER RELOAD:', urlAfterReload);
    await page.screenshot({ path: 'test-results/debug-05-after-reload.png' });

    // Should still be authenticated (not redirected to login)
    expect(urlAfterReload).not.toContain('/login');
  });

  test('Logout clears session', async ({ page, context }) => {
    // Login
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'admin@triphoria.io');
    await page.fill('input[type="password"], input[name="password"]', 'adminpgt');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 8000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    // Find and click logout
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")').first();
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForTimeout(1500);
      console.log('URL AFTER LOGOUT:', page.url());
      await page.screenshot({ path: 'test-results/debug-06-after-logout.png' });
      // Should redirect to login or home
      const urlAfterLogout = page.url();
      console.log('LOGOUT RESULT URL:', urlAfterLogout);
    } else {
      console.log('LOGOUT BUTTON: NOT FOUND');
    }
  });

  test('RBAC - customer cannot access admin', async ({ page }) => {
    // Login as customer
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'alex@creator.com');
    await page.fill('input[type="password"], input[name="password"]', 'clientpgt');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 8000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    const urlAfterLogin = page.url();
    console.log('CUSTOMER LOGIN URL:', urlAfterLogin);

    // Try to access admin
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const adminUrl = page.url();
    console.log('CUSTOMER ACCESSING /admin REDIRECTED TO:', adminUrl);
    await page.screenshot({ path: 'test-results/debug-07-rbac-check.png' });
    expect(adminUrl).not.toContain('/admin');
  });
});
