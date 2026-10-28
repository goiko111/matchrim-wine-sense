// Offline, deterministic check of the public Winerim carta of "plazablanca-clone" (135 unique wines): would the app's
// real lookup admission let the on-device Apple Vision OCR of each wine's Winerim bottle photo reach that wine's card,
// and does the card carry the 0-5 taste attributes? Perfect identity is assumed (the carta row); only the real OCR
// decides admission, exactly as simulate-matchrim-users284.ts does. No account, network, model or catalogue call.
// Inputs: <root>/raw/wines-p1..7.json, <root>/photos-manifest.json, <root>/ocr/<id>.json (vision-ocr285.swift output).
// Run: npx tsx scripts/check-matchrim-plazablanca285.ts [--root=qa-artifacts/plazablanca285-20261028] [--out=qa-fixtures/plazablanca285]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { canonicalProducerKey } from '../src/utils/winerimLabelIdentity';
import { isNonWineIdentity } from '../src/utils/wineCategory';

const arg = (name: string, fallback: string) => process.argv.find(item => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = arg('root', 'qa-artifacts/plazablanca285-20261028'), out = arg('out', 'qa-fixtures/plazablanca285');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const read = (file: string) => fs.readFileSync(file), json = (file: string) => JSON.parse(read(file).toString('utf8'));
const pct = (part: number, whole: number) => whole ? Number((100 * part / whole).toFixed(1)) : null;

// Same normalisation as nativeCatalogAdmission97 (module-private there); used only to explain a rejection, never to admit.
const tokens = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
const connectors = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'of', 'the', 'and', 'y']);
const wrappers = new Set(['bodega', 'bodegas', 'winery', 'wines', 'sa', 'sl', 'ltd', 'limited']);
const distinctive = (value: string, producer = false) => [...new Set(tokens(value).filter(token => !connectors.has(token) && (!producer || !wrappers.has(token))))];

type Axes = Record<'power' | 'sweetness' | 'acidity' | 'tannin' | 'fruity' | 'aging', number | null>;
type Row = { id: number; name: string; subname: string | null; winery: string; vintage: string | null; type: string; photo: string; tastingAttributes: Axes | null };
type Photo = { id: number; url: string; httpStatus: number; sha256: string; bytes: number };
const core = ['power', 'sweetness', 'acidity', 'tannin', 'fruity'] as const;

const pageFiles = [1, 2, 3, 4, 5, 6, 7].map(page => `${root}/raw/wines-p${page}.json`);
const listed: Row[] = pageFiles.flatMap(file => json(file).results);
const firstById = new Map<number, Row>(); for (const row of listed) if (!firstById.has(row.id)) firstById.set(row.id, row);
const wines = [...firstById.values()];
assert.equal(listed.length, 136); assert.equal(wines.length, 135);
const manifest = json(`${root}/photos-manifest.json`), photoById = new Map<number, Photo>(manifest.rows.map((row: Photo) => [row.id, row]));

const evaluate = (name: string, winery: string, ocr: string[], visible: Set<string>) => ({
  admitted: canAdmitNativeCatalogLookup97({ name, producer: winery, vintage: null, region: null, country: null, confidence: 0.9, evidence: ocr }),
  missingName: distinctive(name).filter(token => !visible.has(token)),
  missingProducer: distinctive(canonicalProducerKey(winery), true).filter(token => !visible.has(token)) });

const perWine = wines.map(row => {
  const photo = photoById.get(row.id);
  assert(photo && photo.httpStatus === 200 && photo.url === row.photo, `photo ${row.id}`);
  assert.equal(sha(read(`${root}/photos/${row.id}.png`)), photo.sha256, `photo hash ${row.id}`);
  const raw = json(`${root}/ocr/${row.id}.json`);
  assert.equal(raw.sourceSHA256, photo.sha256, `ocr source ${row.id}`);
  const ocr: string[] = [...raw.lines].sort((a, b) => a.index - b.index).map((line: { text: string }) => line.text);
  const fragments = ocr.map(tokens).filter(fragment => fragment.length), visible = new Set(fragments.flat());
  const base = evaluate(row.name, row.winery, ocr, visible);
  const sub = row.subname ? evaluate(`${row.name} ${row.subname}`, row.winery, ocr, visible) : null;
  if (base.admitted) assert(!base.missingName.length && !base.missingProducer.length, `admitted with missing words ${row.id}`);
  const reason = base.admitted ? null : !fragments.length ? 'ocr-empty' : new Set(fragments.map(fragment => fragment.join(''))).size < 2 ? 'single-fragment'
    : base.missingName.length || base.missingProducer.length ? 'missing-words' : 'identity-gate';
  const attributes = row.tastingAttributes;
  const allFive = Boolean(attributes) && core.every(axis => Number.isInteger(attributes![axis]) && attributes![axis]! >= 0 && attributes![axis]! <= 5);
  const otherYears = [...visible].filter(token => /^(19|20)\d{2}$/.test(token) && token !== row.vintage);
  return { id: row.id, name: row.name, ...(row.subname ? { subname: row.subname } : {}), winery: row.winery, type: row.type,
    ocrLines: ocr.length, nonWine: isNonWineIdentity(row.name, row.type), admitted: base.admitted,
    ...(sub ? { admittedWithSubname: sub.admitted } : {}), ...(reason ? { reason } : {}),
    ...(base.missingName.length ? { missingName: base.missingName } : {}), ...(base.missingProducer.length ? { missingProducer: base.missingProducer } : {}),
    vintage: row.vintage, vintageVisible: row.vintage ? visible.has(row.vintage.trim()) : null, ...(otherYears.length ? { otherYears } : {}),
    allFiveAxes: allFive, aging: attributes?.aging ?? null, photoSHA256: photo.sha256, width: raw.width as number, height: raw.height as number };
});

