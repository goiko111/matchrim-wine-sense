import React from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ExternalLink, QrCode, ScanLine, Share2, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalMatchrimQr } from '@/utils/matchrimLocalQr';
import {
  buildMatchrimShareUrl,
  buildWinerimCartaUrl,
  generateMatchrimCode,
  type MatchrimProfileLike,
} from '@/utils/matchrimPassport';

interface MatchrimPassportProps {
  profile: MatchrimProfileLike;
  codeOverride?: string;
  compact?: boolean;
  className?: string;
  showUseAction?: boolean;
  showRestaurantAction?: boolean;
}

const MatchrimPassport: React.FC<MatchrimPassportProps> = ({
  profile,
  codeOverride,
  compact = false,
  className = '',
  showUseAction = true,
  showRestaurantAction = true,
}) => {
  const navigate = useNavigate();
  const native = Capacitor.isNativePlatform();
  const code = codeOverride || generateMatchrimCode(profile);
  const shareUrl = buildMatchrimShareUrl(profile, code);
  const winerimUrl = buildWinerimCartaUrl(profile, code);
  const qrUrl = React.useMemo(() => buildLocalMatchrimQr(shareUrl), [shareUrl]);
  const [codeGrape, ...codeCharacterParts] = code.split(' ');
  const codeCharacter = codeCharacterParts.join(' ');

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success('Código Matchrim copiado');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Enlace del pasaporte copiado');
  };

  const sharePassport = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Mi código Matchrim: ${code}`,
        text: `Este es mi código Matchrim para filtrar cartas Winerim: ${code}`,
        url: shareUrl,
      });
      return;
    }

    await copyLink();
  };

  const nativeCopyCode = async () => {
    try { await copyCode(); }
    catch { toast.error('No se pudo copiar el código. Puedes volver a intentarlo.'); }
  };

  const nativeSharePassport = async () => {
    try { await sharePassport(); }
    catch (failure) {
      if (failure instanceof Error && failure.name === 'AbortError') return;
      toast.error('No se pudo compartir el pasaporte. Puedes volver a intentarlo.');
    }
  };

  return (
    <Card className={native ? `min-w-0 rounded-none border-0 bg-transparent shadow-none ${className}` : `border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 shadow-md ${className}`} data-testid={native ? 'native-matchrim-passport' : undefined}>
      <CardContent className={native ? 'min-w-0 p-0' : compact ? 'p-4' : 'p-6'}>
        <div className={native ? 'grid min-w-0 gap-6' : 'grid gap-6 md:grid-cols-[1fr_auto] md:items-center'}>
          <div className={native ? 'min-w-0 space-y-4' : 'space-y-4'}>
            {native ? <p className="text-sm font-semibold text-stone-600">Pasaporte Matchrim</p> :
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-red-800 text-white hover:bg-red-800">
                Pasaporte Matchrim
              </Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-800">
                Winerim ready
              </Badge>
            </div>}

            <div>
              <p className={native ? 'text-sm font-medium text-stone-600' : 'text-sm font-medium uppercase tracking-wide text-red-700'}>
                {native ? 'Tu código Matchrim' : 'Tu código para filtrar cartas'}
              </p>
              <div className={native ? 'mt-[8px] grid min-w-0 grid-cols-1 gap-[8px]' : 'mt-2 flex flex-wrap items-center gap-3'}>
                <h3 className={native ? 'min-w-0 break-words text-lg font-bold leading-relaxed text-red-950 [overflow-wrap:anywhere]' : 'text-3xl font-bold text-red-950'}>{code}</h3>
                <Button variant="outline" size="icon" onClick={native ? nativeCopyCode : copyCode} aria-label="Copiar código Matchrim" title={native ? 'Copiar código Matchrim' : undefined} className={native ? 'h-[44px] w-[44px] shrink-0 justify-self-end p-0' : 'h-11 w-11'}>
                  <Copy className={native ? 'h-[20px] w-[20px]' : 'h-4 w-4'} />
                </Button>
              </div>
              {native ? <p className="mt-2 text-sm leading-6 text-stone-600">Basado en tu test de paladar.</p> : <p className="mt-2 max-w-2xl text-sm text-red-900">
                Tu código une una uva que representa tu rasgo dominante
                {codeGrape ? ` (${codeGrape})` : ''} con un carácter de vino
                {codeCharacter ? ` (${codeCharacter})` : ''}. Así es fácil recordarlo y decirlo en mesa.
              </p>}
              {!native && !compact && (
                <p className="mt-3 max-w-2xl text-sm text-gray-700">
                  Usa este código en cualquier carta Winerim para ver primero los vinos que encajan con tu paladar.
                  Si el restaurante no usa Winerim, escanea su carta y te diremos cuáles son tus mejores opciones.
                </p>
              )}
            </div>

            {native ? <details className="min-w-0 border-y border-stone-200 py-2">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-slate-800">Rasgos del test</summary>
              <dl className="min-w-0 divide-y divide-stone-100 text-sm">
                {[['Potencia', profile.potente], ['Acidez', profile.acidez], ['Dulzor', profile.dulce], ['Tanino', profile.tanico], ['Fruta', profile.afrutado]].map(([label, value]) =>
                  <div className="flex min-w-0 flex-wrap justify-between gap-2 py-2" key={label}><dt>{label}</dt><dd className="tabular-nums text-stone-600">{value}/5</dd></div>)}
              </dl>
            </details> : <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-md bg-white p-2 shadow-sm">
                <div className="font-bold text-red-900">{profile.potente}</div>
                <div className="text-gray-500">Potencia</div>
              </div>
              <div className="rounded-md bg-white p-2 shadow-sm">
                <div className="font-bold text-red-900">{profile.acidez}</div>
                <div className="text-gray-500">Acidez</div>
              </div>
              <div className="rounded-md bg-white p-2 shadow-sm">
                <div className="font-bold text-red-900">{profile.dulce}</div>
                <div className="text-gray-500">Dulzor</div>
              </div>
              <div className="rounded-md bg-white p-2 shadow-sm">
                <div className="font-bold text-red-900">{profile.tanico}</div>
                <div className="text-gray-500">Tanino</div>
              </div>
              <div className="rounded-md bg-white p-2 shadow-sm">
                <div className="font-bold text-red-900">{profile.afrutado}</div>
                <div className="text-gray-500">Fruta</div>
              </div>
            </div>}

            <div className={native ? 'grid min-w-0 gap-2 [&_button]:h-auto [&_button]:min-h-[44px] [&_button]:min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal' : 'flex flex-wrap gap-2'}>
              {showUseAction && (
                <Button onClick={() => navigate('/usar-matchrim')} className="min-h-11 gap-2 bg-red-800 hover:bg-red-900">
                  <ScanLine className="h-4 w-4" />
                  Usar en restaurante
                </Button>
              )}
              <Button variant="outline" onClick={native ? nativeSharePassport : sharePassport} className="min-h-11 gap-2">
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
              <Button variant="outline" onClick={() => window.open(winerimUrl, '_blank', 'noopener,noreferrer')} className="min-h-11 gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir Winerim
              </Button>
            </div>
          </div>

          {native && showRestaurantAction ? <details className="min-w-0 border-t border-stone-200 pt-2">
            <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-800"><QrCode className="h-[20px] w-[20px] shrink-0" />Ver mi QR</summary>
            <img src={qrUrl} alt={`QR del pasaporte Matchrim ${code}`} className="mx-auto my-3 aspect-square w-[160px] max-w-full" />
            <p className="text-xs leading-5 text-stone-600">El QR y el enlace compartido incluyen los cinco valores de tu test.</p>
          </details> : showRestaurantAction && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-red-100 bg-white p-3 shadow-sm">
              <img src={qrUrl} alt={`QR del pasaporte Matchrim ${code}`} className="h-36 w-36" />
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <QrCode className="h-3.5 w-3.5" />
                Pasaporte QR
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-red-800">
                <Wine className="h-3.5 w-3.5" />
                {code}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchrimPassport;
