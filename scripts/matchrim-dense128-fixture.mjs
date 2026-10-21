import assert from 'node:assert/strict';

export const image128 = '/Users/GOIKO/Downloads/76bd3a6d-2895-458f-96bd-2ab2f1052c71 2.JPG';
export const names128 = ['QAVisualReferenceWithAnIntentionallyLongUnbrokenName',
  'QA Visual Reference Two', 'QA Visual Reference Three', 'QA Visual Reference Four',
  'QA Visual Reference Five', 'QA Visual Reference Six'];
export const detection128 = () => ({
  coverage: { status: 'reported_complete', detected_objects: 30, estimated_visible_objects: 30,
    confidence: .99, notes: ['Synthetic interface stress contract only; no detection accuracy or inventory claim.'] },
  regions: Array.from({ length: 30 }, (_, i) => ({
    box: { x: 2 + i % 6 * 16, y: 2 + Math.floor(i / 6) * 19, width: 14, height: 17 },
    confidence: .99, object_type: 'bottle', quality: { glare: 'low', occlusion: 'low', legibility: 'good' },
  })),
});
export const reading128 = index => {
  assert(Number.isInteger(index) && index >= 1 && index <= 30, 'Expected actual region_index from the client');
  if (index === 30) return { candidates: [], recognition_status: 'unreadable', fallback: {
    code: 'insufficient_visible_text', message: 'Controlled unreadable-region fixture.',
    suggested_actions: ['Haz una foto más cercana de esta etiqueta.'],
  } };
  const name = names128[(index - 1) % names128.length];
  return { candidates: [{ name, producer: 'QA Visual Estate', vintage: 2020, region: 'QA Region', country: 'ES',
    grapes: ['Tempranillo'], confidence: .94, source: 'label', evidence: [name, 'QA Visual Estate', '2020'],
    uncertainty_reasons: [], inferred_fields: ['sensory_attributes'], affinity: 99, affinity_confidence: .99,
    affinity_reason: 'Deliberately unverified fixture score: native UI must not present it as affinity.',
    sensory_attributes: { potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 4 },
  }] };
};
