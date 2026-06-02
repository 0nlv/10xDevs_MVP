/**
 * FileUploadInput Component
 * 
 * Reusable file input component with validation, loading state, and error display.
 * Used in both step-1 (revenue upload) and step-2 (cost upload).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateFileSize, validateFileType } from '@/lib/upload-validation';

export interface FileUploadInputProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export default function FileUploadInput({
  onFileSelect,
  accept = '.csv',
  maxSize,
  disabled = false,
  error,
  label = 'Choose CSV file',
}: FileUploadInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setValidationError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side validation
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      setValidationError(sizeValidation.error || 'File size validation failed');
      setSelectedFile(null);
      return;
    }

    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      setValidationError(typeValidation.error || 'File type validation failed');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-2">
      <Label htmlFor="file-upload" className="text-white">
        {label}
      </Label>
      <Input
        id="file-upload"
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="cursor-pointer text-white file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
      />
      {selectedFile && !displayError && (
        <p className="text-sm text-white/60">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}
      {displayError && (
        <p className="text-sm text-red-400">{displayError}</p>
      )}
    </div>
  );
}
