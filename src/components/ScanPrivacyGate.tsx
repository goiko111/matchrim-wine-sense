import { useState, type ReactNode } from 'react';
import { BrainCircuit, Camera, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const ACKNOWLEDGEMENT_KEY = 'matchrim.scan_privacy_notice.v2';

interface ScanPrivacyGateProps {
  children: ReactNode;
}

const hasAcknowledgedNotice = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ACKNOWLEDGEMENT_KEY) === 'accepted';
  } catch {
    return false;
  }
};

export const ScanPrivacyGate = ({ children }: ScanPrivacyGateProps) => {
  const [accepted, setAccepted] = useState(hasAcknowledgedNotice);
  const [checked, setChecked] = useState(false);

  if (accepted) return <>{children}</>;

  const continueToScanner = () => {
    if (!checked) return;
    try {
      window.localStorage.setItem(ACKNOWLEDGEMENT_KEY, 'accepted');
    } catch (error) {
      console.warn('[privacy] Could not persist scan notice:', error);
    }
    setAccepted(true);
  };

  return (
    <section className="matchrim-surface rounded-lg p-4 sm:p-6" aria-labelledby="scan-privacy-title">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 id="scan-privacy-title" className="text-lg font-semibold text-slate-950">Antes de analizar una imagen</h2>
          <p className="mt-1 text-sm leading-6 matchrim-muted">
            Elige solo fotos de etiquetas, botellas, cartas, pizarras, platos o expositores que quieras analizar.
          </p>
        </div>
      </div>

      <div className="matchrim-data-rail mt-4 divide-y divide-stone-200 rounded-lg px-3 text-sm sm:mt-5">
        <div className="flex gap-3 py-2 sm:py-3">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="leading-5 text-slate-700">Matchrim accede a la camara o a la foto que selecciones; no examina el resto de tu fototeca.</p>
        </div>
        <div className="flex gap-3 py-2 sm:py-3">
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="leading-5 text-slate-700">La imagen y sus recortes se envian a funciones de Matchrim y a proveedores de IA para detectar texto y vinos. No subas imagenes con personas o datos sensibles.</p>
        </div>
        <div className="flex gap-3 py-2 sm:py-3">
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="leading-5 text-slate-700">El original no se guarda en tu cuenta por defecto. Los resultados que confirmes si pueden guardarse en tu historial o lista de vinos.</p>
        </div>
      </div>

      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-700 sm:mt-5">
        <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} aria-label="He leido el aviso de privacidad del escaner" />
        <span>
          He leido este aviso y la{' '}
          <Link to="/privacy" className="font-semibold text-red-800 underline underline-offset-2">politica de privacidad</Link>.
        </span>
      </label>

      <Button
        type="button"
        className="matchrim-pressable mt-3 min-h-12 w-full bg-red-950 hover:bg-red-900 sm:mt-4"
        disabled={!checked}
        onClick={continueToScanner}
      >
        Entiendo y continuar
      </Button>
    </section>
  );
};
