// Pilot feedback (130): the prefilled email carries only what the tester saw; the app sends nothing.
// Run: npx tsx scripts/check-matchrim-pilot-feedback130.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pilotFeedbackHref130 } from '../src/utils/pilotFeedback130';

const parse = (href: string) => { const url = new URL(href); return { to: url.pathname, subject: url.searchParams.get('subject') ?? '', body: url.searchParams.get('body') ?? '' }; };
let passed = 0;
const check = (name: string, work: () => void) => { work(); passed++; console.log('PASS', name); };

check('profile mail goes to the public Winerim address with no scan data', () => {
  const mail = parse(pilotFeedbackHref130({ where: 'perfil' }));
  assert.equal(mail.to, 'hola@winerim.com'); assert.equal(mail.subject, 'Matchrim beta: comentario');
  assert(!mail.body.includes('Texto leído') && !mail.body.includes('Candidatos'));
});
check('candidate mail carries the text read, the candidates shown and the typed search, bounded', () => {
  const mail = parse(pilotFeedbackHref130({ where: 'candidatos', read: ['VIÑA  ARDANZA', '', 'RESERVA 2016'], shown: ['A (x)', 'B (y)', 'C', 'D', 'E', 'F'], searched: ' ardanza ' }));
  assert.equal(mail.subject, 'Matchrim beta: no reconoce mi vino');
  assert(mail.body.includes('Texto leído en la etiqueta: VIÑA ARDANZA / RESERVA 2016'));
  assert(mail.body.includes('Candidatos mostrados: A (x) · B (y) · C · D · E') && !mail.body.includes(' · F'));
  assert(mail.body.includes('Búsqueda escrita: ardanza'));
  const long = parse(pilotFeedbackHref130({ where: 'candidatos', read: ['x'.repeat(2000)] }));
  assert(long.body.length < 1000);
});
check('no photo, no account and no automatic send in the component', () => {
  const source = fs.readFileSync('src/components/PilotFeedback130.tsx', 'utf8');
  assert(source.includes('href={pilotFeedbackHref130(context)}'));
  assert(!/fetch\(|invoke|supabase|user\.id|email:/.test(source));
});
check('both entry points are wired: candidates (native local flow) and native Perfil', () => {
  const candidates = fs.readFileSync('src/components/wine-import/CandidateRecovery286.tsx', 'utf8');
  assert(candidates.includes("<PilotFeedback130 label={shown.length ? '¿Ninguno es tu vino? Avísanos' : 'Avísanos de este fallo'}"));
  const profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
  assert(profile.includes("{isNative && <div className=\"mt-3\"><PilotFeedback130 label=\"Enviar un comentario de la beta\" context={{ where: 'perfil' }} /></div>}"));
});
console.log(`${passed}/4 PASS`);
