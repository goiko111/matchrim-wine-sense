import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');

// Historical source proof only. Current local/remote consent is tested directly by97.
export const restoreLocalPrivacy152 = (file, source) => {
  if (file !== 'src/utils/nativePrivacy97.ts'
    || hash(source) !== '89539c38236049e517bde57ab0c8eaad2b2d28e4adb09de0fc2cc35c1bbd88f7') return source;
  const changes = [
    ['matchrim.scan_privacy_notice.openai-local.v4', 'matchrim.scan_privacy_notice.openai.v3'],
    ['Con el análisis con IA, la imagen y sus recortes se envían al backend de Matchrim en Supabase y a OpenAI. En el modo local Una etiqueta, Apple Vision lee en este iPhone y solo el texto se consulta en Winerim; la foto no se envía. No subas imágenes con personas o datos sensibles.',
      'La imagen y sus recortes se envían al backend de Matchrim en Supabase y a OpenAI para leer el contenido e identificar vinos. No subas imágenes con personas o datos sensibles.'],
    ['El backend de Matchrim usa la API de OpenAI para detectar regiones, leer etiquetas, cartas y platos, y generar recomendaciones. Si eliges ese análisis con IA, las imágenes y los recortes se envían a OpenAI a través de las funciones de Matchrim. El modo local Una etiqueta usa Apple Vision en el iPhone: la foto no se envía y solo el texto leído se consulta en el catálogo Winerim.',
      'El backend de Matchrim usa la API de OpenAI para detectar regiones, leer etiquetas, cartas y platos, y generar recomendaciones. Las imágenes y los recortes que seleccionas se envían a OpenAI a través de las funciones de Matchrim.'],
  ];
  for (const [current, previous] of changes) {
    assert.equal(source.split(current).length, 2, 'One exact reviewed109 privacy inverse');
    source = source.replace(current, previous);
  }
  assert.equal(hash(source), '65b004ba1bab51670083ab117b9a49424425e24c323f96743de7a026be9a2878',
    'Every frozen99 provider-policy byte is restored; unknown current sources remain unprojected');
  return source;
};

export const restoreLabelEvidence152 = (file, source) => {
  if (file !== 'src/utils/labelScanSave.ts'
    || hash(source) !== '0313b288ae007f236faed348671bda5ddb60d8eae5ede07fcf160e76fb7a1ab5') return source;
  const changes = [
    ["import { confirmsCellarPublicReference107 } from './cellarPublicReference107';\n", ''],
    ["import { confirmsCellarReferenceStyle110 } from './cellarReferenceStyle110';\n", ''],
    [`  }) && confirmsCellarReferenceStyle110(data, { name: wine.nombre, producer: wine.productor || null,
    vintage: wine.anada ?? null, region: wine.region || null, country: wine.pais || null,
    place_details: wine.affinity_details }) && confirmsCellarPublicReference107(data, { name: wine.nombre, producer: wine.productor || null,
    vintage: wine.anada ?? null, region: wine.region || null, country: wine.pais || null,
    place_details: wine.affinity_details }) && confirmsCellarSaveEvidence(data, { name: wine.nombre, producer: wine.productor || null,`,
      '  }) && confirmsCellarSaveEvidence(data, { name: wine.nombre, producer: wine.productor || null,'],
  ];
  for (const [current, previous] of changes) {
    assert.equal(source.split(current).length, 2, 'One exact reviewed107/110 persistence inverse');
    source = source.replace(current, previous);
  }
  assert.equal(hash(source), 'e3e8c145d853315966b21a47d2cb5cc2476f81dd729d364395b4a176134642fd',
    'Every frozen99 owner/ledger/save byte is restored; current107/110 acknowledgement is tested directly');
  return source;
};