type Wine = (typeof perWine)[number];
const tally = (items: Wine[]) => {
  const withVintage = items.filter(wine => wine.vintage), withSub = items.filter(wine => 'admittedWithSubname' in wine);
  const reachable = items.filter(wine => wine.admitted && !wine.nonWine);
  return { wines: items.length, ocrNonEmpty: items.filter(wine => wine.ocrLines > 0).length, admitted: items.filter(wine => wine.admitted).length,
    admittedPct: pct(items.filter(wine => wine.admitted).length, items.length), nonWine: items.filter(wine => wine.nonWine).length,
    reachableWine: reachable.length, reachableWithAllFiveAxes: reachable.filter(wine => wine.allFiveAxes).length,
    withSubname: withSub.length, admittedWithSubname: withSub.filter(wine => wine.admittedWithSubname).length,
    nameWordsAllVisible: items.filter(wine => !wine.missingName).length, producerWordsAllVisible: items.filter(wine => !wine.missingProducer).length,
    withVintage: withVintage.length, vintageVisible: withVintage.filter(wine => wine.vintageVisible).length,
    otherYearVisible: items.filter(wine => wine.otherYears).length, allFiveAxes: items.filter(wine => wine.allFiveAxes).length,
    agingPresent: items.filter(wine => wine.aging != null).length };
};
const types = [...new Set(perWine.map(wine => wine.type))].sort((a, b) => perWine.filter(w => w.type === b).length - perWine.filter(w => w.type === a).length || a.localeCompare(b));
const reasons = perWine.reduce<Record<string, number>>((all, wine) => (wine.reason ? { ...all, [wine.reason]: (all[wine.reason] ?? 0) + 1 } : all), {});
const photoShared = [...perWine.reduce((map, wine) => map.set(wine.photoSHA256, [...(map.get(wine.photoSHA256) ?? []), wine.id]), new Map<string, number[]>()).values()].filter(ids => ids.length > 1);
const widths = perWine.map(wine => wine.width).sort((a, b) => a - b), heights = perWine.map(wine => wine.height).sort((a, b) => a - b);

const result = {
  scope: 'Offline deterministic check. Real: the public Winerim carta of plazablanca-clone (7 list pages), each wine\'s public Winerim bottle photo, Apple Vision OCR of that photo on a Mac and the app admission/category functions. Assumed: a perfect recogniser that proposes the exact carta name and winery; only the OCR evidence decides admission. Not a phone-camera test: catalogue photos are ~140x519 px packshots. canAdmitNativeCatalogLookup97 is a necessary gate only; the native paths add more gates (hasMissingVisibleQualifier102, independentGlobalProducer103, vintage checks), so admitted is an upper bound for the automatic path. Manual catalogue search does not use this gate.',
  inputs: { listPagesSHA256: Object.fromEntries(pageFiles.map(file => [file.split('/').pop(), sha(read(file))])),
    photosManifestSHA256: sha(read(`${root}/photos-manifest.json`)), listedRows: listed.length, uniqueWines: wines.length,
    appSourceSHA256: Object.fromEntries(['nativeCatalogAdmission97', 'winerimOriginalSheet', 'winerimLabelIdentity', 'nativeVintageEvidence100', 'wineYearRole105', 'wineCategory']
      .map(name => [name, sha(read(`src/utils/${name}.ts`))])),
    duplicateListedIds: [...new Set(listed.map(row => row.id).filter((id, index, all) => all.indexOf(id) !== index))],
    photosHttp200: [...photoById.values()].filter(photo => photo.httpStatus === 200).length, photoSharedByIds: photoShared,
    photoPixels: { width: [widths[0], widths[widths.length >> 1], widths[widths.length - 1]], height: [heights[0], heights[heights.length >> 1], heights[heights.length - 1]] },
    ocr: 'Apple Vision VNRecognizeTextRequest revision3, accurate, es-ES/en-US/fr-FR, language correction on, CPU only, no custom words (qa-artifacts/plazablanca285-20261028/vision-ocr285.swift)',
    admission: "canAdmitNativeCatalogLookup97({ name, producer: winery, vintage: null, region: null, country: null, confidence: 0.9, evidence: ocrLines }); variant name + ' ' + subname when subname != null; isNonWineIdentity(name, type)" },
  totals: { images: perWine.length, ...tally(perWine), rejectionReasons: reasons },
  byType: Object.fromEntries(types.map(type => [type, tally(perWine.filter(wine => wine.type === type))])),
  wines: perWine.map(({ photoSHA256, width, height, ...wine }) => wine),
};
fs.mkdirSync(out, { recursive: true });
const body = JSON.stringify({ ...result, wines: '__WINES__' }, null, 1)
  .replace('"__WINES__"', '[\n' + result.wines.map(wine => '  ' + JSON.stringify(wine)).join(',\n') + '\n ]');
JSON.parse(body);
fs.writeFileSync(out + '/RESULT.json', body + '\n');
console.log(JSON.stringify({ totals: result.totals, byType: Object.fromEntries(Object.entries(result.byType).map(([type, value]) =>
  [type, `${value.admitted}/${value.wines} admitted, ocr ${value.ocrNonEmpty}, nonWine ${value.nonWine}, vintage ${value.vintageVisible}/${value.withVintage}, axes ${value.allFiveAxes}`])) }, null, 1));
