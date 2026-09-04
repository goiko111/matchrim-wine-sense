import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Camera,
  ChevronRight,
  FileText,
  History,
  Layers3,
  MessageCircle,
  ScanLine,
  Sparkles,
  UserRound,
  Wine,
} from 'lucide-react';
import AppNav from '@/components/AppNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildAuthRedirectPath } from '@/utils/navigation';
import heroWine from '@/assets/hero-tinto-versatil.jpg';
import {
  SCAN_HISTORY_UPDATED_EVENT,
  getScanHistory,
  type ScanHistoryItem,
} from '@/utils/scanHistory';

interface NativeAppHomeProps {
  hasQuizResults: boolean;
  matchrimCode?: string;
  loadingCode?: boolean;
}

const scanTypeLabels: Record<ScanHistoryItem['type'], string> = {
  label: 'Etiquetas',
  'wine-menu': 'Carta',
  'food-menu': 'Menú',
  dish: 'Plato',
  'shop-link': 'Búsqueda',
};

const formatScanTime = (timestamp: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
};

const NativeAppHome = ({ hasQuizResults, matchrimCode = '', loadingCode = false }: NativeAppHomeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const hasCode = hasQuizResults && Boolean(matchrimCode);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>(() => getScanHistory().slice(0, 3));

  useEffect(() => {
    const refresh = () => setRecentScans(getScanHistory().slice(0, 3));
    window.addEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const openProfile = () => {
    navigate(user ? '/profile' : buildAuthRedirectPath('/profile'));
  };

  return (
    <div className="matchrim-app-shell min-h-screen text-slate-950">
      {!isNative && (user ? <AppNav /> : (
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <button type="button" onClick={() => navigate('/')} className="matchrim-pressable flex min-h-11 items-center gap-3">
              <img src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" alt="Logo Matchrim" className="h-8 w-8" />
              <span className="text-lg font-bold">Matchrim</span>
            </button>
            <Button variant="outline" onClick={() => navigate(buildAuthRedirectPath('/'))}>Entrar</Button>
          </div>
        </header>
      ))}

      <main className="matchrim-native-safe-x mx-auto w-full max-w-2xl pb-[calc(7.5rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/')} className="matchrim-pressable flex items-center gap-2.5 text-left" aria-label="Inicio de Matchrim">
            <img src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold text-slate-950">Matchrim</span>
          </button>
          <button
            type="button"
            onClick={openProfile}
            className="matchrim-pressable flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label={user ? 'Abrir perfil' : 'Entrar en Matchrim'}
          >
            <UserRound className="h-5 w-5" />
          </button>
        </div>

        <section className="mt-6" aria-labelledby="home-decision-title">
          <p className="text-sm font-semibold text-red-800">Tu vino, con contexto</p>
          <h1 id="home-decision-title" className="mt-1 text-[2rem] font-bold leading-[1.08] text-slate-950">
            ¿Qué quieres elegir?
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-slate-600">
            Haz una foto. Matchrim identifica, compara y explica qué encaja contigo.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/escanear/etiqueta')}
              className="matchrim-pressable relative flex min-h-[10.5rem] flex-col justify-between overflow-hidden rounded-lg bg-slate-950 p-3 text-left text-white shadow-sm"
            >
              <img src={heroWine} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
                <Camera className="h-[1.1rem] w-[1.1rem]" />
              </span>
              <span className="relative z-10 mt-4 block">
                <span className="block text-lg font-bold">Botellas</span>
                <span className="mt-0.5 block text-xs leading-4 text-white/78">Una etiqueta o toda la mesa</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/escanear/carta-vinos')}
              className="matchrim-pressable relative flex min-h-[10.5rem] flex-col justify-between overflow-hidden rounded-lg bg-emerald-950 p-3 text-left text-white shadow-sm"
            >
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-950">
                <FileText className="h-[1.1rem] w-[1.1rem]" />
              </span>
              <span className="relative z-10 mt-4 block">
                <span className="block text-lg font-bold">Carta</span>
                <span className="mt-0.5 block text-xs leading-4 text-white/76">Impresa, pizarra o PDF</span>
              </span>
              <ScanLine className="absolute right-3 top-3 h-16 w-16 text-white/8" strokeWidth={1.25} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="mt-6 border-y border-slate-200" aria-label="Comparación rápida">
          <button
            type="button"
            onClick={() => navigate('/escanear/etiqueta')}
            className="matchrim-pressable flex min-h-[4.75rem] w-full items-center gap-3 py-3 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-950">
              <Layers3 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-950">Comparar 2-5 vinos</span>
              <span className="mt-0.5 block text-sm text-slate-500">Afinidad, confianza y mejor valor</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        </section>

        <section className="mt-7" aria-labelledby="profile-summary-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Afinidad personal</p>
              <h2 id="profile-summary-title" className="mt-0.5 text-xl font-bold text-slate-950">
                {hasCode ? 'Tu Matchrim está listo' : 'Hazlo realmente tuyo'}
              </h2>
            </div>
            {hasCode && <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-900">{matchrimCode}</span>}
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm leading-5 text-slate-600">
                {hasCode
                  ? 'Tus puntuaciones explican coincidencias, fricciones y cuánto estás explorando.'
                  : loadingCode
                    ? 'Estamos recuperando tu perfil sensorial.'
                    : 'Crea tu perfil sensorial para ordenar cada escaneo por afinidad.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(hasQuizResults ? '/profile' : '/matchrim')}
              className="matchrim-pressable flex h-11 w-11 items-center justify-center rounded-full bg-red-900 text-white"
              aria-label={hasQuizResults ? 'Ver mi perfil Matchrim' : 'Crear mi perfil Matchrim'}
            >
              {hasQuizResults ? <ArrowUpRight className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </button>
          </div>
        </section>

        <section className="mt-7" aria-label="Acciones de sommelier">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/inteligencia-liquida')}
              className="matchrim-pressable flex min-h-[4.5rem] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-sm"
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-red-800" />
              <span className="text-sm font-semibold leading-5 text-slate-900">Preguntar a aiRIM</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(user ? '/my-wines' : buildAuthRedirectPath('/my-wines'))}
              className="matchrim-pressable flex min-h-[4.5rem] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-sm"
            >
              <Wine className="h-5 w-5 shrink-0 text-emerald-800" />
              <span className="text-sm font-semibold leading-5 text-slate-900">Abrir mi bodega</span>
            </button>
          </div>
        </section>

        {recentScans.length > 0 && (
          <section className="mt-8" aria-labelledby="recent-scans-title">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h2 id="recent-scans-title" className="text-base font-bold text-slate-950">Últimos escaneos</h2>
            </div>
            <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
              {recentScans.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="matchrim-pressable flex min-h-16 w-full items-center gap-3 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {scanTypeLabels[item.type]} · {formatScanTime(item.createdAt)}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {(isNative || !user) && <MobileBottomNav />}
    </div>
  );
};

export default NativeAppHome;
