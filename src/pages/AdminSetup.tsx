
import React from 'react';
import Header from '@/components/Header';
import AdminRoleAssignment from '@/components/AdminRoleAssignment';

const AdminSetup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Configuración de Administrador
          </h1>
          <AdminRoleAssignment />
        </div>
      </main>
    </div>
  );
};

export default AdminSetup;
