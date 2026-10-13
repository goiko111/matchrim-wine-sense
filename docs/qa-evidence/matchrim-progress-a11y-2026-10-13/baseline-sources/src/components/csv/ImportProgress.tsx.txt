
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  isLoading: boolean;
  progress: number;
}

const ImportProgress: React.FC<ImportProgressProps> = ({ isLoading, progress }) => {
  if (!isLoading) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Importando...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
};

export default ImportProgress;
