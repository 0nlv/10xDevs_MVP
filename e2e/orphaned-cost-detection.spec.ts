/**
 * E2E Test — Protected Routes Verification
 * 
 * Verifies that protected routes redirect unauthenticated users
 */

import { test, expect } from '@playwright/test';

test.describe('Route Protection', () => {
  test('protected routes redirect unauthenticated users to signin', async ({ page }) => {
    // List of protected routes
    const protectedRoutes = [
      '/dashboard',
      '/uploads',
      '/transactions',
      '/onboarding/step-2',
      '/onboarding/step-3',
    ];
    
    for (const route of protectedRoutes) {
      // Try to access protected route without auth
      await page.goto(route);
      
      // Should redirect to signin
      const url = page.url();
      expect(url).toContain('/auth/signin');
      
      console.log(`✅ Route ${route} is protected`);
    }
  });
});

