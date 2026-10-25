import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nativeIdentityDraft218, validateNativeIdentity218, type IdentityValidation218, type NativeIdentity218 } from '@/utils/nativeIdentityCorrection218';

interface Props {
  identity: NativeIdentity218;
  disabled: boolean;
  onApply: (identity: NativeIdentity218) => void;
}
const draftFrom = nativeIdentityDraft218;

export const NativeLabelIdentityEditor218 = ({ identity, disabled, onApply }: Props) => {
  const [draft, setDraft] = useState(() => draftFrom(identity));
  const [error, setError] = useState<Extract<IdentityValidation218, { ok: false }> | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const { name, producer, vintage } = identity;
  useEffect(() => {
    setDraft(draftFrom({ name, producer, vintage })); setError(null);
  }, [name, producer, vintage]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(identity));
  const reset = () => { setDraft(draftFrom(identity)); setError(null); };
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const checked = validateNativeIdentity218(draft);
    if (checked.ok === false) {
      setError(checked);
      form.current?.querySelector<HTMLInputElement>(`[name="correction-${checked.field}"]`)?.focus();
      return;
    }
    setError(null); setDraft(draftFrom(checked.identity)); onApply(checked.identity);
  };
  return <form ref={form} onSubmit={apply} noValidate className="min-w-0 space-y-3" aria-label="Corregir vino y añada" data-testid="native-identity-editor218">
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium text-slate-800">Vino
        <Input id="region-wine-name" name="correction-name" maxLength={240} disabled={disabled} autoComplete="off"
          aria-invalid={error?.field === 'name'} aria-describedby={error?.field === 'name' ? 'identity-correction-error218' : undefined}
          className="mt-1 min-h-11 min-w-0" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
      </label>
      <label className="min-w-0 text-sm font-medium text-slate-800">Bodega
        <Input name="correction-producer" maxLength={240} disabled={disabled} autoComplete="off"
          aria-invalid={error?.field === 'producer'} aria-describedby={error?.field === 'producer' ? 'identity-correction-error218' : undefined}
          className="mt-1 min-h-11 min-w-0" value={draft.producer} onChange={event => setDraft(current => ({ ...current, producer: event.target.value }))} />
      </label>
      <label className="min-w-0 text-sm font-medium text-slate-800">Añada (opcional)
        <Input name="correction-vintage" inputMode="numeric" maxLength={4} disabled={disabled} autoComplete="off"
          aria-invalid={error?.field === 'vintage'} aria-describedby={error?.field === 'vintage' ? 'identity-correction-error218' : undefined}
          className="mt-1 min-h-11 min-w-0" value={draft.vintage} onChange={event => setDraft(current => ({ ...current, vintage: event.target.value }))} />
      </label>
    </div>
    {dirty && <p role="status" className="text-sm leading-6 text-stone-700">Cambios sin aplicar</p>}
    {error && <p id="identity-correction-error218" role="alert" className="text-sm leading-6 text-red-900">{error.message}</p>}
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      <Button type="submit" disabled={disabled || !dirty} className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal px-3 py-3 text-left">
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">Aplicar corrección</span>
      </Button>
      {dirty && <Button type="button" variant="outline" disabled={disabled} onClick={reset} className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal px-3 py-3 text-left">
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">Descartar cambios</span>
      </Button>}
    </div>
  </form>;
};
