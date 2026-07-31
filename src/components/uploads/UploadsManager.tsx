/**
 * UploadsManager Component
 * 
 * Displays list of user's uploads with delete functionality.
 * Used in /uploads page for data management.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Upload {
  id: string;
  file_type: 'revenue' | 'cost';
  filename: string;
  row_count: number;
  uploaded_at: string;
}

interface UploadsManagerProps {
  initialUploads: Upload[];
}

export default function UploadsManager({ initialUploads }: UploadsManagerProps) {
  const [uploads, setUploads] = useState<Upload[]>(initialUploads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (uploadId: string, filename: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć "${filename}"? Ta operacja jest nieodwracalna i usunie wszystkie powiązane dane.`)) {
      return;
    }

    setDeletingId(uploadId);
    setError(null);

    try {
      const response = await fetch(`/api/uploads/${uploadId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete upload');
      }

      // Remove from local state
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileTypeLabel = (fileType: string) => {
    return fileType === 'revenue' ? 'Przychody' : 'Koszty';
  };

  if (uploads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak wgranych plików</CardTitle>
          <CardDescription>
            Nie masz jeszcze żadnych wgranych plików CSV. Przejdź do onboardingu, aby wgrać dane.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zarządzanie danymi</CardTitle>
        <CardDescription>
          Lista wgranych plików CSV. Możesz usunąć błędne lub duplikatowe wgrania.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Nazwa pliku</TableHead>
                <TableHead className="text-right">Wiersze</TableHead>
                <TableHead>Data wgrania</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        upload.file_type === 'revenue'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {getFileTypeLabel(upload.file_type)}
                    </span>
                  </TableCell>
                  <TableCell>{upload.filename}</TableCell>
                  <TableCell className="text-right">{upload.row_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(upload.uploaded_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(upload.id, upload.filename)}
                      disabled={deletingId === upload.id}
                    >
                      {deletingId === upload.id ? 'Usuwanie...' : 'Usuń'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
