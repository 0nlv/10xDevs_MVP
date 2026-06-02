/**
 * UploadSummary Component
 * 
 * Display summary cards for both revenue and cost uploads showing
 * filename, row count, upload timestamp.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface Upload {
  filename: string;
  row_count: number;
  uploaded_at: string;
}

interface UploadSummaryProps {
  revenueUpload: Upload;
  costUpload: Upload;
}

export default function UploadSummary({
  revenueUpload,
  costUpload,
}: UploadSummaryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-green-400/20 bg-green-400/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Revenue Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-white/80">
          <p className="text-sm">
            <span className="font-medium">File:</span> {revenueUpload.filename}
          </p>
          <p className="text-sm">
            <span className="font-medium">Rows:</span> {revenueUpload.row_count}
          </p>
          <p className="text-sm">
            <span className="font-medium">Uploaded:</span>{' '}
            {formatDate(revenueUpload.uploaded_at)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-400/20 bg-green-400/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Cost Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-white/80">
          <p className="text-sm">
            <span className="font-medium">File:</span> {costUpload.filename}
          </p>
          <p className="text-sm">
            <span className="font-medium">Rows:</span> {costUpload.row_count}
          </p>
          <p className="text-sm">
            <span className="font-medium">Uploaded:</span>{' '}
            {formatDate(costUpload.uploaded_at)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
