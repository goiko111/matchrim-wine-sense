
import React from 'react';
import CSVImporter from '@/components/CSVImporter';
import WineStylesCSVImporter from '@/components/WineStylesCSVImporter';
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
        <div className="container mx-auto px-6 py-8 space-y-6">
          <WineStylesCSVImporter />
          <CSVImporter />
        </div>
      </main>
    </div>
  );
};

export default ImportCSV;
