type QaFixtureResolution = {
  handled: boolean;
  payload?: unknown;
};

type FixtureCandidateOptions = {
  confidence: number;
  affinity: number;
  uncertainty?: string[];
  vintage?: number;
  region?: string;
  country?: string;
  grapes?: string[];
  sensory?: {
    potencia: number;
    acidez: number;
    dulzura: number;
    taninos: number;
    afrutado: number;
    madera: number;
    intensidad: number;
  };
};

const fixtureCandidate = (
  name: string,
  producer: string,
  options: FixtureCandidateOptions,
) => ({
  name,
  producer,
  vintage: options.vintage ?? 2020,
  region: options.region ?? 'Rioja',
  country: options.country ?? 'Espana',
  grapes: options.grapes ?? ['Tempranillo'],
  alcohol: null,
  confidence: options.confidence,
  source: 'label',
  evidence: [`Texto visible: ${name}`, `Marca visible: ${producer}`],
  uncertainty_reasons: options.uncertainty ?? [],
  inferred_fields: ['sensory_attributes'],
  affinity: options.affinity,
  affinity_confidence: Math.min(options.confidence, 0.58),
  affinity_reason: 'Afinidad calculada con el perfil local de QA y atributos sensoriales inferidos.',
  sensory_attributes: options.sensory ?? {
    potencia: 4,
    acidez: 3,
    dulzura: 1,
    taninos: 4,
    afrutado: 3,
    madera: 4,
    intensidad: 4,
  },
});

const labelRegionResponse = (regionId: string) => {
  if (regionId === 'region-2') {
    return {
      candidates: [
        fixtureCandidate('Marques de Riscal Reserva', 'Herederos del Marques de Riscal', {
          confidence: 0.61,
          affinity: 76,
          uncertainty: ['Reflejo sobre la palabra central'],
        }),
        fixtureCandidate('Marques de Caceres Reserva', 'Marques de Caceres', {
          confidence: 0.43,
          affinity: 71,
          uncertainty: ['Tipografia parcialmente oculta'],
        }),
      ],
    };
  }

  if (regionId === 'region-3') {
    return {
      candidates: [fixtureCandidate('Pazo de Senorans', 'Pazo de Senorans', {
        confidence: 0.86,
        affinity: 83,
        vintage: 2023,
        region: 'Rias Baixas',
        grapes: ['Albarino'],
        sensory: {
          potencia: 2,
          acidez: 5,
          dulzura: 1,
          taninos: 1,
          afrutado: 4,
          madera: 1,
          intensidad: 3,
        },
      })],
    };
  }

  if (regionId === 'region-5') return { candidates: [] };

  return {
    candidates: [fixtureCandidate('Muga Reserva', 'Bodegas Muga', {
      confidence: regionId === 'region-4' ? 0.84 : 0.91,
      affinity: 88,
    })],
  };
};

const menuWine = (
  name: string,
  producer: string | null,
  options: {
    compatibility: number;
    confidence: number;
    price: number;
    region: string | null;
    type: string;
    service: 'copa' | 'botella' | 'ambos';
    section: string;
    position: { x: number; y: number; width: number; height: number } | null;
    attributes: { potencia: number; acidez: number; dulzura: number; taninos: number; afrutado: number };
  },
) => ({
  nombre: name,
  productor: producer,
  anada: producer ? 2021 : null,
  region: options.region,
  pais: options.region ? 'Espana' : null,
  tipo: options.type,
  precio: options.price,
  precios: options.service === 'copa'
    ? { copa: options.price, botella: null }
    : options.service === 'ambos'
      ? { copa: Math.round(options.price / 5 * 100) / 100, botella: options.price }
      : { copa: null, botella: options.price },
  servicio: options.service,
  seccion: options.section,
  confidence: options.confidence,
  compatibilidad: options.compatibility,
  razon: options.confidence < 0.5
    ? 'Identidad insuficiente para una recomendacion firme.'
    : 'Afinidad de fixture basada en el perfil local y las dimensiones sensoriales mostradas.',
  atributos: options.attributes,
  posicion: options.position
    ? { ...options.position, confidence: options.confidence }
    : null,
});

