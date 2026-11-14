import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { confirm135 } from '@/utils/nativeConfirm135';
import { formatScanPrice } from '@/utils/scanMoney';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, ChefHat, ChevronDown, ExternalLink, FilePlus2, Link2, Loader2, Pencil, RefreshCw, ScanLine, Trash2, Wine, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import MobileBottomNav from '@/components/MobileBottomNav';
import { ScanPrivacyGate } from '@/components/ScanPrivacyGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/utils/invokeEdgeFunction';
import { prepareImageForAnalysis } from '@/utils/imageAnalysis';
import { inspectRestaurantFile, renderRestaurantPage, importRestaurantUrl91 } from '@/utils/restaurantDocuments91';
import { parseRestaurantRead91 } from '../../supabase/functions/_shared/matchrim-restaurant91';
import { planRestaurantRanking91, runRestaurantRanking91 } from '@/utils/restaurantRanking91';
import {
  activeRestaurantRows91, addRestaurantDocument91, completeRestaurantPage91, createRestaurantSession91, discardRestaurantRow91, editRestaurantRow91,
  readRestaurantSession91, removeRestaurantDocument91, resetInterruptedRestaurant91, restaurantCoverage91,
  restaurantRowForRequest91, restaurantRowOrigins91,
  writeRestaurantSession91, type MenuKind91, type RestaurantSession91, type SourcedRestaurantRow91,
} from '@/utils/restaurantSession91';
import { isVerifiedWinerimSheetForIdentity, lookupWinerimOriginalSheet, validateWinerimOriginalSensory, type WinerimOriginalSheet as OriginalSheet } from '@/utils/winerimOriginalSheet';
import { WinerimOriginalSheet } from '@/components/WinerimOriginalSheet';
import { loadMatchrimScanProfile } from '@/services/matchrimScanProfile';
import { calculateLocalMatchrimAffinity } from '@/utils/wineAffinityExplanation';
import { AffinityExplanation } from '@/components/AffinityExplanation';
import { card150, title150 } from '@/components/Relief150';
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import { buildConsumerAffinity } from '@/utils/consumerAffinity95';
import { findStoreEstimate138 } from '@/utils/storeEstimate138';
import { storeAffinity139 } from '@/utils/storeListing139';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { openCamera133 } from '@/utils/nativeCamera133';

const actionClass = 'h-auto min-h-[44px] min-w-0 flex-wrap whitespace-normal [overflow-wrap:anywhere] gap-[8px] px-[12px] py-[8px]';
const iconClass = 'h-[44px] w-[44px] min-w-[44px] shrink-0';
const labels = { food: 'Comida', wine: 'Vinos', pairs: 'Combinaciones' } as const;
// 137: what the person sees; `labels` stays for aria names and progress messages.
const tabTitles137 = { food: '1 · Platos', wine: '2 · Vinos', pairs: '3 · Maridajes' } as const;
type Tab = keyof typeof labels;
const message = (error: unknown) => {
  if (!(error instanceof Error)) return 'No se pudo completar la operación.';
  const friendly: Record<string, string> = {
    unauthorized: 'Tu sesión ha caducado. Inicia sesión para continuar.',
    invalid_request: 'Revisa las lecturas y las opciones antes de volver a analizar.',
    invalid_model_response: 'La IA no devolvió una lectura fiable. Revisa la página y vuelve a intentarlo.',
    rate_limited: 'Se ha alcanzado el límite de solicitudes. Inténtalo más tarde.',
    provider_error: 'El análisis no está disponible ahora. Las páginas ya leídas se conservan.',
    analysis_timeout: 'El análisis agotó su tiempo. Puedes volver a intentarlo.',
    public_egress_unverified: 'La importación por URL aún no está habilitada. Puedes añadir el PDF o las imágenes.',
  };
  if (error.message.includes('MATCHRIM_RESTAURANT_PUBLIC_EGRESS_VERIFIED')) return friendly.public_egress_unverified;
  return friendly[error.message] ?? error.message;
};
const stopped = (signal: AbortSignal) => { if (signal.aborted) throw new DOMException('Cancelado', 'AbortError'); };
const digestText = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
  .map(value => value.toString(16).padStart(2, '0')).join('');

const nativeRestaurantAffinity95 = (
  row: Pick<SourcedRestaurantRow91, 'kind' | 'name' | 'producer' | 'vintage'> | null | undefined,
  sheet: OriginalSheet | null, profile: ScanProfileSnapshot['profile'],
) => {
  const linked = Boolean(row?.kind === 'wine' && isVerifiedWinerimSheetForIdentity(row, sheet));
  const sensory = linked ? validateWinerimOriginalSensory(sheet?.sensoryAttributes) : null;
  const attributes = sensory ? { scale: 'winerim-0-5' as const, ...sensory } : null;
  return buildConsumerAffinity({ catalogIdentityLinked: linked, sensorySource: sensory ? 'catalog' : 'inference',
    attributes, profile, score: calculateLocalMatchrimAffinity(profile, attributes) });
};

