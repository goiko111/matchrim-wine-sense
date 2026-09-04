import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Brain, Upload, Sparkles, Palette, ScanLine } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildAuthRedirectPath } from '@/utils/navigation';

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const currentPath = `${location.pathname}${location.search}`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAuthClick = () => {
    navigate(buildAuthRedirectPath(currentPath));
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLiquidIntelligenceClick = () => {
    navigate('/inteligencia-liquida');
  };

  const handleMatchrimClick = () => {
    // Navegar directamente al test/cuestionario de Matchrim
    navigate('/matchrim');
  };

  const handleImportCSVClick = () => {
    navigate('/import-csv');
  };

  const handleWineStylesClick = () => {
    navigate('/wine-styles');
  };

  const handleUseMatchrimClick = () => {
    navigate('/usar-matchrim');
  };

  if (isNative) return <MobileBottomNav />;

  return (
    <>
      <header className="bg-white/90 backdrop-blur-sm border-b border-red-200 px-4 pb-3 pt-[calc(0.75rem+var(--matchrim-safe-top))] md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
                alt="Logo Matchrim"
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-red-900">Matchrim</h1>
            </div>
            {!user && (
              <Button
                onClick={handleAuthClick}
                className="bg-red-700 hover:bg-red-800 text-white md:hidden"
                size="sm"
              >
                Entrar
              </Button>
            )}
          </div>

          <nav className="hidden w-full flex-nowrap items-center gap-1 overflow-x-auto pb-1 md:flex md:w-auto md:justify-end md:overflow-visible md:pb-0 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMatchrimClick}
              className="text-red-800 hover:bg-red-50"
            >
              <Sparkles className="h-4 w-4 md:mr-2" />
              <span className="text-xs sm:hidden">Test</span>
              <span className="hidden sm:inline">Matchrim</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUseMatchrimClick}
              className="text-red-800 hover:bg-red-50"
            >
              <ScanLine className="h-4 w-4 md:mr-2" />
              <span className="text-xs sm:text-sm">Código</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLiquidIntelligenceClick}
              className="text-red-800 hover:bg-red-50"
            >
              <Brain className="h-4 w-4 md:mr-2" />
              <span className="text-xs sm:text-sm">aiRIM</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWineStylesClick}
              className="text-red-800 hover:bg-red-50"
            >
              <Palette className="h-4 w-4 md:mr-2" />
              <span className="text-xs sm:text-sm">Estilos</span>
            </Button>

            {user && (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleImportCSVClick}
                    className="text-red-700 hover:bg-red-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleProfileClick}
                  className="text-red-700 hover:bg-red-50"
                >
                  <User className="h-4 w-4 md:mr-2" />
                  <span className="hidden sm:inline">Mi Perfil</span>
                </Button>
              </>
            )}

            {user ? (
              <>
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-sm">
                    {user.user_metadata?.first_name || user.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Salir
                </Button>
              </>
            ) : (
              <Button
                onClick={handleAuthClick}
                className="hidden bg-red-700 hover:bg-red-800 text-white md:inline-flex"
                size="sm"
              >
                Iniciar Sesión
              </Button>
            )}
          </nav>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
};

export default Header;
