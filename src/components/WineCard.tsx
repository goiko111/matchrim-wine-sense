import React from 'react';
import { Wine, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WinerimWineWithMatch } from '@/services/winerimApi';
import { formatWineType, formatCountryName } from '@/utils/wineFormatters';

interface WineCardProps {
  wine: WinerimWineWithMatch;
  index: number;
  isHighlighted?: boolean;
  setWineRef?: (id: string | number, ref: HTMLDivElement | null) => void;
}

const WineCard: React.FC<WineCardProps> = ({ wine, index, isHighlighted = false, setWineRef }) => {
  const formatCurrency = (currency: string | { name: string; symbol: string }): string => {
    if (typeof currency === 'string') {
      return currency;
    }
    return currency.symbol || currency.name || '';
  };

  const generateSlug = (wineName: string, vintage?: number | string) => {
    const nameSlug = wineName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .replace(/-+/g, '-')
      .trim();

    return vintage ? `${nameSlug}_${vintage}` : nameSlug;
  };

  const openInWinerim = () => {
    const slug = wine.slugname || generateSlug(wine.name, wine.vintage);
    const storeBaseUrl = import.meta.env.VITE_WINERIM_STORE_URL || import.meta.env.VITE_WINERIM_APP_URL || 'https://winerim.wine';
    const winerimUrl = `${storeBaseUrl.replace(/\/$/, '')}/matchrim/store/${wine.id}/${slug}`;
    window.open(winerimUrl, '_blank', 'noopener,noreferrer');
  };

  const getMatchInfo = (percentage: number) => {
    if (percentage >= 90) {
      return {
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-400',
        textColor: 'text-green-700',
        label: 'Coincidencia excelente'
      };
    } else if (percentage >= 80) {
      return {
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-700',
        label: 'Buena coincidencia'
      };
    } else if (percentage >= 70) {
      return {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-400',
        textColor: 'text-orange-700',
        label: 'Coincidencia aceptable'
      };
    } else {
      return {
        color: 'bg-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        textColor: 'text-gray-700',
        label: 'Coincidencia baja'
      };
    }
  };

  const matchInfo = getMatchInfo(wine.matchPercentage);

  return (
    <div
      ref={(node) => setWineRef?.(wine.id, node)}
      className={`bg-white rounded-xl border-2 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in ${
        isHighlighted
          ? 'border-red-500 ring-4 ring-red-300 ring-opacity-50'
          : 'border-red-100'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Wine Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
              {wine.photo ? (
                <img
                  src={wine.photo}
                  alt={`Botella de ${wine.name}`}
                  className="h-full w-full object-contain p-1"
                  loading="lazy"
                />
              ) : (
                <Wine className="h-6 w-6 text-red-700" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-xl leading-tight">
              {wine.name}
            </h4>
            {wine.section && (
              <p className="text-red-100 text-sm mt-1">{wine.section}</p>
            )}
            {wine.vintage && (
              <p className="text-red-100 text-sm mt-1">Añada: {wine.vintage}</p>
            )}
          </div>
        </div>
      </div>

      {/* Compatibility Bar */}
      <div className={`px-6 py-4 ${matchInfo.bgColor} border-b-2 ${matchInfo.borderColor}`}>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className={`h-5 w-5 ${matchInfo.textColor}`} />
          <span className={`text-sm font-semibold ${matchInfo.textColor} uppercase tracking-wide`}>
            {matchInfo.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`${matchInfo.color} h-full rounded-full transition-all duration-500`}
            style={{ width: `${wine.matchPercentage}%` }}
          />
        </div>
        <p className={`text-sm ${matchInfo.textColor} mt-2 font-medium`}>
          {wine.matchPercentage}% compatible con tu perfil sensorial
        </p>
      </div>

      {/* Wine Details */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wine.type && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="text-2xl flex-shrink-0 w-8 text-center">🍷</div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Tipo</div>
                <div className="text-gray-800 font-medium">{formatWineType(wine.type)}</div>
              </div>
            </div>
          )}

          {wine.winery && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-2xl flex-shrink-0 w-8 text-center">🏛️</div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Bodega</div>
                <div className="text-gray-800 font-medium">{wine.winery}</div>
              </div>
            </div>
          )}

          {wine.region && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl flex-shrink-0 w-8 text-center">📍</div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Región</div>
                <div className="text-gray-800 font-medium">{wine.region}</div>
              </div>
            </div>
          )}

          {wine.country && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-2xl flex-shrink-0 w-8 text-center">🌍</div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">País</div>
                <div className="text-gray-800 font-medium">{formatCountryName(wine.country)}</div>
              </div>
            </div>
          )}
        </div>

        {wine.grapes && wine.grapes.length > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-2xl flex-shrink-0 w-8 text-center">🍇</div>
            <div className="flex-1 text-left">
              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Uvas</div>
              <div className="text-gray-800 font-medium">{wine.grapes.join(', ')}</div>
            </div>
          </div>
        )}

        {wine.prices && wine.prices.length > 0 && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-l-4 border-emerald-400">
            <div className="text-2xl flex-shrink-0 w-8 text-center">💰</div>
            <div className="flex-1 text-left">
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Precio</div>
              <div className="text-gray-800 font-bold text-lg">
                {wine.prices[0].price} {formatCurrency(wine.prices[0].currency)}
              </div>
            </div>
          </div>
        )}

        {wine.tastingAttributes && (
          <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-l-4 border-indigo-400">
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3 text-left">Atributos de Cata</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Potencia:</span>
                <span className="font-semibold text-gray-800">{wine.tastingAttributes.power}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Acidez:</span>
                <span className="font-semibold text-gray-800">{wine.tastingAttributes.acidity}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Afrutado:</span>
                <span className="font-semibold text-gray-800">{wine.tastingAttributes.fruity}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dulzor:</span>
                <span className="font-semibold text-gray-800">{wine.tastingAttributes.sweetness}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taninos:</span>
                <span className="font-semibold text-gray-800">{wine.tastingAttributes.tannin}/5</span>
              </div>
            </div>
          </div>
        )}

        {/* Botón para ver en Winerim */}
        <div className="mt-4">
          <Button
            onClick={openInWinerim}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Ver en Winerim
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WineCard;
