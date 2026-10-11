import type { WineCandidate } from './multiWineScan';
import type { MenuScanWine } from './wineMenuScan';
import type { MatchrimProfileLike } from './matchrimPassport';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { isNonWineIdentity } from './wineCategory';

export const MISSING_SCAN_SENSORY = 'Afinidad pendiente: faltan atributos sensoriales de una ficha de vino identificada. La foto no permite verificarlos.';

export interface ScanCatalogWine {
  id: string | number;
  name: string;
  winery?: string;
  type?: string;
  vintage?: string | number;
  tastingAttributes?: { power: number; acidity: number; sweetness: number; tannin: number; fruity: number } | null;
}

// A vision response cannot self-certify its attributes as catalog data. Only
// a separately matched catalog record may provide numerical scan affinity.
export const applyScanWineEvidence = (
  candidate: WineCandidate,
  profile: MatchrimProfileLike | null,
  catalog?: ScanCatalogWine | null,
): WineCandidate => {
  const pending: WineCandidate = {
    ...candidate, canonicalId: null, sensorySource: 'inference',
    affinity: null, affinityConfidence: null, affinityReason: MISSING_SCAN_SENSORY,
  };
  if (!catalog || !catalog.id || isNonWineIdentity(candidate.name, catalog.name, catalog.type)
    || !isSafeCanonicalLabelMatch(candidate, { ...catalog, producer: catalog.winery })) return pending;
  // Missing vintages must not silently borrow a vintage-specific sensory sheet.
  if ((candidate.vintage || catalog.vintage) && String(candidate.vintage ?? '') !== String(catalog.vintage ?? '')) return pending;
  const values = normalizeWineAttributesForInsight(catalog.tastingAttributes);
  const sensoryAttributes = values ? {
    potencia: values.potente, acidez: values.acidez, dulzura: values.dulce,
    taninos: values.tanico, afrutado: values.afrutado,
  } : null;
  const affinity = calculateLocalMatchrimAffinity(profile, sensoryAttributes);
  return {
    ...pending, canonicalId: String(catalog.id), source: 'catalog', sensorySource: 'catalog',
    sensoryAttributes, affinity,
    affinityConfidence: affinity === null ? null : Math.min(candidate.confidence, 0.9),
    affinityReason: affinity !== null
      ? `Coincidencia sensorial calculada con tu perfil y la ficha Winerim ${catalog.id}; no es una probabilidad de que te guste.`
      : !values ? MISSING_SCAN_SENSORY : 'Completa tu perfil de gustos para calcular la afinidad con esta ficha.',
  };
};

export const applyMenuWineEvidence = (wine: MenuScanWine, profile: MatchrimProfileLike | null, catalog?: ScanCatalogWine | null): MenuScanWine => {
  const candidate: WineCandidate = {
    id: 'menu', name: wine.nombre, producer: wine.productor, vintage: wine.anada,
    region: wine.region, country: wine.pais, grapes: wine.uvas ?? [], alcohol: null,
    source: 'inference', confidence: wine.confidence ?? 0, evidence: [],
    uncertaintyReasons: wine.dudas ?? [], inferredFields: wine.campos_inferidos ?? [],
    sensoryAttributes: wine.atributos,
  };
  const grounded = applyScanWineEvidence(candidate, profile, catalog);
  return {
    ...wine, canonicalId: grounded.canonicalId, sensorySource: grounded.sensorySource,
    atributos: grounded.sensorySource === 'catalog' ? grounded.sensoryAttributes as MenuScanWine['atributos'] : wine.atributos,
    compatibilidad: grounded.affinity, affinity_calibrated: grounded.affinity !== null,
    razon: grounded.affinityReason,
  };
};
