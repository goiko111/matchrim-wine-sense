
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Brain } from 'lucide-react';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAuthClick = () => {
    navigate('/auth');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLiquidIntelligenceClick = () => {
    navigate('/inteligencia-liquida');
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-red-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
            alt="Logo Winerim" 
            className="h-8 w-8"
          />
          <h1 className="text-xl font-bold text-red-900">Winerim</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLiquidIntelligenceClick}
                className="text-red-700 hover:bg-red-50"
              >
                <Brain className="h-4 w-4 mr-2" />
                Inteligencia Líquida
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleProfileClick}
                className="text-red-700 hover:bg-red-50"
              >
                <User className="h-4 w-4 mr-2" />
                Mi Perfil
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
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
