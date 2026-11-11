import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 139: a place for the person's own words about a wine («lo tomamos en la boda de Ana», «mejor con carne»).
// It uses the existing personal_note column of their own row; nothing else reads it.
export const NativeWineNote139 = ({ wineId, initial }: { wineId: string; initial?: string | null }) => {
  const [saved, setSaved] = useState(initial ?? '');
  const [text, setText] = useState(initial ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const save = async () => {
    setState('saving');
    const value = text.trim();
    const { error } = await supabase.from('user_wines').update({ personal_note: value || null }).eq('id', wineId);
    if (error) { setState('error'); return; }
    setSaved(value); setText(value); setState('done');
  };
  return <section className="border-b border-stone-200 px-4 py-3" aria-labelledby={`note139-${wineId}`} data-testid="native-wine-note139">
    <h3 id={`note139-${wineId}`} className="text-sm font-semibold">Mi nota</h3>
    <textarea value={text} maxLength={500} rows={2} placeholder="Lo que quieras recordar de este vino" aria-labelledby={`note139-${wineId}`}
      onChange={event => { setText(event.target.value); if (state !== 'saving') setState('idle'); }}
      className="mt-2 w-full min-w-0 resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 outline-none focus:border-red-900" />
    <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
      <p role="status" className={`text-xs ${state === 'error' ? 'text-red-800' : 'text-stone-500'}`}>{state === 'done' ? 'Nota guardada.' : state === 'error' ? 'No se pudo guardar. Inténtalo de nuevo.' : ''}</p>
      {text.trim() !== saved && <button type="button" disabled={state === 'saving'} className="min-h-11 rounded-md bg-red-900 px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void save()}>{state === 'saving' ? 'Guardando…' : 'Guardar nota'}</button>}
    </div>
  </section>;
};
