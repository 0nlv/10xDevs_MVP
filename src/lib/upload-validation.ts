/**
 * Upload validation utilities
 * 
 * Centralized file validation logic (size, type, structure) reused across 
 * revenue and cost upload endpoints.
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ["text/csv", "application/vnd.ms-excel"];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface StructureValidationResult extends ValidationResult {
  headers?: string[];
  rowCount?: number;
}

/**
 * Validate file size against MAX_FILE_SIZE limit
 */
export function validateFileSize(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Please upload a smaller file.`,
    };
  }
  return { valid: true };
}

/**
 * Validate file type - accepts CSV files by MIME type or extension
 */
export function validateFileType(file: File): ValidationResult {
  const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.type);
  const isValidExtension = file.name.toLowerCase().endsWith('.csv');
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a CSV file (.csv).",
    };
  }
  return { valid: true };
}

/**
 * Validate CSV structure - minimum 2 columns and 1 data row
 * Uses papaparse to parse and check structure
 */
export async function validateCSVStructure(
  csvContent: string
): Promise<StructureValidationResult> {
  // Dynamically import papaparse to avoid SSR issues
  const Papa = (await import('papaparse')).default;

  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rowCount = results.data.length;

        if (headers.length < 2) {
          resolve({
            valid: false,
            error: "CSV must have at least 2 columns.",
          });
          return;
        }

        if (rowCount < 1) {
          resolve({
            valid: false,
            error: "CSV must have at least 1 data row (excluding header).",
          });
          return;
        }

        resolve({
          valid: true,
          headers,
          rowCount,
        });
      },
      error: (error: Error) => {
        resolve({
          valid: false,
          error: `Failed to parse CSV: ${error.message}`,
        });
      },
    });
  });
}
