/**
 * CSVPreviewTable Component
 * 
 * Displays first 5 rows of CSV with column headers in a table.
 * Used to show preview after upload.
 */

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface CSVPreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  caption?: string;
}

export default function CSVPreviewTable({
  headers,
  rows,
  caption = 'Preview of uploaded data (first 5 rows)',
}: CSVPreviewTableProps) {
  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/60">
        No data to preview
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
      <Table>
        {caption && <TableCaption className="text-white/60">{caption}</TableCaption>}
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-white/5">
            {headers.map((header) => (
              <TableHead key={header} className="font-semibold text-white">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={index}
              className="border-white/10 hover:bg-white/5"
            >
              {headers.map((header) => (
                <TableCell key={header} className="text-white/80">
                  {row[header] || '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
