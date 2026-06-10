import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wine, User, LogOut, Database, Upload, Shield, Sparkles, Home, BookOpen, ScanLine, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AppNav = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActivePath = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/matchrim', label: 'Matchrim', icon: Wine },
    { path: '/usar-matchrim', label: 'Usar Código', icon: ScanLine },
    { path: '/inteligencia-liquida', label: 'Inteligencia Líquida', icon: Sparkles },
    { path: '/wine-styles', label: 'Estilos de Vino', icon: Wine },
    { path: '/my-wines', label: 'Mis Vinos', icon: BookOpen, requiresAuth: true },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
              alt="Logo Winerim"
              className="h-7 w-7"
            />
            <span className="font-bold text-xl text-gray-900">Winerim</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.filter(link => !link.requiresAuth || user).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(link.path)
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/data-viewer" className="flex items-center gap-2 cursor-pointer">
                          <Database className="h-4 w-4" />
                          Ver Datos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/import-csv" className="flex items-center gap-2 cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Importar CSV
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="h-4 w-4" />
                          Panel Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/wine-search" className="flex items-center gap-2 cursor-pointer">
                          <Wine className="h-4 w-4" />
                          Buscador de Vinos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/wine-import" className="flex items-center gap-2 cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Importar Vinos
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/privacy" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      Privacidad
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/terms" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Términos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/delete" className="flex items-center gap-2 cursor-pointer text-red-700">
                      <Trash2 className="h-4 w-4" />
                      Eliminar cuenta
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </nav>
  );
};

export default AppNav;
