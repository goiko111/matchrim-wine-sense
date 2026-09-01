import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeEuro, BriefcaseBusiness, Scale, ShieldCheck, UserRound } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  buildWineComparisonDecision,
  type ComparableWine,
  type WineDecisionMode,
  type WineDecisionPriority,
  type WineServiceFormat,
} from '@/utils/wineComparison';

interface WineComparisonWorkspaceProps {
  wines: ComparableWine[];
}

const attributeLabels: Array<[keyof NonNullable<ComparableWine['attributes']>, string]> = [
  ['body', 'Cuerpo'],
  ['acidity', 'Acidez'],
  ['tannin', 'Tanino'],
  ['sweetness', 'Dulzor'],
  ['fruit', 'Fruta'],
  ['wood', 'Madera'],
  ['intensity', 'Intensidad'],
];

const priorityLabels: Record<WineDecisionPriority, string> = {
  affinity: 'Mayor afinidad',
  certainty: 'Identidad más segura',
  value: 'Mejor valor',
};

const formatPrice = (price: number | null | undefined) => (
  typeof price === 'number' && Number.isFinite(price) ? `${price.toFixed(2)} €` : 'Sin precio'
);

const formatService = (service: ComparableWine['service']) => {
  if (service === 'glass') return 'Copa';
  if (service === 'bottle') return 'Botella';
  if (service === 'both') return 'Copa y botella';
  return 'Sin confirmar';
};

const AttributeValue = ({ value }: { value: number | null | undefined }) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return <span className="text-slate-400">-</span>;
  const normalized = Math.max(1, Math.min(5, Math.round(value)));
  return <span aria-label={`${normalized} de 5`}>{normalized}/5</span>;
};

