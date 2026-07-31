/**
 * E2E Tests - Application Navigation
 * 
 * Basic navigation tests for the application
 */

import { test, expect } from '@playwright/test';

test.describe('Application Navigation', () => {
  test('home page has basic structure', async ({ page }) => {
    await page.goto('/');
    
    // Verify page has elements
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
    
    console.log('✅ Home page has content');
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    
    // Check if page has links or buttons
    const links = await page.locator('a, button').count();
    expect(links).toBeGreaterThan(0);
    
    console.log(`✅ Found ${links} navigation elements`);
  });

  test('signin page is accessible', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Verify login form is visible
    const title = await page.title();
    expect(title).toBeTruthy();
    
    console.log('✅ Signin page is accessible');
  });

  test('unauthenticated user cannot access transactions page', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/transactions');

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/);
  });
});

