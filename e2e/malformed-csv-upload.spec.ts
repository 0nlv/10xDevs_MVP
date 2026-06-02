/**
 * E2E Test — Malformed CSV Upload Error Handling
 * 
 * Risk: #3 (High/Medium) from context/foundation/test-plan.md
 * Scenario: User uploads malformed CSV (encoding issue, missing header) 
 *           → parser crashes → onboarding stuck → user abandons product
 * 
 * This test verifies that malformed CSV uploads return actionable error messages
 * instead of crashing, allowing users to correct their data and retry.
 * 
 * Follows project E2E conventions from e2e/seed.spec.ts:
 * - getByRole/getByText locators (accessible, refactor-resistant)
 * - Test independence (each test is self-contained)
 * - Wait for state (toBeVisible), not waitForTimeout
 * - Risk-tied test names
 * - Business outcome assertions (user sees actionable error)
 */

import { test, expect } from '@playwright/test';

test.describe('Malformed CSV Upload Error Handling', () => {
  test('CSV without headers shows actionable error message instead of crashing', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    
    // Setup: Create malformed CSV with no header row
    const malformedCSV = [
      `${testId}-Client-A,Service A,1000.00,2026-01-15`,
      `${testId}-Client-B,Service B,2500.50,2026-01-20`,
    ].join('\\n');
    
    // Navigate to upload page
    await page.goto('/');
    
    // Wait for auth and dashboard
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    // Navigate to upload form
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    // Upload malformed CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-malformed.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(malformedCSV),
    });
    
    // Submit upload form
    await page.getByRole('button', { name: /upload|submit/i }).click();
    
    // Assert: Error message appears (not crash)
    await expect(page.getByText(/error|invalid|missing.*header/i)).toBeVisible();
    
    // Assert: Error message is actionable (tells user what's wrong)
    const errorMessage = page.getByText(/header|column|csv.*format/i);
    await expect(errorMessage).toBeVisible();
    
    // Assert: User can still interact with page (not crashed)
    await expect(page.getByRole('button', { name: /upload|submit/i })).toBeVisible();
    
    // No cleanup needed - upload failed, no data in DB
  });

  test('CSV with only headers (no data rows) shows appropriate validation message', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    
    // Setup: Create CSV with headers but no data
    const emptyCSV = 'Client,Description,Amount,Date\\n';
    
    // Navigate to upload page
    await page.goto('/');
    
    // Wait for auth and dashboard
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    // Navigate to upload form
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    // Upload empty CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-empty.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(emptyCSV),
    });
    
    // Submit upload form
    await page.getByRole('button', { name: /upload|submit/i }).click();
    
    // Assert: Validation message appears
    await expect(page.getByText(/empty|no.*data|no.*rows/i)).toBeVisible();
    
    // Assert: User can retry upload
    await expect(page.getByRole('button', { name: /upload|submit/i })).toBeVisible();
    
    // No cleanup needed - upload failed, no data in DB
  });

  test('CSV with single column shows actionable minimum columns error', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    
    // Setup: Create CSV with only one column (insufficient for processing)
    const singleColumnCSV = [
      'Client',
      `${testId}-Client-A`,
      `${testId}-Client-B`,
    ].join('\\n');
    
    // Navigate to upload page
    await page.goto('/');
    
    // Wait for auth and dashboard
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    // Navigate to upload form
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    // Upload single-column CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-single-column.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(singleColumnCSV),
    });
    
    // Submit upload form
    await page.getByRole('button', { name: /upload|submit/i }).click();
    
    // Assert: Error message about missing required columns
    await expect(page.getByText(/missing|required.*column|amount|date/i)).toBeVisible();
    
    // Assert: Error is actionable (user knows what to add)
    const errorMessage = page.getByText(/amount|date/i);
    await expect(errorMessage).toBeVisible();
    
    // Assert: User remains on upload page to retry
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    // No cleanup needed - upload failed, no data in DB
  });
});
