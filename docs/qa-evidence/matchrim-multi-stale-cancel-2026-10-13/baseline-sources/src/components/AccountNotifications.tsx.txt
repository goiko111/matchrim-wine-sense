import { useLayoutEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { clearToasts } from '@/hooks/use-toast';
import { Toaster as LegacyToaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

export default function AccountNotifications() {
  const { user } = useAuth();
  const owner = user?.id ?? 'anonymous';
  const previousOwner = useRef(owner);
  useLayoutEffect(() => {
    if (previousOwner.current !== owner) {
      toast.dismiss();
      clearToasts();
      previousOwner.current = owner;
    }
  }, [owner]);

  return <>
    <LegacyToaster />
    <SonnerToaster key={`sonner-${owner}`} position="top-center" offset="calc(var(--matchrim-safe-top) + 12px)"
      visibleToasts={1} closeButton containerAriaLabel="Avisos" className="matchrim-notices toaster group" />
  </>;
}
