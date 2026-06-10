import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ExternalLink, QrCode, ScanLine, Share2, Wine } from 'lucide-react';
import { toast } from 'sonner';
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
  const code = codeOverride || generateMatchrimCode(profile);
  const shareUrl = buildMatchrimShareUrl(profile, code);
  const winerimUrl = buildWinerimCartaUrl(profile, code);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(shareUrl)}`;
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

  return (
    <Card className={`border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 shadow-md ${className}`}>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-red-800 text-white hover:bg-red-800">
                Pasaporte Matchrim
              </Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-800">
                Winerim ready
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-red-700">
                Tu código para filtrar cartas
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h3 className="text-3xl font-bold text-red-950">{code}</h3>
                <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copiar código Matchrim">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-red-900">
                Tu código une una uva que representa tu rasgo dominante
                {codeGrape ? ` (${codeGrape})` : ''} con un carácter de vino
                {codeCharacter ? ` (${codeCharacter})` : ''}. Así es fácil recordarlo y decirlo en mesa.
              </p>
              {!compact && (
                <p className="mt-3 max-w-2xl text-sm text-gray-700">
                  Usa este código en cualquier carta Winerim para ver primero los vinos que encajan con tu paladar.
                  Si el restaurante no usa Winerim, escanea su carta y te diremos cuáles son tus mejores opciones.
                </p>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
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
            </div>

            <div className="flex flex-wrap gap-2">
              {showUseAction && (
                <Button onClick={() => navigate('/usar-matchrim')} className="gap-2 bg-red-800 hover:bg-red-900">
                  <ScanLine className="h-4 w-4" />
                  Usar en restaurante
                </Button>
              )}
              <Button variant="outline" onClick={sharePassport} className="gap-2">
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
              <Button variant="outline" onClick={() => window.open(winerimUrl, '_blank', 'noopener,noreferrer')} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir Winerim
              </Button>
            </div>
          </div>

          {showRestaurantAction && (
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
