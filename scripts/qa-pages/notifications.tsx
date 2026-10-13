import React from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { Toaster } from '../../src/components/ui/sonner';
import '../../src/index.css';

export const NotificationProbe = () => <>
  <main className="px-4 pt-48">
    <h1 className="text-lg font-semibold">Prueba local de avisos</h1>
    <button className="mt-4 min-h-11 border px-4" onClick={() => toast.success('Aviso de prueba local')}>Crear aviso</button>
  </main>
  <Toaster position="top-center" offset="calc(var(--matchrim-safe-top) + 12px)" visibleToasts={1} closeButton containerAriaLabel="Avisos" className="matchrim-notices toaster group" />
</>;

createRoot(document.getElementById('root')!).render(<NotificationProbe />);
