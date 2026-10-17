import type { MatchrimProfileLike } from './matchrimPassport';
import { correctWineCandidateIdentity, type WineCandidate } from './multiWineScan';
import { applyMenuWineEvidence, applyScanWineEvidence, updateMenuWineEvidence } from './scanWineEvidence';
import { catalogWineFromVerifiedSheet, type WinerimOriginalSheet } from './winerimOriginalSheet';
import type { MenuScanWine } from './wineMenuScan';

// Called only after an explicit catalogue selection. A source proposal alone
// cannot enter this path or certify the photographed vintage.
export const confirmedLabelCatalogIdentity95 = (
  current: WineCandidate, sheet: WinerimOriginalSheet, profile: MatchrimProfileLike | null,
): WineCandidate | null => {
  const manual = {
    ...correctWineCandidateIdentity(current, { name: sheet.name, producer: sheet.producer }),
    vintage: sheet.vintage ? Number(sheet.vintage) : null,
    region: sheet.region, country: sheet.country ?? null, grapes: sheet.grapes,
  };
  const catalog = catalogWineFromVerifiedSheet(manual, sheet);
  if (!catalog) return null;
  const next = applyScanWineEvidence(manual, profile, catalog);
  return next.originalSheet?.id === sheet.id && next.canonicalId === sheet.id
    ? { ...next, source: 'manual', evidence: [...manual.evidence, 'Referencia de catálogo elegida por el usuario; no verifica la foto.'] }
    : null;
};

export const confirmedMenuCatalogIdentity95 = (
  current: MenuScanWine, sheet: WinerimOriginalSheet, profile: MatchrimProfileLike | null,
): MenuScanWine | null => {
  const manual = updateMenuWineEvidence(current, {
    nombre: sheet.name, productor: sheet.producer, anada: sheet.vintage ? Number(sheet.vintage) : null,
    region: sheet.region, pais: sheet.country ?? null, uvas: sheet.grapes, tipo: 'Sin tipo', descripcion: null,
  });
  manual.campos_inferidos = (manual.campos_inferidos ?? []).filter(field =>
    !/^(name|nombre|producer|productor|winery|bodega|vintage|anada|añada|year|region|country|pais|país|grapes|uvas)$/i.test(field));
  const identity = { name: manual.nombre, producer: manual.productor, vintage: manual.anada,
    region: manual.region, country: manual.pais, inferredFields: manual.campos_inferidos };
  const catalog = catalogWineFromVerifiedSheet(identity, sheet);
  if (!catalog) return null;
  const next = applyMenuWineEvidence(manual, profile, catalog);
  return next.originalSheet?.id === sheet.id && next.canonicalId === sheet.id
    ? { ...next, dudas: Array.from(new Set([...(manual.dudas ?? []), 'Referencia de catálogo elegida por ti; revisa que corresponda a la carta.'])) }
    : null;
};
