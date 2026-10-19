import { useState, type ReactNode } from 'react';
import { BrainCircuit, Camera, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Capacitor } from '@capacitor/core';

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
  const isNative = Capacitor.isNativePlatform();
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
    <section className={isNative ? 'matchrim-native-scan-privacy matchrim-surface min-w-0 rounded-lg p-[12px]' : 'matchrim-surface rounded-lg p-4 sm:p-6'} aria-labelledby="scan-privacy-title">
      <div className={isNative ? 'grid min-w-0 gap-[8px]' : 'flex items-start gap-3'}>
        <div className={isNative ? 'flex h-[44px] w-[44px] items-center justify-center rounded-full bg-emerald-50 text-emerald-800' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800'}>
          <ShieldCheck className="h-5 w-5" style={isNative ? { width: 20, height: 20 } : undefined} aria-hidden={isNative ? true : undefined} focusable={isNative ? false : undefined} />
        </div>
        <div className={isNative ? 'min-w-0 w-full' : undefined}>
          <h2 id="scan-privacy-title" className={isNative ? 'min-w-0 text-lg font-semibold text-slate-950 [overflow-wrap:normal]' : 'text-lg font-semibold text-slate-950'}>Antes de analizar una imagen</h2>
          <p className={isNative ? 'mt-[4px] min-w-0 text-sm leading-relaxed matchrim-muted [overflow-wrap:normal]' : 'mt-1 text-sm leading-6 matchrim-muted'}>
            Elige solo fotos de etiquetas, botellas, cartas, pizarras, platos o expositores que quieras analizar.
          </p>
        </div>
      </div>

      <div className={isNative ? 'matchrim-data-rail mt-[16px] min-w-0 divide-y divide-slate-200 px-[4px] text-sm' : 'matchrim-data-rail mt-4 divide-y divide-slate-200 px-1 text-sm sm:mt-5'}>
        <div className={isNative ? 'grid min-w-0 gap-[8px] py-[12px]' : 'flex gap-3 py-2 sm:py-3'}>
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" style={isNative ? { width: 20, height: 20 } : undefined} aria-hidden={isNative ? true : undefined} focusable={isNative ? false : undefined} />
          <p className={isNative ? 'min-w-0 w-full leading-relaxed text-slate-700 [overflow-wrap:normal]' : 'leading-5 text-slate-700'}>Matchrim accede a la cámara o a la foto que selecciones; no examina el resto de tu fototeca.</p>
        </div>
        <div className={isNative ? 'grid min-w-0 gap-[8px] py-[12px]' : 'flex gap-3 py-2 sm:py-3'}>
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" style={isNative ? { width: 20, height: 20 } : undefined} aria-hidden={isNative ? true : undefined} focusable={isNative ? false : undefined} />
          <p className={isNative ? 'min-w-0 w-full leading-relaxed text-slate-700 [overflow-wrap:normal]' : 'leading-5 text-slate-700'}>La imagen y sus recortes se envían a funciones de Matchrim y a proveedores de IA para detectar texto y vinos. No subas imágenes con personas o datos sensibles.</p>
        </div>
        <div className={isNative ? 'grid min-w-0 gap-[8px] py-[12px]' : 'flex gap-3 py-2 sm:py-3'}>
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" style={isNative ? { width: 20, height: 20 } : undefined} aria-hidden={isNative ? true : undefined} focusable={isNative ? false : undefined} />
          <p className={isNative ? 'min-w-0 w-full leading-relaxed text-slate-700 [overflow-wrap:normal]' : 'leading-5 text-slate-700'}>El original no se guarda en tu cuenta por defecto. Los resultados que confirmes sí pueden guardarse en tu historial o lista de vinos.</p>
        </div>
      </div>

      <label className={isNative ? 'mt-[16px] grid min-w-0 min-h-[44px] cursor-pointer gap-[8px] text-sm text-slate-700' : 'mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-700 sm:mt-5'}>
        <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} aria-label="He leído el aviso de privacidad del escáner" className={isNative ? 'h-[44px] w-[44px] [&_svg]:h-[20px] [&_svg]:w-[20px]' : undefined} />
        <span className={isNative ? 'min-w-0 w-full [overflow-wrap:normal]' : undefined}>
          He leído este aviso y la{' '}
          <Link to="/privacy" className={isNative ? 'inline-block min-h-[44px] max-w-full py-[8px] font-semibold text-red-800 underline underline-offset-2' : 'font-semibold text-red-800 underline underline-offset-2'}>política de privacidad</Link>.
        </span>
      </label>

      <Button
        type="button"
        className={isNative ? 'matchrim-pressable mt-[12px] h-auto min-h-[44px] min-w-0 w-full whitespace-normal bg-red-900 px-[12px] py-[12px] hover:bg-red-800' : 'matchrim-pressable mt-3 min-h-12 w-full bg-red-900 hover:bg-red-800 sm:mt-4'}
        disabled={!checked}
        onClick={continueToScanner}
      >
        Entiendo y continuar
      </Button>
    </section>
  );
};
