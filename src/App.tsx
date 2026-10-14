
import { lazy, Suspense, useEffect, useState, useLayoutEffect, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountNotifications from '@/components/AccountNotifications';
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
const Scan = lazy(() => import('@/pages/Scan'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Terms = lazy(() => import('@/pages/Terms'));
const AccountDeletion = lazy(() => import('@/pages/AccountDeletion'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

function PageFallback() {
  const isNative = Capacitor.isNativePlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    setDelayed(false);
    if (!isNative) return;
    const timer = window.setTimeout(() => setDelayed(true), 10000);
    return () => window.clearTimeout(timer);
  }, [isNative, location.pathname, location.search]);
  if (isNative) return (
    <main className="matchrim-native-safe-x flex min-h-screen items-center justify-center bg-slate-50 px-5 pt-[var(--matchrim-safe-top)] pb-[var(--matchrim-safe-bottom)]">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p role="status" className="text-slate-700">{delayed ? 'Esta pantalla est\u00e1 tardando m\u00e1s de lo esperado.' : 'Cargando Matchrim...'}</p>
        {delayed && <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/', { replace: true })}><ArrowLeft className="mr-2 h-4 w-4" />Inicio</Button>
          <Button onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button>
        </div>}
      </div>
    </main>
  );
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <p className="text-muted-foreground">Cargando Matchrim...</p>
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
  useLayoutEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <AppErrorBoundary resetKey={resetKey}>
      <div className="App">
        <div className="matchrim-safe-area-top-guard" aria-hidden="true" />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/matchrim" element={<Matchrim />} />
            <Route path="/usar-matchrim" element={<UseMatchrim />} />
            <Route path="/escanear" element={<Scan />} />
            <Route path="/escanear/:mode" element={<Scan />} />
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
            <Route path="/my-wines/:section" element={<MyWines />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/account/delete" element={<AccountDeletion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <AccountNotifications />
      </div>
    </AppErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