export const WineComparisonWorkspace = ({ wines }: WineComparisonWorkspaceProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => wines.slice(0, 3).map((wine) => wine.id));
  const selectionEditedRef = useRef(false);
  const [mode, setMode] = useState<WineDecisionMode>('personal');
  const [priority, setPriority] = useState<WineDecisionPriority>('affinity');
  const [budget, setBudget] = useState('');
  const [serviceFormat, setServiceFormat] = useState<WineServiceFormat>('any');
  const hasPrices = wines.some((wine) => typeof wine.price === 'number');
  const hasServiceFormats = wines.some((wine) => wine.service);
  const hasAffinities = wines.some((wine) => typeof wine.affinity === 'number' && Number.isFinite(wine.affinity));

  useEffect(() => {
    setSelectedIds((current) => {
      const available = current.filter((id) => wines.some((wine) => wine.id === id)).slice(0, 5);
      if (!selectionEditedRef.current) return wines.slice(0, 3).map((wine) => wine.id);
      return available.length >= 2 ? available : wines.slice(0, 3).map((wine) => wine.id);
    });
  }, [wines]);

  useEffect(() => {
    if (wines.length > 0 && !hasAffinities && priority === 'affinity') setPriority('certainty');
  }, [hasAffinities, priority, wines.length]);

  const selectedWines = useMemo(
    () => selectedIds.flatMap((id) => {
      const wine = wines.find((candidate) => candidate.id === id);
      return wine ? [wine] : [];
    }),
    [selectedIds, wines],
  );
  const numericBudget = budget.trim() && Number.isFinite(Number(budget)) ? Number(budget) : null;
  const decision = useMemo(() => buildWineComparisonDecision(selectedWines, {
    mode,
    priority,
    budget: numericBudget,
    serviceFormat: mode === 'service' ? serviceFormat : 'any',
  }), [mode, numericBudget, priority, selectedWines, serviceFormat]);
  const decisionLabel = decision.actionability === 'provisional'
    ? 'Opcion provisional: confirma los datos'
    : priority === 'certainty'
      ? (mode === 'service' ? 'Identidad más segura para servir' : 'Identidad más segura')
      : (mode === 'service' ? 'Elección para servir' : 'Elección para ti');

  const toggleWine = (wineId: string) => {
    selectionEditedRef.current = true;
    setSelectedIds((current) => current.includes(wineId)
      ? current.filter((id) => id !== wineId)
      : current.length < 5
        ? [...current, wineId]
        : current);
  };

  if (wines.length < 2) return null;

  return (
    <section className="min-w-0 border-y border-stone-200 py-5" aria-labelledby="wine-comparison-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="wine-comparison-title" className="text-lg font-semibold text-slate-950">Comparar 2–5 vinos</h3>
          <p className="mt-1 text-sm text-slate-600">Elige referencias y decide con datos visibles, no con otra cifra opaca.</p>
        </div>
        <span className="text-xs font-medium text-slate-500">{selectedIds.length}/5 seleccionados</span>
      </div>

      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {wines.map((wine) => {
          const selected = selectedIds.includes(wine.id);
          const disabled = !selected && selectedIds.length >= 5;
          return (
            <label
              key={wine.id}
              className={`flex min-h-14 min-w-0 max-w-full items-center gap-3 overflow-hidden border px-3 py-2 ${selected ? 'border-red-800 bg-red-50' : 'border-stone-200 bg-white'} ${disabled ? 'opacity-50' : ''}`}
            >
              <Checkbox checked={selected} disabled={disabled} onCheckedChange={() => toggleWine(wine.id)} aria-label={`Comparar ${wine.name}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-950">{wine.name}</span>
                <span className="block truncate text-xs text-slate-500">{wine.producer || wine.region || 'Identidad parcial'}</span>
              </span>
              {wine.affinity != null && <span className="shrink-0 text-sm font-bold text-red-900">{Math.round(wine.affinity)}%</span>}
            </label>
          );
        })}
      </div>

      {selectedWines.length < 2 ? (
        <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950">Selecciona al menos dos vinos para comparar.</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-[auto_minmax(12rem,1fr)_minmax(10rem,0.7fr)]">
            <div>
              <Label className="mb-2 block">Decisión</Label>
              <div className="inline-flex rounded-md border border-stone-200 bg-stone-100 p-1" role="group" aria-label="Modo de comparación">
                <button
                  type="button"
                  className={`flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium ${mode === 'personal' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}
                  onClick={() => setMode('personal')}
                  aria-pressed={mode === 'personal'}
                >
                  <UserRound className="h-4 w-4" /> Para mí
                </button>
                <button
                  type="button"
                  className={`flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium ${mode === 'service' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}
                  onClick={() => setMode('service')}
                  aria-pressed={mode === 'service'}
                >
                  <BriefcaseBusiness className="h-4 w-4" /> Servicio
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="comparison-priority">Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as WineDecisionPriority)}>
                <SelectTrigger id="comparison-priority" className="mt-2 min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="affinity" disabled={!hasAffinities}>Mayor afinidad</SelectItem>
                  <SelectItem value="certainty">Identidad más segura</SelectItem>
                  <SelectItem value="value" disabled={!hasPrices}>Mejor valor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasPrices && (
              <div>
                <Label htmlFor="comparison-budget">Presupuesto máximo</Label>
                <div className="relative mt-2">
                  <BadgeEuro className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input id="comparison-budget" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} className="min-h-11 pl-9" placeholder="Sin límite" />
                </div>
              </div>
            )}

            {mode === 'service' && hasServiceFormats && (
              <div>
                <Label htmlFor="comparison-service">Formato</Label>
                <Select value={serviceFormat} onValueChange={(value) => setServiceFormat(value as WineServiceFormat)}>
                  <SelectTrigger id="comparison-service" className="mt-2 min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier formato</SelectItem>
                    <SelectItem value="glass">Por copa</SelectItem>
                    <SelectItem value="bottle">Por botella</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {decision.primary && (
            <div className={`mt-5 border-l-4 px-4 py-3 ${decision.actionability === 'ready' ? 'border-red-900 bg-stone-50' : 'border-amber-500 bg-amber-50'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${decision.actionability === 'ready' ? 'text-red-950' : 'text-amber-950'}`}>
                    {priority === 'certainty' ? <ShieldCheck className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                    {decisionLabel}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{decision.primary.wine.name}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{priorityLabels[priority]}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {decision.primary.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                {decision.primary.cautions.map((caution) => <li key={caution} className="text-amber-800">• {caution}</li>)}
              </ul>
              {decision.actionability === 'provisional' && (
                <p className="mt-2 text-sm font-medium text-amber-950">No uses este orden como recomendacion final hasta confirmar identidad, precio o formato pendiente.</p>
              )}
            </div>
          )}

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-slate-500">
                  <th className="px-2 py-2 font-medium">Dato</th>
                  {decision.ordered.map(({ wine }) => <th key={wine.id} className="px-2 py-2 font-semibold text-slate-900">{wine.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr><th className="px-2 py-2 text-left font-medium">Afinidad</th>{decision.ordered.map(({ wine }) => <td key={wine.id} className="px-2 py-2">{wine.affinity == null ? '-' : `${Math.round(wine.affinity)}%`}</td>)}</tr>
                <tr><th className="px-2 py-2 text-left font-medium">Confianza de identidad</th>{decision.ordered.map(({ wine }) => <td key={wine.id} className="px-2 py-2">{wine.confidence == null ? '-' : `${Math.round((wine.confidence > 1 ? wine.confidence / 100 : wine.confidence) * 100)}%`}</td>)}</tr>
                {hasPrices && <tr><th className="px-2 py-2 text-left font-medium">Precio</th>{decision.ordered.map(({ wine }) => <td key={wine.id} className="px-2 py-2">{formatPrice(wine.price)}</td>)}</tr>}
                {hasServiceFormats && <tr><th className="px-2 py-2 text-left font-medium">Servicio</th>{decision.ordered.map(({ wine }) => <td key={wine.id} className="px-2 py-2">{formatService(wine.service)}</td>)}</tr>}
                {attributeLabels.map(([key, label]) => decision.ordered.some(({ wine }) => wine.attributes?.[key] != null) && (
                  <tr key={key}><th className="px-2 py-2 text-left font-medium">{label}</th>{decision.ordered.map(({ wine }) => <td key={wine.id} className="px-2 py-2"><AttributeValue value={wine.attributes?.[key]} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200 md:hidden">
            {decision.ordered.map(({ wine, cautions }, index) => (
              <div key={wine.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><span className="mr-2 text-xs font-bold text-red-900">{index + 1}</span><span className="font-semibold text-slate-950">{wine.name}</span></div>
                  {wine.affinity != null && <span className="shrink-0 font-bold text-red-900">{Math.round(wine.affinity)}%</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{[hasPrices ? formatPrice(wine.price) : null, hasServiceFormats ? formatService(wine.service) : null].filter(Boolean).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  {attributeLabels.flatMap(([key, label]) => wine.attributes?.[key] == null ? [] : [<span key={key}>{label} <AttributeValue value={wine.attributes[key]} /></span>])}
                </div>
                {cautions.length > 0 && <p className="mt-2 text-xs text-amber-800">{cautions.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
