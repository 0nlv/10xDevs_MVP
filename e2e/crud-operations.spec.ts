/**
 * E2E Tests - CRUD Operations
 * 
 * Tests verify full user workflows for:
 * 1. Deleting uploads through UI
 * 2. Editing transactions through UI
 * 
 * Maps to MVP certification criteria: CRUD operations (Update + Delete)
 * 
 * Follows project E2E conventions from e2e/seed.spec.ts:
 * - getByRole/getByText locators (accessible, refactor-resistant)
 * - Test independence (each test is self-contained)
 * - Wait for state (toBeVisible), not waitForTimeout
 * - Unique identifiers (timestamp) for parallel-run safety
 */

import { test, expect } from '@playwright/test';

test.describe('CRUD Operations - Delete Upload', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('user can delete their own upload and see confirmation', async ({ page }) => {
    const testId = `test-${Date.now()}`;

    // Setup: Upload a test CSV file first
    await page.goto('/onboarding/step-1');
    await expect(page.getByRole('heading', { name: /revenue/i })).toBeVisible();

    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${testId}-Client-A,Service A,1000.00,2026-01-15`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-revenue.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });

    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();

    // Navigate to uploads management page
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: /zarządzanie danymi/i })).toBeVisible();

    // Verify upload appears in list
    await expect(page.getByText(`${testId}-revenue.csv`)).toBeVisible();

    // Click delete button
    const deleteButton = page
      .locator(`tr:has-text("${testId}-revenue.csv")`)
      .getByRole('button', { name: /usuń/i });
    await deleteButton.click();

    // Confirm deletion in dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Wait for deletion to complete
    await expect(page.getByText(`${testId}-revenue.csv`)).not.toBeVisible({ timeout: 5000 });

    // Verify empty state or remaining uploads
    const hasUploads = await page.getByRole('row').count();
    if (hasUploads <= 1) {
      // Only header row remains
      await expect(page.getByText(/brak wgranych plików/i)).toBeVisible();
    }
  });

  test('deleted upload cascades to related transactions', async ({ page }) => {
    const testId = `test-${Date.now()}`;

    // Upload revenue CSV
    await page.goto('/onboarding/step-1');
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${testId}-Client-B,Service B,2500.00,2026-01-20`,
      `${testId}-Client-B,Service C,3000.00,2026-01-21`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-revenue-cascade.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });

    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();

    // Verify transactions exist
    await page.goto('/transactions');
    await expect(page.getByText(`${testId}-Client-B`)).toBeVisible();

    // Delete upload
    await page.goto('/uploads');
    const deleteButton = page
      .locator(`tr:has-text("${testId}-revenue-cascade.csv")`)
      .getByRole('button', { name: /usuń/i });
    await deleteButton.click();

    page.on('dialog', (dialog) => dialog.accept());
    await expect(page.getByText(`${testId}-revenue-cascade.csv`)).not.toBeVisible({
      timeout: 5000,
    });

    // Verify transactions are also deleted (CASCADE)
    await page.goto('/transactions');
    await expect(page.getByText(`${testId}-Client-B`)).not.toBeVisible();
  });
});

test.describe('CRUD Operations - Edit Transaction', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('user can edit transaction amount and date', async ({ page }) => {
    const testId = `test-${Date.now()}`;

    // Setup: Upload revenue CSV
    await page.goto('/onboarding/step-1');
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${testId}-EditClient,Initial Service,1000.00,2026-01-10`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-edit.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });

    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();

    // Navigate to transactions page
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transakcje/i })).toBeVisible();

    // Find transaction row and click Edit
    const transactionRow = page.locator(`tr:has-text("${testId}-EditClient")`);
    await expect(transactionRow).toBeVisible();
    await transactionRow.getByRole('button', { name: /edytuj/i }).click();

    // Edit amount
    const amountInput = transactionRow.locator('input[type="number"]');
    await amountInput.fill('2500.00');

    // Edit date
    const dateInput = transactionRow.locator('input[type="date"]');
    await dateInput.fill('2026-02-15');

    // Save changes
    await transactionRow.getByRole('button', { name: /zapisz/i }).click();

    // Verify updated values appear
    await expect(transactionRow).toContainText('2 500,00'); // Polish currency format
    await expect(transactionRow).toContainText('15.02.2026'); // Polish date format

    // Verify Edit button is back (not in edit mode)
    await expect(transactionRow.getByRole('button', { name: /edytuj/i })).toBeVisible();
  });

  test('user can change transaction client', async ({ page }) => {
    const testId = `test-${Date.now()}`;

    // Setup: Upload revenue CSV with multiple clients
    await page.goto('/onboarding/step-1');
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${testId}-ClientA,Service A,1000.00,2026-01-10`,
      `${testId}-ClientB,Service B,1500.00,2026-01-11`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-multi-client.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });

    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();

    // Navigate to transactions
    await page.goto('/transactions');

    // Edit first transaction
    const firstRow = page.locator(`tr:has-text("${testId}-ClientA")`).first();
    await firstRow.getByRole('button', { name: /edytuj/i }).click();

    // Change client
    const clientSelect = firstRow.locator('select');
    await clientSelect.selectOption({ label: new RegExp(`${testId}-ClientB`) });

    // Save
    await firstRow.getByRole('button', { name: /zapisz/i }).click();

    // Verify client changed
    await expect(firstRow).toContainText(`${testId}-ClientB`);
  });

  test('user can cancel edit without saving', async ({ page }) => {
    const testId = `test-${Date.now()}`;

    // Setup
    await page.goto('/onboarding/step-1');
    const revenueCSV = [
      'Client,Description,Amount,Date',
      `${testId}-CancelClient,Service,1000.00,2026-01-10`,
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `${testId}-cancel.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(revenueCSV),
    });

    await page.getByRole('button', { name: /upload|submit/i }).click();
    await expect(page.getByText(/success|uploaded/i)).toBeVisible();

    // Navigate to transactions
    await page.goto('/transactions');

    const row = page.locator(`tr:has-text("${testId}-CancelClient")`);
    await row.getByRole('button', { name: /edytuj/i }).click();

    // Change amount
    const amountInput = row.locator('input[type="number"]');
    await amountInput.fill('9999.00');

    // Cancel
    await row.getByRole('button', { name: /anuluj/i }).click();

    // Verify original amount is still there
    await expect(row).toContainText('1 000,00'); // Original amount
    await expect(row).not.toContainText('9 999,00'); // Changed amount
  });
});

test.describe('CRUD Operations - Authorization', () => {
  test('unauthenticated user cannot access uploads page', async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();

    await page.goto('/uploads');

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/);
  });

  test('unauthenticated user cannot access transactions page', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/transactions');

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/);
  });
});
