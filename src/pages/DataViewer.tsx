
import React from 'react';
import Header from '@/components/Header';
import DataViewerTabs from '@/components/data-viewer/DataViewerTabs';
import DataStats from '@/components/DataStats';

const DataViewer = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Consulta de Datos Cargados
          </h1>
          <DataStats />
          <div className="mt-8">
            <DataViewerTabs />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataViewer;
