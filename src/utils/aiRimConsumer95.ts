import type { ScanProfileSnapshot } from './scanProfile';

export type AiRimConsumerContext95 = Readonly<{
  ownerId: string | null;
  state: 'pending' | 'general' | 'base' | 'learned' | 'learning-unavailable';
  label: string;
  notice: string;
  context: string;
  samples: number | null;
}>;

export const AIRIM_NATIVE_CONSUMER_GUARDRAILS95 = [
  'El perfil describe preferencias de vino, no preferencias de comida ni la ficha de una botella.',
  'Esta consulta no aporta atributos sensoriales verificables de un vino ni un calculo local de afinidad.',
  'No inventes porcentajes Matchrim, puntuaciones personales, fichas ni atributos por nombre, bodega, uva o region.',
  'Una respuesta personal sobre un vino requiere identidad y atributos sensoriales verificables de esa referencia; aqui no estan disponibles.',
  'Ofrece orientacion general y condicional con puede/podria, separada del gusto personal. Sugiere escanear la etiqueta o carta para contrastarla.',
  'No afirmes un encaje ideal para esta persona, una ficha consultada ni experiencia humana de cata. No has probado estos vinos.',
  'No repitas indices internos de confianza, diversidad, coherencia o exploracion; explica los limites con palabras corrientes.',
].join('\n');

export const pendingAiRimConsumer95 = (ownerId: string | null): AiRimConsumerContext95 => ({
  ownerId, state: 'pending', label: 'Cargando tu perfil...', notice: 'Espera a que termine la consulta del perfil.', context: '', samples: null,
});

export const buildAiRimConsumer95 = (ownerId: string | null, snapshot: ScanProfileSnapshot | null): AiRimConsumerContext95 => {
  if (ownerId && !snapshot) return pendingAiRimConsumer95(ownerId);
  const profile = snapshot?.profile;
  const valid = profile && ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].every(key =>
    typeof profile[key] === 'number' && Number.isFinite(profile[key]) && profile[key] >= 0 && profile[key] <= 5);
  if (!ownerId || !valid || snapshot?.source === 'unavailable'
    || !['ready', 'training-error', 'training-timeout'].includes(snapshot?.status ?? '')) {
    const notice = !ownerId ? 'Sin perfil personal. Te dar\u00e9 orientaci\u00f3n general.'
      : snapshot?.status === 'missing' ? 'No hay un test guardado para esta cuenta. Orientaci\u00f3n general, sin afinidad personal.'
        : 'No se pudo disponer de tu perfil. Orientaci\u00f3n general, sin afinidad personal.';
    return { ownerId, state: 'general', label: 'Orientaci\u00f3n general \u00b7 sin perfil personal', notice, samples: null,
      context: [notice, 'No hay preferencias personales disponibles para esta consulta.', AIRIM_NATIVE_CONSUMER_GUARDRAILS95].join('\n') };
  }
  const unavailable = snapshot.status === 'training-error' || snapshot.status === 'training-timeout';
  const learned = !unavailable && snapshot.source === 'learned' && (snapshot.samples ?? 0) > 0;
  const samples = unavailable ? null : learned ? snapshot.samples : 0;
  const label = unavailable ? 'Test base \u00b7 valoraciones no disponibles'
    : learned ? `Perfil + ${samples} ${samples === 1 ? 'valoraci\u00f3n verificable' : 'valoraciones verificables'}` : 'Perfil Matchrim base';
  const notice = unavailable ? 'Usar\u00e9 solo el test base: no se pudieron consultar las valoraciones. Eso no significa que no las tengas.'
    : learned ? 'Usar\u00e9 el perfil ajustado con tus valoraciones verificables; sigue siendo orientativo.'
      : 'Usar\u00e9 el test base; esta lectura no contiene valoraciones verificables utilizables.';
  return { ownerId, state: unavailable ? 'learning-unavailable' : learned ? 'learned' : 'base', label, notice, samples,
    context: [notice,
      `Preferencias de vino en escala 0-5: potencia ${profile.potente}, acidez ${profile.acidez}, dulzura ${profile.dulce}, taninos ${profile.tanico}, fruta ${profile.afrutado}.`,
      learned && snapshot.note.includes('contradictorias') ? 'Hay preferencias contradictorias; cualquier consejo es provisional.' : '',
      AIRIM_NATIVE_CONSUMER_GUARDRAILS95].filter(Boolean).join('\n') };
};

export const aiRimRequestContext95 = (ownerId: string | null, context: AiRimConsumerContext95): AiRimConsumerContext95 | null =>
  context.ownerId === ownerId && context.state !== 'pending' ? Object.freeze({ ...context }) : null;

// Bound waiting even if a profile transport ignores cancellation. No retry or fallback account.
export const loadAiRimConsumer95 = async (
  ownerId: string | null, signal: AbortSignal,
  load: (signal: AbortSignal) => Promise<ScanProfileSnapshot>, timeoutMs = 6000,
): Promise<AiRimConsumerContext95> => {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (!ownerId) return buildAiRimConsumer95(null, null);
  const controller = new AbortController();
  let rejectAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = () => { controller.abort(); rejectAbort(new DOMException('Cancelled', 'AbortError')); };
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { controller.abort(); rejectAbort(new Error('Profile unavailable')); }, timeoutMs);
  try {
    const snapshot = await Promise.race([Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      return load(controller.signal);
    }), aborted]);
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return buildAiRimConsumer95(ownerId, snapshot);
  } catch (error) {
    if (signal.aborted) throw error;
    return buildAiRimConsumer95(ownerId, { profile: null, source: 'unavailable', samples: null, status: 'base-error', note: '' });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
};

export const assertAiRimConsumerAnswer95 = (response: string): string => {
  // These entry points have no verified bottle attributes or local personal score.
  if (/\d\s*(?:%|\/\s*(?:5|10|100)\b|(?:de|sobre)\s*100\b)|(?:afinidad|matchrim|puntuaci[o\u00f3]n)[^\n.!?]{0,40}\d|\b(?:potencia|acidez|dulzor|taninos?|fruta)\s*[:=]\s*\d/i.test(response)
    || /\b(?:encaja(?: mucho| perfectamente)? contigo|(?:perfect[oa]|ideal) para (?:ti|tu perfil)|he (?:catado|probado)|en mi experiencia|ficha (?:sensorial )?(?:verificada|original)|atributos verificados)\b/i.test(response)) {
    throw new Error('Unverifiable personal wine claim');
  }
  return response;
};