const menuFixtureResponse = (fixtureName: string) => {
  const normalizedName = fixtureName.toLowerCase();
  const leadName = normalizedName.includes('7552')
    ? 'Txakoli G22'
    : normalizedName.includes('7553')
      ? 'Les Terrasses'
      : normalizedName.includes('7548')
        ? 'Gramona Imperial'
        : 'Finca Dofi';

  return {
    has_profile: true,
    qa_fixture: fixtureName,
    vinos: [
      menuWine(leadName, 'Seleccion de la casa', {
        compatibility: 91,
        confidence: 0.92,
        price: 48,
        region: 'Priorat',
        type: 'Tinto',
        service: 'botella',
        section: 'Seleccion',
        position: { x: 8, y: 17, width: 34, height: 5 },
        attributes: { potencia: 4, acidez: 4, dulzura: 1, taninos: 4, afrutado: 4 },
      }),
      menuWine('Pazo de Senorans', 'Pazo de Senorans', {
        compatibility: 84,
        confidence: 0.87,
        price: 36,
        region: 'Rias Baixas',
        type: 'Blanco',
        service: 'ambos',
        section: 'Blancos atlanticos',
        position: { x: 53, y: 34, width: 35, height: 5 },
        attributes: { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 },
      }),
      menuWine('La Montesa', 'Palacios Remondo', {
        compatibility: 82,
        confidence: 0.79,
        price: 28,
        region: 'Rioja',
        type: 'Tinto',
        service: 'ambos',
        section: 'Tintos de Rioja',
        position: { x: 9, y: 54, width: 34, height: 5 },
        attributes: { potencia: 3, acidez: 3, dulzura: 1, taninos: 3, afrutado: 4 },
      }),
      menuWine('Louro do Bolo', 'Rafael Palacios', {
        compatibility: 74,
        confidence: 0.76,
        price: 31,
        region: 'Valdeorras',
        type: 'Blanco',
        service: 'copa',
        section: 'Por copas',
        position: { x: 53, y: 68, width: 34, height: 5 },
        attributes: { potencia: 3, acidez: 4, dulzura: 1, taninos: 1, afrutado: 3 },
      }),
      menuWine('Entrada dudosa', null, {
        compatibility: 55,
        confidence: 0.41,
        price: 18,
        region: null,
        type: 'Sin confirmar',
        service: 'copa',
        section: 'Especiales',
        position: null,
        attributes: { potencia: 3, acidez: 3, dulzura: 2, taninos: 2, afrutado: 3 },
      }),
    ],
  };
};

const waitForFixtureLatency = (functionName: string, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const delay = functionName === 'scan-wine-menu' ? 350 : functionName === 'detect-wine-regions' ? 240 : 160;
  const onAbort = () => {
    window.clearTimeout(timeoutId);
    reject(new DOMException('Cancelled', 'AbortError'));
  };
  const timeoutId = window.setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, delay);
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) onAbort();
});

export const buildMatchrimQaFixturePayload = (
  functionName: string,
  body: Record<string, unknown>,
): QaFixtureResolution => {
  const fixtureName = typeof body.qa_fixture_name === 'string' ? body.qa_fixture_name : 'fixture-local';

  if (functionName === 'detect-wine-regions') {
    return {
      handled: true,
      payload: {
        qa_fixture: fixtureName,
        coverage: {
          status: 'unknown',
          detected_objects: 5,
          estimated_visible_objects: null,
          confidence: null,
          notes: ['Fixture de interfaz: no mide recall ni cobertura visual real.'],
        },
        regions: [
          { box: { x: 3, y: 15, width: 16, height: 68 }, confidence: 0.94, quality: { glare: 'medium', occlusion: 'low', legibility: 'good' } },
          { box: { x: 22, y: 18, width: 17, height: 64 }, confidence: 0.82, quality: { glare: 'high', occlusion: 'medium', legibility: 'limited' } },
          { box: { x: 42, y: 13, width: 16, height: 70 }, confidence: 0.91, quality: { glare: 'low', occlusion: 'low', legibility: 'good' } },
          { box: { x: 61, y: 17, width: 16, height: 66 }, confidence: 0.86, quality: { glare: 'medium', occlusion: 'medium', legibility: 'good' } },
          { box: { x: 81, y: 20, width: 15, height: 61 }, confidence: 0.63, quality: { glare: 'high', occlusion: 'high', legibility: 'poor' } },
        ],
      },
    };
  }

  if (functionName === 'analyze-wine-region') {
    return { handled: true, payload: labelRegionResponse(String(body.region_id ?? '')) };
  }

  if (functionName === 'scan-wine-menu') {
    return { handled: true, payload: menuFixtureResponse(fixtureName) };
  }

  if (functionName === 'calculate-wine-affinity') {
    return { handled: true, payload: { affinity: 82 } };
  }

  return { handled: false };
};

export const resolveMatchrimQaFixture = async (
  functionName: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<QaFixtureResolution> => {
  await waitForFixtureLatency(functionName, signal);
  const fixtureName = typeof body.qa_fixture_name === 'string' ? body.qa_fixture_name : 'fixture-local';
  console.info(`[matchrim-qa] ${functionName} <- ${fixtureName}`);
  return buildMatchrimQaFixturePayload(functionName, body);
};
