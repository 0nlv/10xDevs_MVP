/**
 * Authentication Setup for E2E Tests
 * 
 * This setup file runs before all tests to authenticate a test user
 * and save the authentication state to playwright/.auth/user.json.
 * 
 * All subsequent tests will use this stored auth state via storageState
 * configuration in playwright.config.ts, avoiding repeated login flows.
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/signin');
  
  // Fill in test user credentials
  // TODO: Replace with actual test user credentials or read from .env.test
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
  await page.getByRole('textbox', { name: /password/i }).fill('testpassword123');
  
  // Submit login form
  await page.getByRole('button', { name: /sign in|login/i }).click();
  
  // Wait for successful authentication (redirect to dashboard)
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Verify user is authenticated (check for logout button or user menu)
  await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible();
  
  // Create auth directory if it doesn't exist
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
  
  console.log(`✅ Authentication state saved to ${authFile}`);
});
