
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import { ImportResult } from '@/types/csv';

interface ImportResultsProps {
  importResult: ImportResult | null;
}

const ImportResults: React.FC<ImportResultsProps> = ({ importResult }) => {
  if (!importResult) return null;

  return (
    <div className="space-y-4">
      <Alert className={importResult.errors.length > 0 ? 'border-red-200' : 'border-green-200'}>
        {importResult.errors.length > 0 ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <AlertDescription>
          Importación completada: {importResult.success} registros exitosos
          {importResult.skipped > 0 && `, ${importResult.skipped} omitidos`}
          {importResult.updated > 0 && `, ${importResult.updated} actualizados`}
          {importResult.errors.length > 0 && `, ${importResult.errors.length} errores`}
        </AlertDescription>
      </Alert>
      
      {importResult.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-yellow-700">Advertencias:</h4>
          <div className="max-h-32 overflow-auto bg-yellow-50 p-3 rounded text-sm">
            {importResult.warnings.map((warning, index) => (
              <div key={index} className="text-yellow-700">{warning}</div>
            ))}
          </div>
        </div>
      )}
      
      {importResult.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-red-700">Errores:</h4>
          <div className="max-h-32 overflow-auto bg-red-50 p-3 rounded text-sm">
            {importResult.errors.map((error, index) => (
              <div key={index} className="text-red-700">{error}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportResults;
