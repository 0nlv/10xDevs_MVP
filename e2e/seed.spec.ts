/**
 * E2E Seed Test — CSV Upload with Wrong Column Mapping
 * 
 * Risk: #1 (High/High) from context/foundation/test-plan.md
 * Scenario: User uploads revenue CSV → system parses wrong column as "Amount" 
 *           → margin calculations show false profit/loss
 * 
 * This seed test demonstrates project E2E conventions:
 * - getByRole as default locator (accessible, refactor-resistant)
 * - Test independence (setup → action → assert → cleanup in one test)
 * - Wait for state (toBeVisible, waitForURL), not waitForTimeout
 * - Unique identifiers (timestamp) to avoid parallel-run collisions
 * - Risk-tied assertion names
 * - Explicit cleanup to leave DB in clean state
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('CSV Upload Data Flow', () => {
  test('uploaded revenue data appears in preview with detected amount column', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    
    // Setup: Create test CSV file content
    const csvContent = [
      'Client,Description,Amount,Date',
      `${testId}-Client-A,Service A,1000.00,2026-01-15`,
      `${testId}-Client-B,Service B,2500.50,2026-01-20`,
      `${testId}-Client-C,Service C,750.25,2026-01-25`,
    ].join('\\n');
    
    // Navigate to upload page
    await page.goto('/');
    
    // Wait for auth to complete and dashboard to load
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    // Navigate to upload form
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-revenue.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    // Submit upload form
    await page.getByRole('button', { name: /upload|submit/i }).click();
    
    // Assert: Preview shows uploaded data
    await expect(page.getByRole('heading', { name: /preview/i })).toBeVisible();
    
    // Verify client names from CSV appear in preview
    await expect(page.getByText(`${testId}-Client-A`)).toBeVisible();
    await expect(page.getByText(`${testId}-Client-B`)).toBeVisible();
    await expect(page.getByText(`${testId}-Client-C`)).toBeVisible();
    
    // Verify amounts are detected (implementation may show "Amount" column header)
    await expect(page.getByText('1000.00')).toBeVisible();
    await expect(page.getByText('2500.50')).toBeVisible();
    
    // Confirm upload to save to database
    await page.getByRole('button', { name: /confirm|save/i }).click();
    
    // Wait for success confirmation
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();
    
    // Cleanup: Navigate to uploads list and delete test upload
    await page.getByRole('link', { name: /uploads|history/i }).click();
    
    // Find the test upload by unique identifier and delete it
    const uploadRow = page.getByText(testId).first();
    await uploadRow.locator('..').getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm.*delete/i }).click();
    
    // Verify deletion success
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
  });
});
