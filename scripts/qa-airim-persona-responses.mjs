import fs from 'node:fs/promises';
import path from 'node:path';

const parseEnv = (content) => Object.fromEntries(
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      return [line.slice(0, separator), value];
    }),
);

const env = parseEnv(await fs.readFile('.env', 'utf8'));
const baseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!baseUrl || !anonKey) {
  throw new Error('Missing Supabase public runtime configuration');
}

const question = [
  'Voy a cenar arroz de setas y verduras asadas, con un presupuesto máximo de 30 euros.',
  'Recomiéndame una opción principal, una alternativa segura y una exploratoria.',
  'Explica coincidencias, posibles fricciones, confianza y qué dato falta. No inventes disponibilidad ni precio exacto.',
].join(' ');

const personas = [
  {
    id: 'explorador-atlantico',
    context: 'Perfil activo 0-5: potencia 2, acidez 5, dulzura 1, taninos 1, fruta 4. Aprendizaje basado en 7 valoraciones explícitas; confianza 58%. Prefiere blancos atlánticos frescos y rechaza tintos muy estructurados.',
  },
  {
    id: 'clasico-estructurado',
    context: 'Perfil activo 0-5: potencia 5, acidez 3, dulzura 1, taninos 5, fruta 3. Aprendizaje basado en 3 valoraciones explícitas; confianza 25%. Prefiere tintos clásicos estructurados y rechaza blancos redondos.',
  },
  {
    id: 'principiante-frutal',
    context: 'Perfil activo 0-5: potencia 2, acidez 3, dulzura 2, taninos 1, fruta 5. Aprendizaje basado en 3 valoraciones explícitas; confianza 25%. Prefiere tintos ligeros y frutales y rechaza tintos muy estructurados.',
  },
];

const results = [];

for (const persona of personas) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/functions/v1/ai-wine-chat`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: question,
      context: [
        'QA anónima de aiRIM; no crear ni modificar cuentas o datos de usuario.',
        persona.context,
        'Separa explícitamente dato aportado, inferencia y preferencia aprendida.',
        'Expresa la confianza solo como alta, media o baja y explica el motivo; no inventes porcentajes de confianza.',
        'No afirmes precio, disponibilidad, añada ni identidad concreta sin una fuente disponible.',
        'Cuando el presupuesto sea relevante, recuerda verificar el precio actual.',
        'Indica el dato que falta y cómo podría cambiar la recomendación. Responde en español y de forma concisa.',
      ].join('\n'),
    }),
  });

  const payload = await response.json();
  results.push({
    persona: persona.id,
    status: response.status,
    latencyMs: Date.now() - startedAt,
    success: Boolean(response.ok && payload.success),
    response: payload.response || null,
    error: payload.error || null,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  question,
  anonymous: true,
  productionWrites: false,
  results,
};

const outputPath = process.argv[2] || 'qa-artifacts/2026-09-28-build64-testflight/airim-persona-responses.json';
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

for (const result of results) {
  console.log(`${result.persona}: ${result.success ? 'PASS' : 'FAIL'} (${result.status}, ${result.latencyMs} ms)`);
}

const hasFalsePrecision = results.some((result) => (result.response || '')
  .split(/\r?\n/)
  .some((line) => (
    /confianza/i.test(line)
    && !/aprendizaje/i.test(line)
    && /(\d{1,3}\s*%|\d+(?:[.,]\d+)?\s*\/\s*10)/.test(line)
  )));
if (hasFalsePrecision) console.error('FAIL: aiRIM returned an unsupported confidence percentage');

if (results.some((result) => !result.success) || hasFalsePrecision) process.exitCode = 1;
