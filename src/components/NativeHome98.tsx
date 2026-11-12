import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Camera, ChevronRight, RefreshCw, ScrollText, Search, UserRound, Utensils, X, ThumbsDown, ThumbsUp } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { NativeStoreSearch139 } from '@/components/NativeStoreSearch139';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import { getScannedWines139, markScannedSaved144, SCANNED_WINES_EVENT139, type ScannedWine139 } from '@/utils/scannedWines139';
import { searchStore139 } from '@/utils/storeListing139';
import { saveStoreWine142 } from '@/components/NativeSaveChoice142';
import { formatWineType } from '@/utils/wineFormatters';
import { NativeSearchWine138 } from '@/components/NativeSearchWine138';
import { buildNativeRecommendation95 } from '@/utils/nativeRecommendation95';
import { createNativeWineDraft98, stashSignedOutWineDraft134 } from '@/utils/nativeWineDraft98';
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
  readError?: 'profile' | 'wines' | null;
  onRetry?: () => void;
}

export const NativeHome98 = ({ ownerId, hasProfile, loading, unavailable, exhausted,
  recommendations, profile, recent, onSelect, detail, readError, onRetry }: Props) => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [searched, setSearched] = useState<PublicGlobalRow103 | null>(null);
  // 140: closing a wine opened from the search goes back to the search, with its text and results.
  const [searchQuery, setSearchQuery] = useState('');
  const [fromSearch, setFromSearch] = useState(false);
  // 144: the last scan opens with the number the scan gave (see WineSheet142 catalogueRule).
  const [catalogueRule144, setCatalogueRule144] = useState(false);
  const allButton = useRef<HTMLButtonElement>(null);
  // 139: wines identified by a scan stay one tap away, also when they were not saved.
  const [scanned, setScanned] = useState<ScannedWine139[]>(() => getScannedWines139(ownerId));
  useEffect(() => { const refresh = () => setScanned(getScannedWines139(ownerId)); refresh();
    window.addEventListener(SCANNED_WINES_EVENT139, refresh); return () => window.removeEventListener(SCANNED_WINES_EVENT139, refresh); }, [ownerId]);
  const [liked, setLiked] = useState<{ key: string; ok: boolean } | null>(null);
  const scanKey = (wine: ScannedWine139) => `${wine.name}|${wine.winery}|${wine.vintage}|${wine.at}`;
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const openScanned = async (wine: ScannedWine139) => {
    const rows = await searchStore139(wine.name).catch(() => []);
    const row = rows.find(item => fold(item.name) === fold(wine.name) && (!wine.winery || fold(item.winery) === fold(wine.winery)) && String(item.vintage ?? '') === (wine.vintage ?? ''))
      ?? rows.find(item => fold(item.name) === fold(wine.name) && (!wine.winery || fold(item.winery) === fold(wine.winery)));
    if (row) { setFromSearch(false); setCatalogueRule144(Boolean(wine.catalogue)); setSearched(row); return; }
    const draft = { name: wine.name, producer: wine.winery, vintage: wine.vintage ? Number(wine.vintage) : null };
    if (!ownerId) stashSignedOutWineDraft134(draft);
    navigate(ownerId ? '/my-wines/add' : buildAuthRedirectPath('/my-wines/add'), ownerId ? { state: createNativeWineDraft98(draft, ownerId) } : undefined);
  };
  // 136: one row renderer for Home and the full list ("Ver todos" used to jump to the restaurant screen).
  const renderWine = (wine: WinerimWineWithMatch, fromList = false) => {
    const { result } = buildNativeRecommendation95(wine, profile);
    return <button key={String(wine.id)} type="button" className="grid min-h-44 w-full min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 py-4 text-left [html.matchrim-accessibility-text_&]:grid-cols-1" onClick={event => { if (fromList) setAllOpen(false); onSelect(wine, fromList ? allButton.current ?? undefined : event?.currentTarget); }}
      aria-label={`Ver por qué ${wine.name}${result.state === 'ready' ? `. Afinidad orientativa ${result.score} de 100` : '. Afinidad pendiente'}`}>
      <NativeWinePhoto98 src={wine.photo} name={wine.name} className="h-36 w-[5.5rem] border border-stone-200" />
      <span className="block min-w-0">
        <span className="block break-words text-base font-semibold leading-6">{wine.name}</span>
        <span className="mt-1 block break-words text-xs leading-5 text-stone-500">{[wine.winery, wine.vintage, wine.type ? formatWineType(wine.type) : ''].filter(Boolean).join(' · ')}</span>
        <span className={`mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold ${result.state === 'ready' && result.score >= 65 ? 'text-emerald-800' : 'text-stone-700'}`}>
          {result.state === 'ready' && <span aria-hidden="true" className={`inline-flex min-w-11 shrink-0 items-baseline justify-center rounded-full px-2 py-1 text-base font-bold leading-none ${result.score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'}`}>{result.score}<span className="text-[10px] font-semibold">/100</span></span>}
          <span className="min-w-0">{result.state === 'ready' ? result.title : 'Afinidad por calcular'}</span></span>
        <span className="mt-1 block text-sm leading-6 text-stone-700">{result.state === 'ready'
          ? (result.score >= 65 ? result.matches.slice(0, 2).join(' ') : '') || result.caution || result.matches[0] || 'El encaje depende del conjunto de sus rasgos.'
          : result.reason === 'profile' ? 'Falta conocer tus gustos.' : 'Revisa qué datos faltan en su ficha.'}</span>
      </span>
    </button>;
  };
  return <div className="matchrim-app-shell matchrim-native-home-shell min-h-screen bg-[#fafafa] text-stone-950" data-testid="native-home98">
    <main className="matchrim-native-home-main matchrim-native-safe-x mx-auto w-full max-w-xl pb-[calc(7rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
      <header className="mb-5 flex min-h-11 items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 whitespace-nowrap text-[24px] font-bold" style={{ WebkitTextSizeAdjust: '100%' }}><img src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" className="h-[32px] w-[32px] object-contain" alt="" />Matchrim</h1>
        <button type="button" aria-label={ownerId ? 'Abrir perfil' : 'Entrar en Matchrim'} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white" onClick={() => navigate(ownerId ? '/profile' : buildAuthRedirectPath('/profile'))}><UserRound className="h-5 w-5" /></button>
      </header>
      {!hasProfile && !loading && !readError && <div className="mb-5" data-testid="native-home-hero137">
        <h2 className="text-[26px] font-bold leading-8 tracking-tight">¿Te va a gustar ese vino?</h2>
        <p className="mt-2 text-base leading-6 text-stone-600">Haz una foto a la botella o a la carta y te decimos cuánto encaja contigo antes de pedirlo.</p>
      </div>}
      <button type="button" aria-label="Buscar vino o bodega" className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-md border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-600" onClick={() => setSearchOpen(true)}><Search className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 [overflow-wrap:normal]">Busca un vino por su nombre</span></button>

      {/* 137: the three things people open the app for, one tap away (they were behind the Escanear tab). */}
      <nav aria-label="Qué quieres hacer" className="mb-7 grid grid-cols-3 gap-2 [html.matchrim-accessibility-text_&]:grid-cols-1" data-testid="native-home-actions137">
        {([['/escanear/etiqueta', Camera, 'Una botella', '¿Me gustará?'], ['/escanear/carta', ScrollText, 'Carta de vinos', '¿Cuál pido?'], ['/restaurante', Utensils, 'Comida y vino', '¿Qué va con mi plato?']] as const).map(([route, Icon, title, hint]) =>
          <button key={route} type="button" className="flex min-h-28 min-w-0 flex-col items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm active:bg-stone-50" onClick={() => navigate(route)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-900"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <span className="block min-w-0"><span className="block text-sm font-semibold leading-5">{title}</span><span className="mt-0.5 block text-xs leading-4 text-stone-600">{hint}</span></span>
          </button>)}
      </nav>

      {/* 142: the wine just scanned is the first thing on Home. 143: with «¿Te gustó?» right there, as the owner saw in Vivino. */}
      {scanned.length > 0 && <div className="mb-7 rounded-2xl border border-stone-200 bg-white shadow-sm" data-testid="native-home-last-scan142">
        <button type="button" className="flex w-full items-center gap-4 p-4 text-left active:bg-stone-50" onClick={() => void openScanned(scanned[0])}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-900"><Camera className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase tracking-wide text-stone-500">Tu último escaneo</span>
            <span className="mt-0.5 block break-words text-base font-semibold leading-6">{scanned[0].name}</span>
            <span className="block break-words text-xs text-stone-500">{[scanned[0].winery, scanned[0].vintage].filter(Boolean).join(' · ')}</span></span>
          {scanned[0].score !== null && <span className={`shrink-0 rounded-full px-3 py-1.5 text-lg font-bold ${scanned[0].score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'}`}>{scanned[0].score}<span className="text-xs font-semibold">/100</span></span>}
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>
        {ownerId && <div className="flex min-h-14 items-center justify-between gap-3 border-t border-stone-100 px-4 py-2" data-testid="native-home-liked143">
          {scanned[0].saved || liked?.key === scanKey(scanned[0]) ? <p role="status" className="text-sm font-semibold text-emerald-900">{scanned[0].saved || liked?.ok ? 'Guardado en Probados' : 'No se ha podido guardar'}</p>
            : <><span className="text-sm text-stone-700">¿Lo has probado? ¿Te gustó?</span>
              <span className="flex gap-2">{([['not_for_me', ThumbsDown, 'No me gustó'], ['love', ThumbsUp, 'Me gustó']] as const).map(([rating, Icon, label]) =>
                <button key={rating} type="button" aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 active:bg-stone-100"
                  onClick={() => void saveStoreWine142(ownerId, { name: scanned[0].name, producer: scanned[0].winery, vintage: scanned[0].vintage }, 'tasted', rating).then(ok => { setLiked({ key: scanKey(scanned[0]), ok }); if (ok) markScannedSaved144(ownerId, scanned[0]); })}>
                  <Icon className="h-5 w-5" aria-hidden="true" /></button>)}</span></>}
        </div>}
      </div>}
      <section aria-labelledby="home-wines98-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="home-wines98-title" className="text-xl font-semibold">{hasProfile ? 'Para tu paladar' : 'Primero, tus gustos'}</h2>
          {hasProfile && recommendations.length > 3 && <button ref={allButton} type="button" className="min-h-11 text-sm font-semibold text-red-900" onClick={() => setAllOpen(true)}>Ver todos</button>}
        </div>
        {loading ? <div role="status" className="space-y-4" aria-label="Cargando vinos">
          {[0, 1].map(key => <div key={key} className="flex gap-4"><div className="h-36 w-24 shrink-0 rounded-md bg-stone-100 motion-safe:animate-pulse" /><div className="flex-1 space-y-3 py-4"><div className="h-4 w-3/4 rounded bg-stone-100" /><div className="h-4 w-1/2 rounded bg-stone-100" /></div></div>)}
        </div> : readError ? <div role="alert" className="border-y border-stone-200 py-5" data-testid="native-home-read-error225">
          <p className="text-base font-semibold">{readError === 'profile' ? 'No hemos podido cargar tus gustos' : 'No hemos podido cargar tu bodega'}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{readError === 'profile'
            ? 'No necesitas repetir el test. Vuelve a cargarlo para ver recomendaciones para ti.'
            : 'Necesitamos tus vinos y valoraciones para actualizar las recomendaciones.'}</p>
          <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-red-900" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />Reintentar carga
          </button>
        </div> : recommendations.length ? <div className="divide-y divide-stone-200" data-testid="native-home-wines98">
          {recommendations.slice(0, 3).map(wine => renderWine(wine))}
        </div> : !hasProfile ? <div className="rounded-xl bg-red-950 p-5 text-white" data-testid="native-home-taste137">
          <p className="text-base leading-6">Para decirte si un vino te va a gustar necesitamos conocer tu paladar. No hace falta saber de vino: son 20 preguntas sobre sabores que ya conoces, como el café, el limón o el picante.</p>
          <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-semibold text-red-950" aria-label="Conocer mis gustos" onClick={() => navigate('/matchrim')}>
            Conocer mis gustos · 2 min<ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div> : <div className="border-y border-stone-200 py-6">
          <p className="text-base leading-7 text-stone-700">{unavailable ? 'No hemos podido cargar tus recomendaciones.' : exhausted ? 'Ya tienes estos vinos en tu colección.' : 'Empieza por una botella que tengas delante.'}</p>
          <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-3 font-semibold text-white" onClick={() => navigate(exhausted ? '/my-wines' : '/escanear/etiqueta')}>
            <Camera className="h-5 w-5" aria-hidden="true" />{exhausted ? 'Ver mis vinos' : 'Escanear una botella'}
          </button>
          {unavailable && <button type="button" className="mt-2 min-h-11 font-semibold text-red-900" onClick={() => navigate('/usar-matchrim')}>Reintentar recomendaciones</button>}
        </div>}
      </section>

      {scanned.length > 1 && <section className="mt-7" aria-labelledby="home-scanned139-title" data-testid="native-home-scanned139">
        <h2 id="home-scanned139-title" className="mb-2 text-lg font-semibold">Escaneos anteriores</h2>
        <div className="divide-y divide-stone-200">{scanned.slice(1, 5).map(wine => <button key={`${wine.name}|${wine.winery}|${wine.vintage}`} type="button" className="flex min-h-16 w-full items-center gap-3 py-3 text-left" onClick={() => void openScanned(wine)}>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{wine.name}</span><span className="mt-1 block break-words text-xs text-stone-500">{[wine.winery, wine.vintage].filter(Boolean).join(' · ')}</span></span>
          {wine.score !== null && <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-sm font-bold text-stone-800">{wine.score}<span className="text-[10px] font-semibold">/100</span></span>}
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>)}</div>
      </section>}
      {recent.length > 0 && <section className="mt-7" aria-labelledby="home-recent98-title">
        <h2 id="home-recent98-title" className="mb-2 text-lg font-semibold">Recientes</h2>
        <div className="divide-y divide-stone-200">{recent.slice(0, 3).map(item => <button key={item.id} type="button" className="flex min-h-16 w-full items-center gap-3 py-3 text-left" onClick={() => navigate(item.route)}>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{item.title}</span>{item.subtitle && <span className="mt-1 block break-words text-xs text-stone-500">{item.subtitle}</span>}</span><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
        </button>)}</div>
      </section>}
      {(hasProfile || readError) && <button type="button" className="mt-7 flex min-h-14 w-full items-center justify-between gap-3 border-t border-stone-200 py-4 text-left text-sm font-medium text-stone-600" onClick={() => navigate(ownerId ? '/profile' : '/matchrim')}>
        Mis gustos<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>}
    </main>
    <Dialog.Root open={allOpen} onOpenChange={setAllOpen}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-xl flex-col bg-white px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3"><Dialog.Title className="text-lg font-semibold">Para tu paladar</Dialog.Title><Dialog.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar lista"><X className="h-5 w-5" /></Dialog.Close></div>
        <Dialog.Description className="text-sm text-stone-600">{`${recommendations.length} vinos del catálogo Winerim que aún no tienes, ordenados por afinidad.`}</Dialog.Description>
        <div className="min-h-0 flex-1 divide-y divide-stone-200 overflow-y-auto" data-testid="native-home-all136">{recommendations.map(wine => renderWine(wine, true))}</div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-xl flex-col bg-white px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3"><Dialog.Title className="text-lg font-semibold">Buscar vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar búsqueda"><X className="h-5 w-5" /></Dialog.Close></div>
        <Dialog.Description className="sr-only">Busca un vino y mira cuánto encaja con tus gustos.</Dialog.Description>
        <div className="min-h-0 overflow-y-auto"><NativeStoreSearch139 onManualEntry={name => {
          setSearchOpen(false);
          if (!ownerId) stashSignedOutWineDraft134({ name });
          navigate(ownerId ? '/my-wines/add' : buildAuthRedirectPath('/my-wines/add'), ownerId ? { state: createNativeWineDraft98({ name }, ownerId) } : undefined);
        }} query={searchQuery} onQuery={setSearchQuery} onSelect={wine => { setSearchOpen(false); setFromSearch(true); setCatalogueRule144(false); setSearched(wine); }} /></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <NativeSearchWine138 wine={searched} profile={profile} catalogueRule={catalogueRule144} backLabel={fromSearch ? 'Volver a la búsqueda' : undefined}
      onClose={() => { setSearched(null); if (fromSearch) { setFromSearch(false); setSearchOpen(true); } }} />
    {detail}<MobileBottomNav />
  </div>;
};
