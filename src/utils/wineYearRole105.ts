import type { WineCandidate } from './multiWineScan';

export type YearLine105 = { text: string; box?: { x: number; y: number; width: number; height: number } };
export type YearRole105 = { year: number; role: 'vintage' | 'award' | 'foundation' | 'ambiguous' | 'unclassified' | 'unsupported'; evidence: string[] };
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const hasAward = (text: string) => /\b(?:medalla|medaille|medal|concours|competition|awards?|premio|trophy)\b/.test(text)
  || (/\b(?:lyon|decanter|iwsc|iwc|bruxelles|mundus vini)\b/.test(text) && /\b(?:gold|silver|bronze|oro|or|argent)\b/.test(text));
const explicitVintage = (text: string, year: number) => new RegExp(`(?:vintage|cosecha|anada|millesime|vendimia|harvest)\\s*[:.-]?\\s*${year}\\b|\\b${year}\\s*(?:vintage|cosecha|anada|millesime|vendimia|harvest)\\b`).test(text);
const explicitFoundation = (text: string, year: number) => new RegExp(`\\b(?:since|desde|depuis|founded|established|fundad[ao]|fundacion|est\\.)\\s*(?:en\\s*)?${year}\\b`).test(text);
const inlineAward = (text: string, year: number): 'award' | 'ambiguous' | null => {
  let uncertain = false;
  for (const clause of text.split(/[.;,\n]/)) {
  const years = [...clause.matchAll(/\b(?:19|20)\d{2}\b/g)];
  if (!years.some(value => Number(value[0]) === year) || !hasAward(clause)) continue;
  if (new Set(years.map(value => value[0])).size === 1) return 'award';
  const markers = clause.matchAll(/\b(?:(?:(?:gold|silver|bronze|oro|argent)\s+)?(?:medalla|medaille|medal|concours|competition|awards?|premio|trophy)|(?:lyon|decanter|iwsc|iwc|bruxelles|mundus vini)\s+(?:gold|silver|bronze|oro|or|argent))\b/g);
  for (const marker of markers) {
    const end = marker.index! + marker[0].length;
    const linked = years.find(value => value.index! >= end
      && !/\b(?:vintage|cosecha|anada|millesime|vendimia|harvest|since|desde|depuis|founded|established|fundad[ao]|fundacion|est)\b/.test(clause.slice(end, value.index!)))
      || [...years].reverse().find(value => value.index! < marker.index!);
    if (linked && Number(linked[0]) === year) return 'award';
  }
  if (!explicitVintage(clause, year) && !explicitFoundation(clause, year)) uncertain = true;
  }
  return uncertain ? 'ambiguous' : null;
};
const validBox = (box: YearLine105['box']) => Boolean(box && Object.values(box).every(value => Number.isFinite(value) && value >= 0 && value <= 1)
  && box.width > 0 && box.height > 0 && box.x + box.width <= 1.001 && box.y + box.height <= 1.001);
const close = (a: YearLine105, b: YearLine105) => {
  if (!validBox(a.box) || !validBox(b.box)) return false;
  const left = a.box!, right = b.box!;
  return Math.abs(left.y + left.height / 2 - right.y - right.height / 2) <= Math.max(.04, 2 * Math.max(left.height, right.height))
    && Math.abs(left.x + left.width / 2 - right.x - right.width / 2) <= .28;
};

// Regions only: a medal on a neighbouring bottle must not classify this label.
// Without geometry, only explicit context within the same fragment is used.
export const wineYearRoles105 = (lines: readonly YearLine105[]): { supported: boolean; roles: YearRole105[] } => {
  if (!Array.isArray(lines) || lines.length > 100 || lines.some(line => typeof line?.text !== 'string' || line.text.length > 1000)) return { supported: false, roles: [] };
  const observations = new Map<number, { roles: Set<YearRole105['role']>; evidence: Set<string> }>();
  for (const line of lines) {
    const matches = [...line.text.matchAll(/\b(?:19|20)\d{2}\b/g)].slice(0, 8);
    if (!matches.length) continue;
    const neighbours = lines.filter(other => other === line || close(line, other));
    const context = fold(neighbours.map(value => value.text).join(' '));
    const inline = fold(line.text);
    for (const match of matches) {
      const year = Number(match[0]);
      const vintage = explicitVintage(inline, year);
      const foundation = explicitFoundation(inline, year);
      const spatialAward = !vintage && !foundation && neighbours.length > 1 && hasAward(context);
      const contextYears = new Set(context.match(/\b(?:19|20)\d{2}\b/g));
      const inlineRole = inlineAward(inline, year);
      const award = inlineRole === 'award' || (spatialAward && contextYears.size === 1);
      const current = observations.get(year) || { roles: new Set<YearRole105['role']>(), evidence: new Set<string>() };
      if (vintage) current.roles.add('vintage');
      if (foundation) current.roles.add('foundation');
      if (award) current.roles.add('award');
      if (inlineRole === 'ambiguous' || (spatialAward && contextYears.size > 1)) current.roles.add('ambiguous');
      for (const value of neighbours) current.evidence.add(value.text);
      observations.set(year, current);
    }
  }
  return { supported: true, roles: [...observations.entries()].map(([year, value]) => ({ year,
    role: value.roles.size > 1 ? 'ambiguous' : [...value.roles][0] || 'unclassified', evidence: [...value.evidence] })) };
};
export const nonVintageYear105 = (year: number | string | null | undefined, evidence: readonly string[]) => {
  if (!Array.isArray(evidence)) return { year: Number(year || 0), role: 'unsupported' as const, evidence: [] };
  const parsed = wineYearRoles105(evidence.map(text => ({ text })));
  if (!parsed.supported) return { year: Number(year || 0), role: 'unsupported' as const, evidence: [] };
  if (year == null) return null;
  return parsed.roles.find(value => value.year === Number(year)
    && (value.role === 'award' || value.role === 'foundation' || value.role === 'ambiguous')) || null;
};

export const normalizeNativeYear105 = (candidate: WineCandidate): WineCandidate => {
  if (candidate.source === 'manual') return candidate;
  const role = nonVintageYear105(candidate.vintage, candidate.evidence);
  if (!role) return candidate;
  const reason = role.role === 'unsupported' ? 'El contexto de la lectura supera los limites admitidos; revisa la cosecha.'
    : role.role === 'award' ? `La fecha ${role.year} aparece vinculada a un premio; la cosecha sigue sin confirmar.`
    : role.role === 'foundation' ? `La fecha ${role.year} indica el origen de la bodega; la cosecha sigue sin confirmar.`
      : `La fecha ${role.year} tiene usos contradictorios en la lectura; revisa la cosecha.`;
  return { ...candidate, vintage: null, inferredFields: [...new Set([...candidate.inferredFields, 'vintage'])],
    uncertaintyReasons: [...new Set([...candidate.uncertaintyReasons, reason])],
    canonicalId: null, masterRecord: null, globalRecord: null, originalSheet: null, sensoryAttributes: null,
    affinity: null, affinityConfidence: null, affinityReason: reason };
};
