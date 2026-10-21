import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createNativeWineDraft98 } from '@/utils/nativeWineDraft98';
import { buildAuthRedirectPath } from '@/utils/navigation';

export const NativeWineSave98 = ({ wine }: { wine: { name: string; winery?: string; vintage?: string | number } }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => navigate(user ? '/my-wines/add' : buildAuthRedirectPath('/my-wines/add'), user ? { state: createNativeWineDraft98(wine, user.id) } : undefined)}>
    <Plus className="h-5 w-5" aria-hidden="true" />Guardar en Mis vinos
  </button>;
};
