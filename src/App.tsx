
import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import './App.css';
import { I18nProvider } from '@/i18n';

const queryClient = new QueryClient();

const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const Profile = lazy(() => import('@/pages/Profile'));
const Registration = lazy(() => import('@/pages/Registration'));
const Matchrim = lazy(() => import('@/pages/Matchrim'));
const LiquidIntelligence = lazy(() => import('@/pages/LiquidIntelligence'));
const ImportCSV = lazy(() => import('@/pages/ImportCSV'));
const Admin = lazy(() => import('@/pages/Admin'));
const DataViewer = lazy(() => import('@/pages/DataViewer'));
const WineStyles = lazy(() => import('@/pages/WineStyles'));
const WineStyleDetail = lazy(() => import('@/pages/WineStyleDetail'));
const WineDetail = lazy(() => import('@/pages/WineDetail'));
const WineSearch = lazy(() => import('@/pages/WineSearch'));
const WineImport = lazy(() => import('@/pages/WineImport'));
const MyWines = lazy(() => import('@/pages/MyWines'));
const UseMatchrim = lazy(() => import('@/pages/UseMatchrim'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Terms = lazy(() => import('@/pages/Terms'));
const AccountDeletion = lazy(() => import('@/pages/AccountDeletion'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <p className="text-muted-foreground">Cargando Winerim...</p>
    </div>
  );
}

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

function AppRoutes() {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <AppErrorBoundary resetKey={resetKey}>
      <div className="App">
        <Suspense fallback={<PageFallback />}>
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
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/account/delete" element={<AccountDeletion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </AppErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
