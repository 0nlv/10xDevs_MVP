/**
 * CostUploadForm Component
 * 
 * React island for cost file selection, upload, preview.
 * Nearly identical to RevenueUploadForm but POSTs to /api/upload-cost.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import FileUploadInput from './FileUploadInput';
import CSVPreviewTable from './CSVPreviewTable';
import { Loader2 } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'preview' | 'error';

interface PreviewData {
  headers: string[];
  rows: Record<string, string>[];
}

interface CostUploadFormProps {
  revenueUploadId: string;
}

export default function CostUploadForm({ revenueUploadId }: CostUploadFormProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    // Reset preview if user selects a new file
    if (state === 'preview') {
      setState('idle');
      setPreview(null);
      setUploadId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file first');
      return;
    }

    setState('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-cost', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadId(data.upload_id);
      setPreview(data.preview);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  };

  const handleContinue = () => {
    if (uploadId) {
      window.location.href = `/onboarding/step-3?revenue_id=${revenueUploadId}&cost_id=${uploadId}`;
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError(null);
    setFile(null);
    setPreview(null);
    setUploadId(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileUploadInput
        onFileSelect={handleFileSelect}
        disabled={state === 'uploading'}
        error={error || undefined}
        label="Cost CSV File"
      />

      {state === 'idle' && file && (
        <Button
          type="submit"
          className="w-full"
          disabled={!file}
        >
          Upload Cost CSV
        </Button>
      )}

      {state === 'uploading' && (
        <Button
          type="button"
          className="w-full"
          disabled
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading...
        </Button>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <Button
            type="button"
            onClick={handleRetry}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      )}

      {state === 'preview' && preview && (
        <div className="space-y-6">
          <div className="rounded-lg border border-green-400/20 bg-green-400/10 p-4">
            <p className="text-sm text-green-400">
              ✓ Upload successful! {preview.rows.length} rows parsed.
            </p>
          </div>

          <CSVPreviewTable
            headers={preview.headers}
            rows={preview.rows}
            caption="Preview of your cost data (first 5 rows)"
          />

          <Button
            type="button"
            onClick={handleContinue}
            className="w-full"
          >
            Continue to Summary
          </Button>
        </div>
      )}
    </form>
  );
}
