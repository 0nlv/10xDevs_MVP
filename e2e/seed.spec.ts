/**
 * E2E Seed Test — App Structure & Navigation
 * 
 * This seed test verifies that the application loads correctly
 * and basic navigation works.
 */

import { test, expect } from '@playwright/test';

test.describe('Application Basic Structure', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Verify page title/heading exists
    await expect(page).toHaveTitle(/astro|profitleak/i);
    
    // Verify page loaded with content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
    
    console.log('✅ Homepage loaded successfully');
  });

  test('auth signin page is accessible', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin');
    
    // Verify login form elements exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Use locator for password input to avoid strict mode violation (getByLabel also matches toggle button)
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    
    console.log('✅ Auth signin page is accessible');
  });

  test('public pages do not redirect', async ({ page }) => {
    // Test public pages that should be accessible without auth
    const publicPages = [
      '/',
      '/auth/signin',
      '/auth/signup',
    ];
    
    for (const pagePath of publicPages) {
      await page.goto(pagePath);
      
      // Should NOT redirect to signin (no error in URL)
      const url = page.url();
      expect(!url.includes('error')).toBeTruthy();
      
      console.log(`✅ Public page accessible: ${pagePath}`);
    }
  });
});
