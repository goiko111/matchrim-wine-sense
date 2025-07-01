
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Registration from '@/pages/Registration';
import LiquidIntelligence from '@/pages/LiquidIntelligence';
import ImportCSV from '@/pages/ImportCSV';
import AdminSetup from '@/pages/AdminSetup';
import DataViewer from '@/pages/DataViewer';
import NotFound from '@/pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

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
              <Route path="/inteligencia-liquida" element={<LiquidIntelligence />} />
              <Route path="/import-csv" element={<ImportCSV />} />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="/data-viewer" element={<DataViewer />} />
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
