
import React from 'react';
import CSVImporter from '@/components/CSVImporter';
import Header from '@/components/Header';

const ImportCSV = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Header />
      <main>
        <CSVImporter />
      </main>
    </div>
  );
};

export default ImportCSV;
