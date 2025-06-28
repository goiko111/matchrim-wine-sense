
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { CSVRow } from '@/types/csv';

interface CSVPreviewProps {
  csvData: CSVRow[];
}

const CSVPreview: React.FC<CSVPreviewProps> = ({ csvData }) => {
  if (csvData.length === 0) return null;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Se han cargado {csvData.length} filas. Revisa los datos antes de importar.
        </AlertDescription>
      </Alert>
      
      <div className="max-h-64 overflow-auto border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              {Object.keys(csvData[0] || {}).map(key => (
                <TableHead key={key}>{key}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvData.slice(0, 5).map((row, index) => (
              <TableRow key={index}>
                {Object.values(row).map((value, i) => (
                  <TableCell key={i}>{value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {csvData.length > 5 && (
        <p className="text-sm text-gray-500">
          Mostrando las primeras 5 filas de {csvData.length} total
        </p>
      )}
    </div>
  );
};

export default CSVPreview;
