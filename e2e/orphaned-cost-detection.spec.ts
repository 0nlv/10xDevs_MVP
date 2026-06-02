/**
 * E2E Test — Orphaned Cost Detection
 * 
 * Risk: #2 (High/Medium) from context/foundation/test-plan.md
 * Scenario: User assigns costs manually → typo in client name → cost orphaned 
 *           → client margin falsely high → user keeps unprofitable client
 * 
 * This test verifies that costs with mismatched client names are either:
 * - Prevented through autocomplete/validation during manual entry, OR
 * - Detected and flagged as orphaned before margin calculations
 * 
 * Follows project E2E conventions from e2e/seed.spec.ts:
 * - getByRole/getByText locators (accessible, refactor-resistant)
 * - Test independence (full setup → action → assert → cleanup cycle)
 * - Wait for state (toBeVisible, toHaveURL), not waitForTimeout
 * - Unique identifiers (timestamp) for parallel-run safety
 * - Risk-tied test names
 * - Business outcome assertions (orphaned cost is detected, not silently accepted)
 */

import { test, expect } from '@playwright/test';

test.describe('Orphaned Cost Detection', () => {
  test('cost with typo in client name is flagged as orphaned before margin calculation', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    const correctClientName = `${testId}-TechCorp`;
    const typoClientName = `${testId}-TechCorpp`; // Intentional typo
    
    // Setup: Upload revenue CSV with correct client name
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${correctClientName},Consulting Service,5000.00,2026-01-15`,
    ].join('\\n');
    
    const revenueInput = page.locator('input[type="file"]').first();
    await revenueInput.setInputFiles({
      name: `${testId}-revenue.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });
    
    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();
    
    // Action: Upload cost CSV with typo in client name
    await page.getByRole('link', { name: /upload.*cost/i }).click();
    await expect(page).toHaveURL(/.*upload-cost/);
    
    const costCSV = [
      'Vendor,Category,Amount,Date',
      `${typoClientName},Software License,1500.00,2026-01-20`, // Typo in client name
    ].join('\\n');
    
    const costInput = page.locator('input[type="file"]').first();
    await costInput.setInputFiles({
      name: `${testId}-cost.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(costCSV),
    });
    
    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();
    
    // Assert: Navigate to cost assignment page and verify orphaned cost is flagged
    await page.getByRole('link', { name: /cost.*assignment|assign.*cost/i }).click();
    
    // Business outcome: Orphaned cost should be visible with warning/alert
    await expect(page.getByText(typoClientName)).toBeVisible();
    await expect(page.getByText(/orphan|unassigned|no.*match|unknown.*client/i)).toBeVisible();
    
    // Verify the correct client name is NOT automatically assumed
    const orphanedCostRow = page.getByText(typoClientName).locator('..');
    await expect(orphanedCostRow.getByText(correctClientName)).not.toBeVisible();
    
    // Cleanup: Delete test uploads
    await page.getByRole('link', { name: /uploads|history/i }).click();
    
    // Delete revenue upload
    const revenueRow = page.getByText(testId).first();
    await revenueRow.locator('..').getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm.*delete/i }).click();
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    
    // Delete cost upload
    const costRow = page.getByText(testId).first();
    await costRow.locator('..').getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm.*delete/i }).click();
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
  });

  test('manual cost entry provides autocomplete from revenue clients to prevent typos', async ({ page }) => {
    // Unique identifier to avoid parallel-run collisions
    const testId = `test-${Date.now()}`;
    const clientName = `${testId}-MegaCorp`;
    
    // Setup: Upload revenue CSV to create client
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();
    
    await page.getByRole('link', { name: /upload.*revenue/i }).click();
    await expect(page).toHaveURL(/.*upload-revenue/);
    
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${clientName},Consulting Service,8000.00,2026-01-15`,
    ].join('\\n');
    
    const revenueInput = page.locator('input[type="file"]').first();
    await revenueInput.setInputFiles({
      name: `${testId}-revenue.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });
    
    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();
    
    // Action: Navigate to manual cost entry form
    await page.getByRole('link', { name: /add.*cost|manual.*cost|new.*cost/i }).click();
    
    // Assert: Client field provides autocomplete/dropdown from revenue clients
    const clientField = page.getByRole('combobox', { name: /client|vendor/i });
    await clientField.fill(testId.substring(0, 10)); // Type partial match
    
    // Verify autocomplete suggestion appears
    await expect(page.getByText(clientName)).toBeVisible();
    
    // Select from autocomplete (prevents typo)
    await page.getByText(clientName).click();
    
    // Verify selected value matches exactly
    await expect(clientField).toHaveValue(clientName);
    
    // Cleanup: Delete test upload
    await page.getByRole('link', { name: /uploads|history/i }).click();
    
    const uploadRow = page.getByText(testId).first();
    await uploadRow.locator('..').getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm.*delete/i }).click();
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
  });
});
