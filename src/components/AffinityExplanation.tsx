import { useMemo, useState } from 'react';
import { Check, CircleHelp, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildDetailedAffinityExplanation,
  readStoredMatchrimProfile,
  type AffinityDataSource,
  type WineAttributeInput,
} from '@/utils/wineAffinityExplanation';

interface AffinityExplanationProps {
  wineKey: string;
  score?: number | null;
  identificationConfidence?: number | null;
  attributes?: WineAttributeInput | null;
  sensorySource?: AffinityDataSource;
  compact?: boolean;
}

const SOURCE_LABELS: Record<AffinityDataSource, string> = {
  label: 'dato visible',
  catalog: 'ficha de catalogo',
  inference: 'inferencia sensorial',
  preference: 'preferencia aprendida',
};

type FeedbackValue = 'hit' | 'miss';

export const AffinityExplanation = ({
  wineKey,
  score,
  identificationConfidence,
  attributes,
  sensorySource = 'inference',
  compact = false,
}: AffinityExplanationProps) => {
  const [feedback, setFeedback] = useState<Record<string, FeedbackValue>>({});
  const explanation = useMemo(() => buildDetailedAffinityExplanation(
    readStoredMatchrimProfile(),
    attributes,
    { score, identificationConfidence, sensorySource },
  ), [attributes, identificationConfidence, score, sensorySource]);

  if (!explanation) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
        <div className="flex items-center gap-2 font-medium text-stone-800">
          <CircleHelp className="h-4 w-4" />
          Afinidad sin desglose suficiente
        </div>
        <p className="mt-1 leading-5">Falta un perfil Matchrim local o una ficha sensorial completa. No convierto datos ausentes en precision aparente.</p>
      </div>
    );
  }

  const storeFeedback = (dimension: string, value: FeedbackValue) => {
    const next = { ...feedback, [dimension]: value };
    setFeedback(next);
    try {
      window.localStorage.setItem(`matchrim.affinity_feedback.${wineKey}`, JSON.stringify(next));
    } catch (error) {
      console.warn('[affinity] Could not persist feedback:', error);
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">Por que encaja</h4>
          <p className="mt-1 text-sm leading-5 text-slate-600">{explanation.whyItMayFit}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          {explanation.score !== null && (
            <div className="mb-1">
              <span className="text-xl font-bold text-red-900">≈{explanation.score}%</span>
              <span className="ml-1">afinidad estimada</span>
            </div>
          )}
          {explanation.scoreRange && <div>Rango orientativo {explanation.scoreRange.min}-{explanation.scoreRange.max}%</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-stone-200 py-3 text-center text-xs text-slate-500">
        <div><span className="block text-lg font-bold text-slate-900">≈{Math.round(explanation.identificationConfidence * 100)}%</span>Señal de identidad</div>
        <div><span className="block text-lg font-bold text-slate-900">≈{Math.round(explanation.confidence * 100)}%</span>Respaldo de la explicacion ({explanation.confidenceLabel})</div>
      </div>

      {explanation.identificationConfidence < 0.72 && (
        <div role="note" className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950">
          Identidad sin confirmar. La afinidad describe el candidato visible, no demuestra que la botella sea esa referencia; confirma o corrige antes de decidir.
        </div>
      )}

      <div className="space-y-3">
        {explanation.dimensions.map((dimension) => (
          <div key={dimension.key} className="affinity-dimension-row grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
            <div className="affinity-dimension-label text-sm font-medium capitalize text-slate-800">{dimension.label}</div>
            <div className="affinity-dimension-detail min-w-0">
              <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-label={dimension.alignment === null ? `${dimension.label}: preferencia aun no aprendida` : `${dimension.label}: ${dimension.alignment}%`}>
                <div
                  className={dimension.alignment === null ? 'h-full bg-slate-400' : dimension.tone === 'positive' ? 'h-full bg-emerald-600' : dimension.tone === 'neutral' ? 'h-full bg-amber-500' : 'h-full bg-red-700'}
                  style={{ width: `${dimension.alignment ?? Math.round(dimension.wineValue / 5 * 100)}%` }}
                />
              </div>
              {!compact && (
                <div className="mt-1 text-[11px] text-slate-500">
                  {dimension.profileValue === null ? 'Tu perfil sin dato' : `Tu perfil ${dimension.profileValue.toFixed(1)}`} · vino {dimension.wineValue.toFixed(1)} · peso maximo {Math.round(dimension.weight * 100)}% · {SOURCE_LABELS[dimension.source]}
                </div>
              )}
            </div>
            <div className="affinity-dimension-feedback flex min-w-[4.5rem] justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant={feedback[dimension.key] === 'hit' ? 'default' : 'ghost'}
                className="h-11 w-11"
                aria-label={`La lectura de ${dimension.label} acerto`}
                onClick={() => storeFeedback(dimension.key, 'hit')}
              >
                {feedback[dimension.key] === 'hit' ? <Check className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant={feedback[dimension.key] === 'miss' ? 'destructive' : 'ghost'}
                className="h-11 w-11"
                aria-label={`La lectura de ${dimension.label} no acerto`}
                onClick={() => storeFeedback(dimension.key, 'miss')}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="font-semibold text-slate-900">Lo que podria no encajar</div>
          <p className="mt-1 leading-5 text-slate-600">{explanation.whatMayNotFit}</p>
        </div>
        <div>
          <div className="font-semibold text-slate-900">Grado de aventura</div>
          <p className="mt-1 capitalize text-slate-600">{explanation.adventure}</p>
        </div>
      </div>

      {!compact && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-slate-800">Datos y limites del calculo</summary>
          <div className="mt-2 space-y-2 text-slate-600">
            <p>Origen: {explanation.sources.map((source) => SOURCE_LABELS[source]).join(' + ')}.</p>
            <p>Falta: {explanation.missingData.join(', ')}. Con esos datos el orden podria cambiar.</p>
            <p>La identidad, la ficha sensorial y tu preferencia son evidencias distintas. El rango se ensancha cuando falta alguna; no representa una probabilidad estadistica.</p>
          </div>
        </details>
      )}
    </div>
  );
};
