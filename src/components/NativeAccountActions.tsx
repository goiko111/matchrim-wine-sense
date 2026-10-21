import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function NativeAccountActions() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [closing, setClosing] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const owner = useRef(user?.id ?? null);
  owner.current = user?.id ?? null;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const closeSession = async () => {
    if (pending.current || !user) return;
    const expectedOwner = user.id;
    pending.current = true;
    setClosing(true);
    try {
      const closed = await signOut();
      if (closed && mounted.current && (owner.current === null || owner.current === expectedOwner)) {
        navigate('/', { replace: true });
      }
    } catch {
      if (mounted.current && (owner.current === null || owner.current === expectedOwner)) {
        toast({ title: 'Cierre sin confirmar', description: 'No hemos podido confirmar el cierre de sesión. Revisa la cuenta antes de continuar.', variant: 'destructive' });
      }
    } finally {
      pending.current = false;
      if (mounted.current) setClosing(false);
    }
  };
  if (!Capacitor.isNativePlatform() || !user) return null;
  return (
    <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 [overflow-wrap:anywhere]" aria-label="Cuenta actual">
        <p className="text-xs font-medium leading-5 text-stone-500">Tu cuenta</p>
        <p className="text-sm font-semibold leading-6 text-stone-950">{user.email || 'Sesion iniciada'}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Ajustes de cuenta" title="Ajustes de cuenta" disabled={closing}><Settings aria-hidden="true" className="h-5 w-5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem className="min-h-11 gap-2" disabled={closing} onSelect={() => navigate('/privacy')}><ShieldCheck className="h-4 w-4" />Privacidad</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-2" disabled={closing} onSelect={() => navigate('/account/delete')}><Trash2 className="h-4 w-4" />Eliminar cuenta</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 gap-2" disabled={closing} onSelect={event => {
            event.preventDefault();
            void closeSession();
          }}><LogOut className="h-4 w-4" />{closing ? 'Cerrando sesión...' : 'Cerrar sesión'}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
