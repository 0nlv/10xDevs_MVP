/**
 * CSV parsing utilities
 * 
 * Wraps papaparse with application-specific configuration.
 * Handles encoding edge cases, returns typed results with preview data.
 */

import Papa from 'papaparse';

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  preview: Record<string, string>[]; // First 5 rows
}

/**
 * Parse CSV content with application-specific configuration
 * 
 * @param csvContent - Raw CSV file content as string
 * @returns Parsed CSV data with headers, rows, and preview
 */
export async function parseCSV(csvContent: string): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvContent, {
      header: true, // First row as headers
      skipEmptyLines: true, // Ignore blank rows
      transform: (value) => value.trim(), // Trim cell values
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data;
        const rowCount = rows.length;
        const preview = rows.slice(0, 5); // First 5 rows only

        resolve({
          headers,
          rows,
          rowCount,
          preview,
        });
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Extract unique client names from CSV rows
 * 
 * Looks for columns with "client" or "customer" in the name (case-insensitive)
 * and extracts unique non-empty values.
 * 
 * @param rows - Parsed CSV rows
 * @param headers - CSV column headers
 * @returns Array of unique client names
 */
export function extractClientNames(
  rows: Record<string, string>[],
  headers: string[]
): string[] {
  // Find client column (case-insensitive match for "client" or "customer")
  const clientColumn = headers.find(
    (h) =>
      h.toLowerCase().includes('client') ||
      h.toLowerCase().includes('customer')
  );

  if (!clientColumn) {
    return [];
  }

  // Extract unique non-empty values
  const uniqueClients = new Set<string>();
  rows.forEach((row) => {
    const clientName = row[clientColumn]?.trim();
    if (clientName) {
      uniqueClients.add(clientName);
    }
  });

  return Array.from(uniqueClients);
}

/**
 * Find column by name pattern (case-insensitive partial match)
 * 
 * @param headers - CSV column headers
 * @param patterns - Array of patterns to match (e.g., ["amount", "cost", "price"])
 * @returns Matched column name or undefined
 */
export function findColumn(
  headers: string[],
  patterns: string[]
): string | undefined {
  return headers.find((header) =>
    patterns.some((pattern) =>
      header.toLowerCase().includes(pattern.toLowerCase())
    )
  );
}
