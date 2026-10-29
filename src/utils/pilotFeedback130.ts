// Pilot feedback (130): a prefilled email the tester opens and edits in their own mail app.
// Nothing is sent by the app; no photo is attached; the text read and the candidates shown
// are included only so the tester can say what went wrong.
export const PILOT_FEEDBACK_ADDRESS130 = 'hola@winerim.com';

export type PilotFeedbackContext130 = Readonly<{
  where: 'perfil' | 'candidatos';
  read?: readonly string[];
  shown?: readonly string[];
  searched?: string;
}>;

const clip = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const pilotFeedbackHref130 = (context: PilotFeedbackContext130) => {
  const subject = context.where === 'candidatos' ? 'Matchrim beta: no reconoce mi vino' : 'Matchrim beta: comentario';
  const lines = context.where === 'candidatos'
    ? ['¿Qué vino era? (nombre, bodega y añada de la etiqueta):', '', '¿Qué esperabas que pasara?', '', '']
    : ['Cuéntanos qué has probado y qué ha fallado o qué mejorarías:', '', '', ''];
  const read = (context.read ?? []).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (read.length) lines.push(`Texto leído en la etiqueta: ${clip(read.join(' / '), 400)}`);
  const shown = (context.shown ?? []).filter(Boolean).slice(0, 5);
  if (shown.length) lines.push(`Candidatos mostrados: ${clip(shown.join(' · '), 400)}`);
  if (context.searched?.trim()) lines.push(`Búsqueda escrita: ${clip(context.searched.trim(), 100)}`);
  lines.push('', 'Puedes adjuntar una foto de la etiqueta si quieres; la app no la envía.');
  return `mailto:${PILOT_FEEDBACK_ADDRESS130}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
};
