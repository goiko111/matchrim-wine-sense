
import React from 'react';
import CSVImporter from '@/components/CSVImporter';
import DataStats from '@/components/DataStats';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { Separator } from '@/components/ui/separator';

const ImportCSV = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <AppNav />
      <main>
        <DataStats />
        <Separator className="mx-6" />
        <CSVImporter />
      </main>
    </div>
  );
};

export default ImportCSV;
