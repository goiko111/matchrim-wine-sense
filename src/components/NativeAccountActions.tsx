import { Capacitor } from '@capacitor/core';
import { LogOut, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function NativeAccountActions() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!Capacitor.isNativePlatform() || !user) return null;
  return (
    <div className="mb-3 flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Ajustes de cuenta" title="Ajustes de cuenta"><Settings className="h-5 w-5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => navigate('/privacy')}><ShieldCheck className="h-4 w-4" />Privacidad</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => navigate('/account/delete')}><Trash2 className="h-4 w-4" />Eliminar cuenta</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => {
            void signOut().then(() => navigate('/', { replace: true }));
          }}><LogOut className="h-4 w-4" />Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
