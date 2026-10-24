import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Camera, ChevronRight, Search, UserRound, X } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { NativeWineSearch97 } from '@/components/wine-import/NativeWineSearch97';
import { buildNativeRecommendation95 } from '@/utils/nativeRecommendation95';
import { createNativeWineDraft98 } from '@/utils/nativeWineDraft98';
import { buildAuthRedirectPath } from '@/utils/navigation';
import type { WinerimWineWithMatch } from '@/services/winerimApi';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import type { ScanHistoryItem } from '@/utils/scanHistory';

interface Props {
  ownerId: string | null;
  hasProfile: boolean;
  loading: boolean;
  unavailable: boolean;
  exhausted: boolean;
  recommendations: WinerimWineWithMatch[];
  profile?: MatchrimProfileLike | null;
  recent: ScanHistoryItem[];
  onSelect: (wine: WinerimWineWithMatch, trigger?: HTMLButtonElement) => void;
  detail: ReactNode;
}

export const NativeHome98 = ({ ownerId, hasProfile, loading, unavailable, exhausted,
  recommendations, profile, recent, onSelect, detail }: Props) => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  return <div className="matchrim-app-shell matchrim-native-home-shell min-h-screen bg-[#fafafa] text-stone-950" data-testid="native-home98">
    <main className="matchrim-native-home-main matchrim-native-safe-x mx-auto w-full max-w-xl pb-[calc(7rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
      <header className="mb-5 flex min-h-11 items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 whitespace-nowrap text-[24px] font-bold" style={{ WebkitTextSizeAdjust: '100%' }}><img src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" className="h-[32px] w-[32px] object-contain" alt="" />Matchrim</h1>
        <button type="button" aria-label={ownerId ? 'Abrir perfil' : 'Entrar en Matchrim'} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white" onClick={() => navigate(ownerId ? '/profile' : buildAuthRedirectPath('/profile'))}><UserRound className="h-5 w-5" /></button>
      </header>
      <button type="button" aria-label="Buscar vino o bodega" className="mb-6 flex min-h-12 w-full items-center gap-3 rounded-md border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-600" onClick={() => setSearchOpen(true)}><Search className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 [overflow-wrap:normal]">Buscar vino</span></button>

      <button type="button" className="mb-6 flex min-h-14 w-full items-center justify-between gap-3 border-y border-stone-200 py-3 text-left" onClick={() => navigate('/restaurante')}>
        <span className="min-w-0"><span className="block text-base font-semibold">¿Qué vas a comer?</span><span className="mt-1 block text-sm text-stone-600">Elegir el vino para tu comida</span></span>
        <ArrowRight className="h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
      </button>

      <section aria-labelledby="home-wines98-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="home-wines98-title" className="text-xl font-semibold">{hasProfile ? 'Para tu paladar' : 'Tu próximo vino'}</h2>
          {hasProfile && recommendations.length > 0 && <button type="button" className="min-h-11 text-sm font-semibold text-red-900" onClick={() => navigate('/usar-matchrim')}>Ver todos</button>}
        </div>
        {loading ? <div role="status" className="space-y-4" aria-label="Cargando vinos">
          {[0, 1].map(key => <div key={key} className="flex gap-4"><div className="h-36 w-24 shrink-0 rounded-md bg-stone-100 motion-safe:animate-pulse" /><div className="flex-1 space-y-3 py-4"><div className="h-4 w-3/4 rounded bg-stone-100" /><div className="h-4 w-1/2 rounded bg-stone-100" /></div></div>)}
        </div> : recommendations.length ? <div className="divide-y divide-stone-200" data-testid="native-home-wines98">
          {recommendations.slice(0, 4).map(wine => {
            const { result } = buildNativeRecommendation95(wine, profile);
            return <button key={String(wine.id)} type="button" className="grid min-h-44 w-full min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 py-4 text-left [html.matchrim-accessibility-text_&]:grid-cols-1" onClick={event => onSelect(wine, event?.currentTarget)}
              aria-label={`Ver por qué ${wine.name}${result.state === 'ready' ? `. Afinidad orientativa ${result.score} de 100` : '. Afinidad pendiente'}`}>
              <NativeWinePhoto98 src={wine.photo} name={wine.name} className="h-36 w-[5.5rem] border border-stone-200" />
              <span className="block min-w-0">
                <span className="block break-words text-base font-semibold leading-6">{wine.name}</span>
                <span className="mt-1 block break-words text-xs leading-5 text-stone-500">{[wine.winery, wine.vintage].filter(Boolean).join(' · ')}</span>
                <span className={`mt-2 block text-sm font-semibold ${result.state === 'ready' && result.score >= 65 ? 'text-emerald-800' : 'text-stone-700'}`}>{result.state === 'ready' ? result.title : 'Afinidad por calcular'}</span>
                <span className="mt-1 block text-sm leading-6 text-stone-700">{result.state === 'ready'
                  ? result.matches[0] ?? result.caution ?? 'El encaje depende del conjunto de sus rasgos.'
                  : result.reason === 'profile' ? 'Falta conocer tus gustos.' : 'Revisa qué datos faltan en su ficha.'}</span>
                {result.state === 'ready' && <span className="mt-2 block text-xs font-medium text-stone-500">≈{result.score}/100 por estilo</span>}
              </span>
            </button>;
          })}
        </div> : <div className="border-y border-stone-200 py-6">
          <p className="text-base leading-7 text-stone-700">{unavailable ? 'No hemos podido cargar tus recomendaciones.' : exhausted ? 'Ya tienes estos vinos en tu colección.' : 'Empieza por una botella que tengas delante.'}</p>
          <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-3 font-semibold text-white" onClick={() => navigate(exhausted ? '/my-wines' : '/escanear/etiqueta')}>
            <Camera className="h-5 w-5" aria-hidden="true" />{exhausted ? 'Ver mis vinos' : 'Escanear una botella'}
          </button>
          {unavailable && <button type="button" className="mt-2 min-h-11 font-semibold text-red-900" onClick={() => navigate('/usar-matchrim')}>Reintentar recomendaciones</button>}
        </div>}
      </section>

      {recent.length > 0 && <section className="mt-7" aria-labelledby="home-recent98-title">
        <h2 id="home-recent98-title" className="mb-2 text-lg font-semibold">Recientes</h2>
        <div className="divide-y divide-stone-200">{recent.slice(0, 3).map(item => <button key={item.id} type="button" className="flex min-h-16 w-full items-center gap-3 py-3 text-left" onClick={() => navigate(item.route)}>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{item.title}</span>{item.subtitle && <span className="mt-1 block break-words text-xs text-stone-500">{item.subtitle}</span>}</span><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>)}</div>
      </section>}
      <button type="button" className="mt-7 flex min-h-14 w-full items-center justify-between gap-3 border-t border-stone-200 py-4 text-left text-sm font-medium text-stone-600" onClick={() => navigate(hasProfile ? '/profile' : '/matchrim')}>
        {hasProfile ? 'Mis gustos' : 'Conocer mis gustos'}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </main>
    <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-xl flex-col bg-white px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3"><Dialog.Title className="text-lg font-semibold">Buscar vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar búsqueda"><X className="h-5 w-5" /></Dialog.Close></div>
        <Dialog.Description className="sr-only">Busca una referencia del catálogo y revisa los datos antes de guardarla.</Dialog.Description>
        <div className="min-h-0 overflow-y-auto"><NativeWineSearch97 onSelectWine={wine => {
          setSearchOpen(false);
          navigate(ownerId ? '/my-wines/add' : buildAuthRedirectPath('/my-wines/add'), ownerId ? { state: createNativeWineDraft98(wine, ownerId) } : undefined);
        }} /></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    {detail}<MobileBottomNav />
  </div>;
};
