
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Registration from '@/pages/Registration';
import Matchrim from '@/pages/Matchrim';
import LiquidIntelligence from '@/pages/LiquidIntelligence';
import ImportCSV from '@/pages/ImportCSV';
import Admin from '@/pages/Admin';
import DataViewer from '@/pages/DataViewer';
import WineStyles from '@/pages/WineStyles';
import WineStyleDetail from '@/pages/WineStyleDetail';
import WineDetail from '@/pages/WineDetail';
import WineSearch from '@/pages/WineSearch';
import WineImport from '@/pages/WineImport';
import MyWines from '@/pages/MyWines';
import UseMatchrim from '@/pages/UseMatchrim';
import NotFound from '@/pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/registration" element={<Registration />} />
              <Route path="/matchrim" element={<Matchrim />} />
              <Route path="/usar-matchrim" element={<UseMatchrim />} />
              <Route path="/inteligencia-liquida" element={<LiquidIntelligence />} />
              <Route path="/liquid-intelligence" element={<Navigate to="/inteligencia-liquida" replace />} />
              <Route path="/import-csv" element={<AdminOnly><ImportCSV /></AdminOnly>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/data-viewer" element={<AdminOnly><DataViewer /></AdminOnly>} />
              <Route path="/wine-styles" element={<WineStyles />} />
              <Route path="/wine-styles/:slug" element={<WineStyleDetail />} />
              <Route path="/wines/:id/:slug?" element={<WineDetail />} />
              <Route path="/wine-search" element={<AdminOnly><WineSearch /></AdminOnly>} />
              <Route path="/wine-import" element={<AdminOnly><WineImport /></AdminOnly>} />
              <Route path="/my-wines" element={<MyWines />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