const RestaurantSession = ({ owner }: { owner: string }) => {
  const { user } = useAuth();
  const native = Capacitor.isNativePlatform();
  const [state, setState] = useState<RestaurantSession91>(createRestaurantSession91);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('food');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState<Array<{ url: string; label: string }>>([]);
  const [selectedFoodState, setSelectedFood] = useState('');
  const [selectedWineState, setSelectedWine] = useState('');
  const [manualWine, setManualWine] = useState('');
  const [budget, setBudget] = useState('');
  const [service, setService] = useState<'any' | 'glass' | 'bottle'>('any');
  const [currency, setCurrency] = useState('EUR');
  const [editing, setEditing] = useState<SourcedRestaurantRow91 | null>(null);
  const [preview, setPreview] = useState<{ name: string; image?: string; text?: string } | null>(null);
  const [sheet, setSheet] = useState<OriginalSheet | null>(null);
  const [profile, setProfile] = useState<ScanProfileSnapshot | null>(null);
  const [personal138, setPersonal138] = useState<Record<string, 'loading' | (ReturnType<typeof buildConsumerAffinity> & { estimated?: boolean })>>({});
  const [sheetRow, setSheetRow] = useState('');
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const persist = useRef<Promise<void>>(Promise.resolve());
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const pairsList = useRef<HTMLOListElement>(null);
  const mutate = (change: (current: RestaurantSession91) => RestaurantSession91) => {
    const next = change(stateRef.current);
    setSavingDraft(true);
    stateRef.current = next;
    setState(next);
  };
  useEffect(() => {
    mounted.current = true;
    readRestaurantSession91(owner).then(saved => {
      if (!mounted.current) return;
      if (saved) { stateRef.current = saved; setState(saved); }
    }).catch(() => { if (mounted.current) setStorageError('El borrador local no está disponible. Conserva las cartas hasta terminar.'); })
      .finally(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; request.current?.abort(); };
  }, [owner]);
  useEffect(() => {
    if (!ready) return;
    // Store each file once and serialize lightweight metadata immediately; a
    // debounce would lose a just-added document on an immediate reopen.
    persist.current = persist.current.catch(() => {}).then(() => writeRestaurantSession91(owner, state))
      .then(() => { if (mounted.current && stateRef.current === state) { setStorageError(''); setSavingDraft(false); } })
      .catch(() => { if (mounted.current) { setStorageError('No se pudo guardar el borrador local.'); setSavingDraft(false); } });
  }, [owner, ready, state]);
  useEffect(() => {
    if (!savingDraft) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [savingDraft]);
  const start = (name: string) => {
    if (request.current) return null;
    const controller = new AbortController();
    request.current = controller;
    setBusy(name); setError(''); setProgress('');
    return controller;
  };
  const finish = (controller: AbortController) => {
    if (!mounted.current || request.current !== controller) return;
    request.current = null; setBusy(null); setProgress('');
  };
  const check = (controller: AbortController) => {
    stopped(controller.signal);
    if (!mounted.current || request.current !== controller) throw new DOMException('Cancelado', 'AbortError');
  };
  const addFiles = async (files: File[], kind: MenuKind91, readAfter = false) => {
    const controller = start('Preparando archivos');
    if (!controller) return;
    const errors: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        check(controller); setProgress(`${index + 1} de ${files.length}: ${file.name}`);
        try {
          const info = await inspectRestaurantFile(file, controller.signal);
          check(controller);
          mutate(current => addRestaurantDocument91(current, { id: crypto.randomUUID(), kind, file,
            name: file.name, digest: info.digest, pageCount: info.pageCount }));
        } catch (failure) { check(controller); errors.push(`${file.name}: ${message(failure)}`); }
      }
      setError(errors.join('\n'));
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { finish(controller); }
    // 137: a photo is read straight away; "Leer la carta" was a second tap nobody expected. PDFs keep the page review first.
    if (readAfter && user && mounted.current && !controller.signal.aborted && !errors.length) void analyze(kind);
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (files.length && tab !== 'pairs') void addFiles(files, tab, files.every(file => file.type.startsWith('image/')));
  };
  const importUrl = async (link = url) => {
    if (!user) { setError('Inicia sesión para importar enlaces y analizar cartas.'); return; }
    const kind = tab === 'wine' ? 'wine' : 'food';
    const controller = start('Importando enlace'); if (!controller) return;
    try {
      const result = await importRestaurantUrl91(link, (body, signal) => invokeEdgeFunction('restaurant-import91', body, signal), controller.signal);
      check(controller);
      if (result.kind === 'file') {
        const info = await inspectRestaurantFile(result.file, controller.signal); check(controller);
        mutate(current => addRestaurantDocument91(current, { id: crypto.randomUUID(), kind, file: result.file,
          name: result.file.name, digest: info.digest, pageCount: info.pageCount, sourceUrl: result.sourceUrl }));
      } else {
        const digest = await digestText(result.text); check(controller);
        if (result.text.trim()) mutate(current => addRestaurantDocument91(current, { id: crypto.randomUUID(), kind,
          name: new URL(result.sourceUrl).hostname, digest, pageCount: 1, text: result.text, sourceUrl: result.sourceUrl }));
        setLinks(result.links);
        if (!result.text.trim() && !result.links.length) throw new Error('El enlace no contiene una carta legible. Añade un PDF o capturas.');
      }
      setUrl('');
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { finish(controller); }
  };
  const analyze = async (kind: MenuKind91) => {
    if (!user) { setError('Inicia sesión para analizar las cartas.'); return; }
    const controller = start(`Leyendo ${labels[kind].toLowerCase()}`); if (!controller) return;
    const snapshot = stateRef.current;
    const docs = new Map(snapshot.documents.map(doc => [doc.id, doc]));
    const pages = snapshot.pages.filter(page => page.enabled && docs.get(page.documentId)?.kind === kind && page.status !== 'read');
    if (pages.length > 4 && !(await confirm135(`Vas a enviar ${pages.length} páginas a la IA, una a una. Puedes cancelar y continuar después. ¿Analizar todas las seleccionadas?`, { ok: 'Analizar' }))) { finish(controller); return; }
    try {
      for (const [index, page] of pages.entries()) {
        check(controller);
        const doc = docs.get(page.documentId)!;
        setProgress(`Página ${index + 1} de ${pages.length} · ${doc.name} · ${page.number}/${doc.pageCount}`);
        mutate(current => ({ ...current, pages: current.pages.map(item => item.id === page.id ? { ...item, status: 'reading', error: undefined } : item) }));
        const timeout = new AbortController();
        const abort = () => timeout.abort(); controller.signal.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, 100_000);
        try {
          let input: { image?: string; text?: string };
          if (doc.text !== undefined) input = { text: doc.text };
          else {
            if (!doc.file) throw new Error('Falta el archivo original. Elimínalo y vuelve a añadirlo.');
            const rendered = await renderRestaurantPage(doc.file, page.number, timeout.signal);
            const prepared = await prepareImageForAnalysis(rendered, 2400, timeout.signal);
            input = { image: prepared.dataUrl };
          }
          check(controller);
          const raw = await invokeEdgeFunction<unknown>('restaurant-workspace91', { operation: 'read', kind, pageId: page.id, ...input }, timeout.signal);
          check(controller); stopped(timeout.signal);
          const parsed = parseRestaurantRead91(raw, kind, page.id);
          mutate(current => completeRestaurantPage91(current, page.id, parsed.rows, parsed.partial, parsed.warnings));
        } catch (failure) {
          check(controller);
          mutate(current => ({ ...current, pages: current.pages.map(item => item.id === page.id
            ? { ...item, status: 'error', partial: true, error: timeout.signal.aborted ? 'Tiempo agotado. Reintenta esta página.' : message(failure) } : item) }));
        } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', abort); }
      }
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally {
      if (mounted.current) mutate(resetInterruptedRestaurant91);
      finish(controller);
    }
  };
  const activeRows = activeRestaurantRows91(state);
  const foods = activeRows.filter(row => row.kind === 'food');
  const wines = activeRows.filter(row => row.kind === 'wine');
  // 134: a dish or wine that left the menus (discarded, page unticked, re-read) is no longer selected.
  const selectedFood = foods.some(row => row.id === selectedFoodState) ? selectedFoodState : '';
  const selectedWine = wines.some(row => row.id === selectedWineState) ? selectedWineState : '';
  const compare = async () => {
    if (!user) { setError('Inicia sesión para combinar las cartas.'); return; }
    if (budget && (!/^\d+(?:[.,]\d{1,2})?$/.test(budget) || Number(budget.replace(',', '.')) <= 0)) {
      setError('Indica un presupuesto positivo con hasta dos decimales.'); return;
    }
    let batches: ReturnType<typeof planRestaurantRanking91>;
    try {
      batches = planRestaurantRanking91(foods.map(restaurantRowForRequest91), wines.map(restaurantRowForRequest91), { selectedFoodId: selectedFood || undefined,
        selectedWineId: selectedWine || undefined, service,
        ...(budget ? { budget: { amount: Number(budget.replace(',', '.')), currency, service } } : {}),
      });
    } catch (failure) { setError(message(failure)); return; }
    if (batches.length > 1 && !(await confirm135(`La carta requiere ${batches.length} bloques de IA. Se analizarán todos, uno a uno. ¿Continuar?`, { ok: 'Continuar' }))) return;
    const controller = start('Contrastando combinaciones'); if (!controller) return;
    const revision = stateRef.current.revision;
    mutate(current => ({ ...current, pairs: [], pairWarnings: [] }));
    try {
      const parsed = await runRestaurantRanking91(batches, controller.signal,
        (body, signal) => invokeEdgeFunction('restaurant-workspace91', body, signal),
        (completed, total) => setProgress(`Bloque ${Math.min(completed + 1, total)} de ${total}`));
      check(controller);
      if (stateRef.current.revision !== revision) throw new Error('Las cartas han cambiado. Vuelve a combinar.');
      mutate(current => ({ ...current, pairs: parsed.pairs, pairWarnings: parsed.warnings }));
      // 136: at large text the results rendered below the fold and looked like nothing happened.
      if (parsed.pairs.length) requestAnimationFrame(() => { pairsList.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); pairsList.current?.focus({ preventScroll: true }); });
      if (!parsed.pairs.length) setError('No hay combinaciones justificadas con estas lecturas. Revisa platos, vinos y datos faltantes.');
    } catch (failure) {
      if (mounted.current) setError(controller.signal.aborted ? 'Análisis cancelado o tiempo agotado. Puedes intentarlo de nuevo.' : message(failure));
    } finally { finish(controller); }
  };
  const addManualWine = () => {
    const name = manualWine.trim(); if (!name) return;
    const id = `manual-${crypto.randomUUID()}`;
    mutate(current => ({ ...current, revision: current.revision + 1, pairs: [], pairWarnings: [], rows: [...current.rows,
      { id, kind: 'wine', name, sourceText: name, pageIds: [], reviewed: true, manual: true, availability: 'unknown' },
    ] }));
    setSelectedWine(id); setManualWine('');
  };
  const inspectWine = async (row: SourcedRestaurantRow91) => {
    const controller = start('Contrastando ficha Winerim'); if (!controller) return;
    setSheet(null); setProfile(null); setSheetRow(row.id);
    try {
      const found = await lookupWinerimOriginalSheet({ name: row.name, producer: row.producer, vintage: row.vintage }, controller.signal);
      check(controller);
      if (found.status !== 'verified') { setError('No hay una ficha original inequívoca para esta bodega, vino y añada. Afinidad pendiente.'); return; }
      const snapshot = await loadMatchrimScanProfile(user?.id ?? null, controller.signal); check(controller);
      const currentRow = activeRestaurantRows91(stateRef.current).find(item => item.id === row.id && item.kind === 'wine');
      if (native && (!currentRow || !isVerifiedWinerimSheetForIdentity(currentRow, found.sheet))) {
        setError('La lectura ha cambiado. Revisa el vino y vuelve a contrastar su ficha.'); return;
      }
      setSheet(found.sheet); setProfile(snapshot);
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { finish(controller); }
  };
  const previewPage = async (documentId: string, number: number) => {
    const doc = state.documents.find(item => item.id === documentId); if (!doc) return;
    if (doc.text !== undefined) { setPreview({ name: doc.name, text: doc.text }); return; }
    const controller = start('Abriendo página'); if (!controller) return;
    try {
      if (!doc.file) throw new Error('Falta el archivo original.');
      const file = await renderRestaurantPage(doc.file, number, controller.signal);
      const image = await prepareImageForAnalysis(file, 2400, controller.signal); check(controller);
      setPreview({ name: `${doc.name} · página ${number}`, image: image.dataUrl });
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { finish(controller); }
  };
  const invalidateSelection = () => mutate(current => ({ ...current, pairs: [], pairWarnings: [] }));
  const sourceLabel = (pageId: string) => {
    const page = state.pages.find(item => item.id === pageId);
    const doc = state.documents.find(item => item.id === page?.documentId);
    return page && doc ? `${doc.name} · página ${page.number}` : 'Origen no disponible';
  };
  const readingDetails = (row: SourcedRestaurantRow91) => <ul className="space-y-3">{restaurantRowOrigins91(row).map((origin, index) =>
    <li key={`${origin.pageId}:${origin.row.id}:${index}`} className="break-words text-xs text-slate-500">
      <p>{sourceLabel(origin.pageId)}</p><p className="mt-1 whitespace-pre-wrap">{origin.row.sourceText}</p>
      <p className="mt-1">{origin.row.price != null ? (native && origin.row.currency ? formatScanPrice(origin.row.price, origin.row.currency) : null) ?? `${origin.row.price} ${origin.row.currency || '(moneda sin confirmar)'}` : 'Precio sin confirmar'} · {origin.row.service === 'glass' ? 'Copa' : origin.row.service === 'bottle' ? 'Botella' : 'Formato sin confirmar'}</p>
      {origin.row.description && <p>{origin.row.description}</p>}
      {origin.row.notes?.map((note, noteIndex) => <p key={noteIndex}>{note}</p>)}
    </li>)}</ul>;
  // 138: a pairing said which wine suits the dish but not whether this person would like the wine. Each paired
  // wine with a Winerim sheet now also carries the personal verdict; nothing is sent beyond the public sheet lookup.
  const pairedWineKey = native ? [...new Set(state.pairs.map(pair => pair.wineId))].slice(0, 10).join('|') : '';
  useEffect(() => {
    if (!pairedWineKey) { setPersonal138({}); return; }
    const controller = new AbortController();
    const rows = pairedWineKey.split('|').flatMap(id => activeRestaurantRows91(stateRef.current).filter(row => row.id === id && row.kind === 'wine'));
    setPersonal138(Object.fromEntries(rows.map(row => [row.id, 'loading' as const])));
    void (async () => {
      const snapshot = await loadMatchrimScanProfile(user?.id ?? null, controller.signal).catch(() => null);
      for (const row of rows) {
        if (controller.signal.aborted) return;
        const found = await lookupWinerimOriginalSheet({ name: row.name, producer: row.producer, vintage: row.vintage }, controller.signal).catch(() => null);
        if (controller.signal.aborted) return;
        let result = nativeRestaurantAffinity95(row, found?.status === 'verified' ? found.sheet : null, snapshot?.profile ?? null), estimated = false;
        if (result.state === 'pending' && result.reason !== 'profile') {
          // Most everyday wines are only in Winerim's public store: use its data as a labelled estimate (see storeEstimate138).
          const estimate = await findStoreEstimate138(row, controller.signal).catch(() => null);
          if (controller.signal.aborted) return;
          if (estimate) { estimated = true; result = storeAffinity139(snapshot?.profile ?? null, estimate.attributes); }
        }
        setPersonal138(current => ({ ...current, [row.id]: { ...result, estimated } }));
      }
    })();
    return () => controller.abort();
  }, [pairedWineKey, user?.id]);
  const personalScore138 = (wineId: string) => { const value = personal138[wineId]; return value && value !== 'loading' && value.state === 'ready' ? value.score : -1; };
  const bandRank138 = (band: string) => band === 'strong' ? 0 : band === 'possible' ? 1 : 2;
  const orderedPairs138 = native ? state.pairs.map((pair, index) => ({ pair, index }))
    .sort((a, b) => bandRank138(a.pair.band) - bandRank138(b.pair.band) || personalScore138(b.pair.wineId) - personalScore138(a.pair.wineId) || a.index - b.index)
    .map(item => item.pair) : state.pairs;
  const attributes = !native && sheet?.sensoryAttributes ? { potencia: sheet.sensoryAttributes.power, acidez: sheet.sensoryAttributes.acidity,
    dulzura: sheet.sensoryAttributes.sweetness, taninos: sheet.sensoryAttributes.tannin, afrutado: sheet.sensoryAttributes.fruity } : null;
  const affinity = calculateLocalMatchrimAffinity(profile?.profile, attributes);
  if (!ready) return <p role="status" className="py-8">Recuperando cartas...</p>;
  return <>
    <div className="restaurant91-header flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="min-w-0 flex-1"><label htmlFor="restaurant-name" className="text-xs font-semibold text-slate-500">Restaurante (opcional)</label>
        <Input id="restaurant-name" placeholder="Nombre del restaurante" value={state.restaurant} maxLength={200} disabled={Boolean(busy)}
          onChange={event => mutate(current => ({ ...current, restaurant: event.target.value }))} className="mt-1 h-auto min-h-11" /></div>
      <Button variant="ghost" className={actionClass} disabled={Boolean(busy)} onClick={async () => {
        if (!(await confirm135('¿Borrar las cartas, fotos y maridajes de este restaurante y empezar de cero?', { ok: 'Borrar', destructive: true }))) return;
        mutate(() => createRestaurantSession91()); setSelectedFood(''); setSelectedWine(''); setSheet(null); setLinks([]);
        // 134: a new restaurant starts without the previous budget, filters or error.
        setBudget(''); setCurrency('EUR'); setService('any'); setManualWine(''); setUrl(''); setError(''); setSheetRow(''); setEditing(null);
      }}><Trash2 className="h-4 w-4 shrink-0" />Empezar de cero</Button>
    </div>
    {/* 156: «hay que explicar bien que esto es para el restaurante: saco la carta de platos, luego la de vinos…». Three numbered steps say it before anything is asked. */}
    {native ? <ol className={`my-3 space-y-3 p-4 ${card150}`} aria-label="Cómo funciona" data-testid="restaurant-steps156">
      {[['Fotografía la carta de platos', 'O pega el enlace si la carta está en una web.'], ['Fotografía la carta de vinos', 'Leemos los vinos y sus precios.'], ['Te decimos qué vino pedir', 'Con cada plato, y si ese vino encaja con tus gustos.']].map(([title, hint], index) =>
        <li key={title} className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-900 text-sm font-bold text-white" aria-hidden="true">{index + 1}</span>
          <span className="min-w-0"><span className="block text-sm font-semibold text-stone-950">{title}</span><span className="block text-xs leading-5 text-stone-600">{hint}</span></span></li>)}
    </ol> : <p className="my-3 text-sm leading-6 text-slate-700">Haz una foto a la carta de platos y otra a la de vinos. Te decimos qué vino pedir con cada plato.</p>}
    <p className="my-2 text-xs leading-normal text-slate-500">Las fotos se quedan en este dispositivo; para leerlas se envían a Matchrim y a su proveedor de IA.</p>
    <p role="status" className="sr-only">{savingDraft ? 'Guardando borrador...' : 'Borrador guardado en este dispositivo.'}</p>
    {storageError && <p role="status" className="my-3 text-sm text-amber-800">{storageError}</p>}
    <Tabs value={tab} onValueChange={value => { setTab(value as Tab); setLinks([]); setUrl(''); setError(''); }}>
    <TabsList aria-label="Cartas y combinaciones" className={native ? 'grid h-auto grid-cols-3 gap-1 rounded-full bg-stone-200/70 p-1' : 'grid h-auto grid-cols-3 rounded-none border-b border-slate-200 bg-transparent p-0'}>
      {(Object.keys(labels) as Tab[]).map(id => <TabsTrigger key={id} value={id} disabled={Boolean(busy)}
        className={native ? 'min-h-[44px] min-w-0 flex-col whitespace-normal rounded-full px-[4px] py-[8px] text-sm font-semibold text-stone-600 transition-none data-[state=active]:bg-white data-[state=active]:text-stone-950 data-[state=active]:shadow-sm'
          : 'min-h-[48px] min-w-0 flex-col whitespace-normal rounded-none border-b-2 border-transparent px-[4px] py-[12px] text-sm font-semibold text-slate-500 transition-none data-[state=active]:border-red-900 data-[state=active]:bg-transparent data-[state=active]:text-red-900 data-[state=active]:shadow-none'}><span className="block min-w-0 max-w-full [overflow-wrap:anywhere]">{tabTitles137[id]}</span>{id !== 'pairs' && <span className="block min-w-0 max-w-full text-xs font-normal [overflow-wrap:anywhere]">{id === 'food' ? `${foods.length} ${foods.length === 1 ? 'plato' : 'platos'}` : `${wines.length} ${wines.length === 1 ? 'vino' : 'vinos'}`}</span>}</TabsTrigger>)}
    </TabsList>
    {error && <p role="alert" className="my-4 whitespace-pre-line break-words border-l-2 border-red-700 pl-3 text-sm text-red-800">{error}</p>}
    {busy && <div role="status" aria-live="polite" className="my-4 flex flex-wrap items-center gap-3 border-y border-slate-200 py-3">
      <Loader2 className="h-5 w-5 shrink-0 animate-spin" /><div className="min-w-0 flex-1"><p className="font-semibold">{busy}</p><p className="break-words text-sm text-slate-600">{progress}</p></div>
      <Button variant="outline" className={actionClass} onClick={() => request.current?.abort()}><X className="h-4 w-4" />Cancelar</Button>
    </div>}
    <TabsContent value={tab} className="mt-0 min-w-0 py-5">
      {tab !== 'pairs' ? <>
        <div className="restaurant91-upload-actions grid grid-cols-2 gap-2">
          <Button className={`${actionClass} bg-red-900 text-white hover:bg-red-950`} disabled={Boolean(busy)} onClick={() => void openCamera133(cameraInput.current)}><Camera className="h-4 w-4 shrink-0" />Hacer foto</Button>
          <Button variant="outline" className={actionClass} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}><FilePlus2 className="h-4 w-4 shrink-0" />Foto o PDF guardado</Button>
        </div>
        <input ref={fileInput} type="file" multiple accept="image/*,.heic,.heif,application/pdf" onChange={onFiles} className="hidden" aria-label={`Archivos de ${labels[tab].toLowerCase()}`} disabled={Boolean(busy)} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={onFiles} className="hidden" aria-label={`Foto de ${labels[tab].toLowerCase()}`} disabled={Boolean(busy)} />
        <form className="restaurant91-inline-form mt-4 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void importUrl(); }}>
          <label className="min-w-0 flex-1 text-sm font-medium">¿La carta está en una web? Pega el enlace<Input type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://..." maxLength={2048} disabled={Boolean(busy)} className="mt-1 h-auto min-h-11" /></label>
          <Button type="submit" variant="outline" className={actionClass} disabled={Boolean(busy) || !url.trim()}><Link2 className="h-4 w-4 shrink-0" />Añadir</Button>
        </form>
        {links.length > 0 && <ul className="mt-3 divide-y divide-slate-200">{links.map(link => <li key={link.url}><button type="button" className="min-h-11 w-full break-words py-2 text-left text-sm text-red-900 underline" disabled={Boolean(busy)} onClick={() => void importUrl(link.url)}>{link.label || link.url}</button></li>)}</ul>}
        {state.documents.some(doc => doc.kind === tab) && <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">{tab === 'food' ? 'Carta de platos' : 'Carta de vinos'}</h2>
          {state.pages.some(page => page.enabled && page.status !== 'read' && state.documents.find(doc => doc.id === page.documentId)?.kind === tab) && <Button disabled={Boolean(busy)} className={`${actionClass} bg-slate-950`} onClick={() => void analyze(tab)}><ScanLine className="h-4 w-4 shrink-0" />Leer la carta</Button>}</div>}
        {!user && <Link to="/auth?redirect=/restaurante" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-red-900 underline">Entra con tu cuenta para leer la carta</Link>}
        {!state.documents.some(doc => doc.kind === tab) && <p className="py-8 text-sm text-slate-500">{tab === 'food' ? 'Aún no has añadido la carta de platos.' : 'Aún no has añadido la carta de vinos.'}</p>}
        <ul className={native ? 'mt-3 space-y-2 empty:hidden' : 'mt-3 divide-y divide-slate-200 border-y border-slate-200'}>{state.documents.filter(doc => doc.kind === tab).map(doc => <li key={doc.id} className={native ? `${card150} px-4 py-3` : 'py-3'}>
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{doc.name}</h3><p className="text-xs text-slate-500">{doc.pageCount} {doc.pageCount === 1 ? 'página' : 'páginas'}</p></div>
            <Button size="icon" variant="ghost" className={iconClass} title="Eliminar archivo" aria-label={`Eliminar ${doc.name}`} disabled={Boolean(busy)} onClick={() => mutate(current => removeRestaurantDocument91(current, doc.id))}><Trash2 className="h-4 w-4" /></Button></div>
          <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><ChevronDown className="h-4 w-4" />Ver páginas</summary>
            <ul className="space-y-2">{state.pages.filter(page => page.documentId === doc.id).map(page => <li key={page.id} className="flex flex-wrap items-start gap-2 text-sm">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3"><input type="checkbox" checked={page.enabled} disabled={Boolean(busy)} onChange={event => mutate(current => ({ ...current, revision: current.revision + 1, pairs: [], pairWarnings: [], pages: current.pages.map(item => item.id === page.id ? { ...item, enabled: event.target.checked } : item) }))} className="h-5 w-5 shrink-0" />
                <span>Página {page.number} · {page.status === 'read' ? page.partial ? 'Leída en parte' : 'Leída' : page.status === 'reading' ? 'Leyendo' : page.status === 'error' ? 'Error' : 'Pendiente'}</span></label>
              {page.status === 'read' && <Button size="icon" variant="ghost" className={iconClass} disabled={Boolean(busy)} aria-label={`Volver a analizar página ${page.number} de ${doc.name}`} title="Volver a analizar" onClick={() => mutate(current => ({ ...current, revision: current.revision + 1, pairs: [], pages: current.pages.map(item => item.id === page.id ? { ...item, status: 'queued' } : item) }))}><RefreshCw className="h-4 w-4" /></Button>}
              <Button variant="ghost" className={actionClass} disabled={Boolean(busy)} onClick={() => void previewPage(doc.id, page.number)}>Ver página {page.number}</Button>
              {page.error && <p className="w-full text-red-800">{page.error}</p>}{page.warnings.map((warning, index) => <p key={index} className="w-full text-xs text-amber-800">{warning}</p>)}
            </li>)}</ul>
          </details>
        </li>)}</ul>
        <div className={(tab === 'food' ? foods : wines).length || state.documents.some(doc => doc.kind === tab) ? 'mt-5 border-b border-slate-200 pb-3' : 'hidden'}><h2 className="text-base font-semibold">{tab === 'food' ? 'Platos leídos' : 'Vinos leídos'}</h2>
          {(tab === 'food' ? foods : wines).length > 0 && <p className="mt-1 text-sm text-slate-500">Si algún nombre está mal leído, corrígelo con el lápiz.</p>}
          {(restaurantCoverage91(state, tab).read < restaurantCoverage91(state, tab).total || restaurantCoverage91(state, tab).omitted > 0) && <p className="mt-1 text-sm text-slate-500">{restaurantCoverage91(state, tab).read} de {restaurantCoverage91(state, tab).total} páginas leídas{restaurantCoverage91(state, tab).omitted > 0 ? ` · ${restaurantCoverage91(state, tab).omitted} sin incluir` : ''}</p>}</div>
        {(tab === 'food' ? foods : wines).length > 0 && <Button className={`${actionClass} mt-4 w-full bg-red-900 text-white hover:bg-red-950`} disabled={Boolean(busy)} data-testid="restaurant-next137"
          onClick={() => { const toPairs = tab === 'wine'; setTab(toPairs ? 'pairs' : 'wine'); setLinks([]); setUrl(''); setError(''); window.scrollTo({ top: 0 });
            if (toPairs && foods.length && wines.length && !state.pairs.length) void compare(); }}>
          {tab === 'food' ? (wines.length ? 'Siguiente: revisar los vinos' : 'Siguiente: añadir la carta de vinos') : foods.length ? 'Siguiente: ver los maridajes' : 'Ver maridajes'}<ArrowRight className="h-4 w-4 shrink-0" /></Button>}
        <ul className={native ? 'mt-3 space-y-2' : 'divide-y divide-slate-200'}>{(tab === 'food' ? foods : wines).map(row => <li key={row.id} className={native ? `${card150} p-4` : 'py-4'}>
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold">{row.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{[row.price != null ? (native && row.currency ? formatScanPrice(row.price, row.currency) : null) ?? `${row.price} ${row.currency || ''}`.trim() : null, row.service === 'glass' ? 'Copa' : row.service === 'bottle' ? 'Botella' : null].filter(Boolean).join(' · ') || 'Precio no leído'}</p>
            {(row.manual || row.reviewed) && <p className="mt-1 text-xs text-slate-500">{row.manual ? 'Vino añadido por ti · puede no estar en la carta' : 'Corregido por ti'}</p>}</div>
            <Button size="icon" variant="ghost" className={iconClass} aria-label={`Corregir ${row.name}`} title="Corregir lectura" disabled={Boolean(busy)} onClick={() => setEditing({ ...row })}><Pencil className="h-4 w-4" /></Button></div>
          {row.pageIds.length > 0 ? <details className="mt-1"><summary className="min-h-[44px] cursor-pointer py-[8px] text-xs text-slate-500">Ver el texto original de la carta</summary>{readingDetails(row)}</details>
            : <p className="mt-2 break-words text-xs text-slate-500">{row.sourceText}</p>}
          {row.availability && row.availability !== 'unknown' && <p className="mt-1 text-sm text-amber-800">{row.availability === 'unavailable' ? 'No disponible según la lectura' : row.availability === 'coming_soon' ? 'Próximamente · no entra en los maridajes' : 'Pregunta si está disponible'}</p>}
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className={actionClass} disabled={Boolean(busy)} onClick={() => { if (row.kind === 'food') { setSelectedFood(row.id); setSelectedWine(''); } else { setSelectedWine(row.id); setSelectedFood(''); } setTab('pairs'); }}>
            {row.kind === 'food' ? <Wine className="h-4 w-4 shrink-0" /> : <ChefHat className="h-4 w-4 shrink-0" />}{row.kind === 'food' ? 'Vinos para este plato' : 'Platos para este vino'}</Button>
            {row.kind === 'wine' && <Button variant="ghost" className={actionClass} disabled={Boolean(busy)} onClick={() => void inspectWine(row)}><ExternalLink className="h-4 w-4 shrink-0" />¿Me gustará?</Button>}</div>
          {sheetRow === row.id && sheet && (native ? <>
            <NativeAffinitySummary result={nativeRestaurantAffinity95(row, sheet, profile?.profile ?? null)} />
            {isVerifiedWinerimSheetForIdentity(row, sheet) && <details className="mt-3 min-w-0 text-sm" data-testid="restaurant-original-details">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-red-900"><ChevronDown className="h-4 w-4 shrink-0" />Ver la ficha del vino</summary>
              <WinerimOriginalSheet sheet={sheet} />
            </details>}
          </> : <><WinerimOriginalSheet sheet={sheet} />{affinity != null ? <><p className="mt-3 font-semibold">Afinidad contigo: {affinity}%</p><AffinityExplanation wineKey={`restaurant91:${row.id}:${sheet.id}`} attributes={attributes} profile={profile?.profile} score={affinity} sensorySource="catalog" catalogIdentityLinked /></> : <p className="mt-2 text-sm text-slate-500">Afinidad pendiente: faltan perfil o atributos sensoriales verificados.</p>}</>)}
        </li>)}</ul>
      </> : <>
        <Button className={`${actionClass} w-full bg-red-900 text-white hover:bg-red-950`} disabled={Boolean(busy) || !foods.length || !wines.length} onClick={() => void compare()}><ChefHat className="h-4 w-4 shrink-0" />{selectedFood && !selectedWine ? 'Elegir vinos para este plato' : selectedWine && !selectedFood ? 'Elegir platos para este vino' : 'Ver qué vino va con cada plato'}</Button>
        <details className={native ? `mt-3 px-4 ${card150}` : 'mt-3 border-y border-slate-200'} open={Boolean(selectedFood || selectedWine || budget || service !== 'any')} data-testid="restaurant-filters137">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-700">Afinar: un plato concreto, precio máximo, copa o botella</summary>
          <div className="pb-4">
        <div className="grid gap-4 sm:grid-cols-2"><label className="min-w-0 text-sm font-semibold">Plato<select aria-label="Plato" value={selectedFood} disabled={Boolean(busy)} onChange={event => { setSelectedFood(event.target.value); invalidateSelection(); }} className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white p-2 text-base"><option value="">Todos los platos</option>{foods.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="min-w-0 text-sm font-semibold">Vino<select aria-label="Vino" value={selectedWine} disabled={Boolean(busy)} onChange={event => { setSelectedWine(event.target.value); invalidateSelection(); }} className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white p-2 text-base"><option value="">Todos los vinos</option>{wines.map(row => <option key={row.id} value={row.id}>{row.name}{row.manual ? ' (aportado por ti)' : ''}</option>)}</select></label></div>
        <form className="restaurant91-inline-form mt-4 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); addManualWine(); }}><label className="min-w-0 flex-1 text-sm">Quiero tomar otro vino<Input value={manualWine} onChange={event => setManualWine(event.target.value)} placeholder="Ej. Roda I · bodega y añada si las sabes" maxLength={200} disabled={Boolean(busy)} className="mt-1 h-auto min-h-11" /></label><Button type="submit" variant="outline" disabled={Boolean(busy) || !manualWine.trim()} className={actionClass}><Wine className="h-4 w-4 shrink-0" />Añadir vino</Button></form>
        <div className="restaurant91-budget mt-4 grid grid-cols-2 gap-3"><label className="text-sm">Precio máximo del vino<Input value={budget} onChange={event => { setBudget(event.target.value); invalidateSelection(); }} inputMode="decimal" maxLength={12} placeholder="Sin límite" disabled={Boolean(busy)} className="mt-1 h-auto min-h-11" /></label>
          <label className="text-sm">Moneda<select aria-label="Moneda" value={currency} onChange={event => { setCurrency(event.target.value); invalidateSelection(); }} disabled={Boolean(busy)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white p-2">{['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'JPY'].map(code => <option key={code}>{code}</option>)}</select></label>
          <label className="text-sm">Copa o botella<select aria-label="Servicio" value={service} onChange={event => { setService(event.target.value as typeof service); invalidateSelection(); }} disabled={Boolean(busy)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white p-2"><option value="any">Sin preferencia</option><option value="glass">Copa</option><option value="bottle">Botella</option></select></label></div>
          </div>
        </details>
        {(!foods.length || !wines.length) && <p className="mt-3 text-sm text-slate-500">{foods.length ? 'Falta la carta de vinos: añádela en el paso 2.' : wines.length ? 'Falta la carta de platos: añádela en el paso 1.' : 'Primero añade la carta de platos (paso 1) y la de vinos (paso 2).'}</p>}
        {(restaurantCoverage91(state, 'food').partial || restaurantCoverage91(state, 'wine').partial) && <p className="mt-4 border-l-2 border-amber-500 pl-3 text-sm text-amber-900">Las cartas tienen páginas pendientes o lecturas parciales. Las combinaciones solo cubren lo leído, no toda la oferta.</p>}
        <p className="mt-4 text-sm text-slate-500">{native ? 'Maridajes orientativos hechos con IA. Bajo cada vino te decimos además si encaja con tus gustos, cuando tenemos su ficha. Confirma alergias, precio y disponibilidad con el restaurante.' : 'Maridajes orientativos hechos con IA: dicen qué va bien con el plato, no si el vino te gustará a ti (para eso, toca «¿Me gustará este vino?»). Confirma alergias, precio y disponibilidad con el restaurante.'}</p>
        {state.pairWarnings.map((warning, index) => <p key={index} className="mt-2 text-sm text-amber-800">{warning}</p>)}
        <ol ref={pairsList} tabIndex={-1} aria-label="Combinaciones" className={native ? 'mt-5 space-y-3 focus:outline-none' : 'mt-5 divide-y divide-slate-200 border-t border-slate-200 focus:outline-none'}>{orderedPairs138.map((pair, index) => {
          const food = foods.find(row => row.id === pair.foodId), wine = wines.find(row => row.id === pair.wineId);
          if (!food || !wine) return null;
          return <li key={`${pair.foodId}-${pair.wineId}`} className={native ? `${card150} p-4` : 'py-5'}><p className={native ? `inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${pair.band === 'strong' ? 'bg-emerald-700 text-white' : pair.band === 'possible' ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-700'}` : 'text-xs font-semibold text-red-900'}>{index + 1} · {pair.band === 'strong' ? 'Muy buena pareja' : pair.band === 'possible' ? 'Puede funcionar' : 'Faltan datos para valorarlo'}</p><h2 className="mt-2 break-words text-lg font-semibold">{food.name}</h2><p className="mt-1 break-words font-medium text-slate-700">{wine.name}{wine.vintage ? ` · ${wine.vintage}` : ''}</p>
            {native && (() => { const mine = personal138[wine.id];
              return <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${mine && mine !== 'loading' && mine.state === 'ready' && mine.score >= 65 ? 'bg-emerald-50 font-semibold text-emerald-900' : 'bg-stone-100 text-stone-700'}`} data-testid="restaurant-personal138">
                {!mine ? 'Para ti: toca «¿Me gustará este vino?» para saberlo.' : mine === 'loading' ? 'Para ti: mirando si encaja con tus gustos…'
                  : mine.state === 'ready' ? `Para ti: ${mine.title.toLowerCase()} · ≈${mine.score}/100${mine.estimated ? ' (estimación)' : ''}`
                    : mine.reason === 'profile' ? 'Para ti: haz el test de gustos y te diremos si te gustará.'
                      : 'Para ti: no tenemos la ficha de este vino, así que no podemos saberlo.'}</p>; })()}
            {wine.manual && <p className="mt-2 text-xs text-slate-500">Vino añadido por ti; puede no estar en la carta.</p>}
            <h3 className="mt-4 text-sm font-semibold">Por qué van bien juntos</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{pair.positives.map((text, i) => <li key={i}>{text}</li>)}</ul>
            {pair.frictions.length > 0 && <><h3 className="mt-3 text-sm font-semibold">A tener en cuenta</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{pair.frictions.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
            {pair.missing.length > 0 && <p className="mt-3 text-sm text-amber-800">Falta confirmar: {pair.missing.join(' · ')}</p>}
            <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-xs text-slate-500">Ver el texto original de la carta</summary><p className="mb-2 text-sm font-semibold">Comida</p>{readingDetails(food)}<p className="mb-2 mt-3 text-sm font-semibold">Vino</p>{wine.manual ? <p className="break-words text-sm text-slate-600">{wine.sourceText}</p> : readingDetails(wine)}</details>
            <Button variant="outline" className={`${actionClass} mt-3`} disabled={Boolean(busy)} onClick={() => { setTab('wine'); void inspectWine(wine); }}><ExternalLink className="h-4 w-4 shrink-0" />¿Me gustará este vino?</Button>
          </li>;
        })}</ol>
      </>}
    </TabsContent>
    </Tabs>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto [overflow-wrap:anywhere]"><DialogHeader><DialogTitle>Corregir lectura</DialogTitle><DialogDescription className="sr-only">Cambios en el borrador de este dispositivo. Las lecturas originales se conservan.</DialogDescription></DialogHeader>{editing && <form onSubmit={event => { event.preventDefault(); if (!editing.name.trim()) return; mutate(current => editRestaurantRow91(current, editing.id, { name: editing.name.trim(), producer: editing.producer || undefined, vintage: editing.vintage || undefined, description: editing.description || undefined })); if (sheetRow === editing.id) setSheet(null); setEditing(null); }} className="space-y-4">
      <label className="block text-sm">Nombre<Input value={editing.name} maxLength={200} required onChange={event => setEditing({ ...editing, name: event.target.value })} className="mt-1 h-auto min-h-11" /></label>
      {editing.kind === 'wine' && <><label className="block text-sm">Bodega<Input value={editing.producer ?? ''} maxLength={160} onChange={event => setEditing({ ...editing, producer: event.target.value })} className="mt-1 h-auto min-h-11" /></label><label className="block text-sm">Añada<Input value={editing.vintage ?? ''} maxLength={4} inputMode="numeric" pattern="(19|20)[0-9]{2}|" onChange={event => setEditing({ ...editing, vintage: event.target.value || undefined })} className="mt-1 h-auto min-h-11" /></label></>}
      <label className="block text-sm">Descripción aportada por ti<Input value={editing.description ?? ''} maxLength={1000} onChange={event => setEditing({ ...editing, description: event.target.value })} className="mt-1 h-auto min-h-11" /></label>
      <p className="text-sm text-slate-500">Lectura original conservada: {editing.sourceText}</p>
      {editing.pageIds.length > 0 && <details><summary className="min-h-11 cursor-pointer py-2 text-sm">Todas las lecturas originales</summary>{readingDetails(editing)}</details>}
      <DialogFooter className="gap-2"><Button type="button" variant="outline" className={actionClass} onClick={() => { mutate(current => discardRestaurantRow91(current, editing.id)); setEditing(null); }}><Trash2 className="h-4 w-4" />Descartar</Button><Button type="submit" className={actionClass}><Check className="h-4 w-4" />Guardar corrección</Button></DialogFooter>
    </form>}</DialogContent></Dialog>
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className={native ? 'max-h-[90dvh] overflow-y-auto [overflow-wrap:anywhere] p-[12px] [&>button:last-child]:right-[12px] [&>button:last-child]:top-[12px] [&>button:last-child]:grid [&>button:last-child]:h-[44px] [&>button:last-child]:w-[44px] [&>button:last-child]:place-items-center [&>button:last-child>svg]:h-[20px] [&>button:last-child>svg]:w-[20px]' : 'max-h-[90dvh] overflow-y-auto [overflow-wrap:anywhere]'}><DialogHeader className={native ? 'min-h-[44px] min-w-0 pr-[56px] text-left' : undefined}><DialogTitle>{preview?.name}</DialogTitle><DialogDescription className="sr-only">Página original del borrador, sin correcciones sobre el archivo.</DialogDescription></DialogHeader>{preview?.image && <img src={preview.image} alt="Página original seleccionada" className="h-auto w-full object-contain" />}{preview?.text && <pre className="whitespace-pre-wrap break-words text-sm">{preview.text}</pre>}</DialogContent></Dialog>
  </>;
};

const Restaurant = () => {
  const { user, loading } = useAuth();
  const native = Capacitor.isNativePlatform();
  return <div className={`matchrim-restaurant91 matchrim-app-shell min-h-screen ${native ? 'bg-stone-50' : 'bg-white'} [overflow-wrap:anywhere] [&_svg]:!h-[20px] [&_svg]:!w-[20px]`}>
    <main className={`mx-auto w-full max-w-3xl pl-[calc(16px+var(--matchrim-safe-left))] pr-[calc(16px+var(--matchrim-safe-right))] pb-[calc(var(--matchrim-bottom-nav-height,6rem)+2rem)] ${native ? 'pt-[calc(var(--matchrim-safe-top)+1rem)]' : 'pt-6'}`}>
      <Link to="/escanear" aria-label="Volver al escáner" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" />Escanear</Link>
      <header className="mb-5 mt-2"><h1 className={native ? title150 : 'text-2xl font-bold text-slate-950'}>En el restaurante</h1>
        {native && <p className="mt-1 text-sm leading-5 text-stone-600">Añade la carta de platos y la de vinos y te decimos qué pedir.</p>}</header>
      <ScanPrivacyGate>{loading ? <p role="status">Cargando sesión...</p> : <RestaurantSession key={user?.id ?? 'anonymous'} owner={user?.id ?? 'anonymous'} />}</ScanPrivacyGate>
    </main><MobileBottomNav />
  </div>;
};
export default Restaurant;
