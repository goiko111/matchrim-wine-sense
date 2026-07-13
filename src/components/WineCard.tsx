import React from 'react';
import { Wine, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buildWinerimWineUrl, WinerimWineWithMatch } from '@/services/winerimApi';
import { formatWineType, formatCountryName } from '@/utils/wineFormatters';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { buildAffinityInsights } from '@/utils/wineAffinityExplanation';
import { getWinerimPriceDisplay } from '@/utils/winerimPrice';

interface WineCardProps {
  wine: WinerimWineWithMatch;
  index: number;
  isHighlighted?: boolean;
  setWineRef?: (id: string | number, ref: HTMLDivElement | null) => void;
  profile?: MatchrimProfileLike | null;
}

const WineCard: React.FC<WineCardProps> = ({ wine, index, isHighlighted = false, setWineRef, profile }) => {
  const openInWinerim = () => {
    window.open(buildWinerimWineUrl(wine), '_blank', 'noopener,noreferrer');
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
  const affinityInsights = buildAffinityInsights(profile, wine.tastingAttributes);
  const tastingBars = wine.tastingAttributes
    ? [
        { label: 'Potencia', value: wine.tastingAttributes.power, color: 'bg-red-900' },
        { label: 'Acidez', value: wine.tastingAttributes.acidity, color: 'bg-amber-500' },
        { label: 'Fruta', value: wine.tastingAttributes.fruity, color: 'bg-purple-700' },
        { label: 'Dulzor', value: wine.tastingAttributes.sweetness, color: 'bg-rose-400' },
        { label: 'Tanino', value: wine.tastingAttributes.tannin, color: 'bg-stone-800' },
      ]
    : [];
  const normalizeBarWidth = (value: number) => `${Math.max(0, Math.min(100, (Number(value) / 5) * 100))}%`;
  const priceDisplay = getWinerimPriceDisplay(wine);

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
      <div className="bg-red-950 px-6 py-4">
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
      <div className={`px-6 py-4 ${matchInfo.bgColor} border-b ${matchInfo.borderColor}`}>
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
        {affinityInsights && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {affinityInsights.positiveText && (
              <div className="rounded-md border border-green-100 bg-white/75 p-3 text-green-900">
                <span className="font-semibold">Suma porque </span>
                {affinityInsights.positiveText} están cerca de tu gusto.
              </div>
            )}
            {affinityInsights.negativeText && (
              <div className="rounded-md border border-amber-100 bg-white/75 p-3 text-amber-950">
                <span className="font-semibold">No es perfecto porque </span>
                {affinityInsights.negativeText}
              </div>
            )}
          </div>
        )}
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

        {priceDisplay && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <div className="text-2xl flex-shrink-0 w-8 text-center">💰</div>
            <div className="flex-1 text-left">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Precio Winerim
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
                  {priceDisplay.kindLabel}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Restaurante</p>
                  <p className="text-lg font-bold text-gray-900">{priceDisplay.restaurantPrice}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tienda online est.</p>
                  <p className="text-lg font-bold text-gray-900">{priceDisplay.onlineEstimate}</p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-900">{priceDisplay.helper}</p>
            </div>
          </div>
        )}

        {tastingBars.length > 0 && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="mb-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Perfil sensorial del vino</div>
            <div className="grid gap-2">
              {tastingBars.map((attribute) => (
                <div key={attribute.label} className="grid grid-cols-[5.25rem_1fr] items-center gap-3">
                  <span className="text-xs font-semibold text-stone-600">{attribute.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200" aria-label={`${attribute.label}: ${attribute.value} de 5`}>
                    <div
                      className={`h-full rounded-full ${attribute.color}`}
                      style={{ width: normalizeBarWidth(attribute.value) }}
                    />
                  </div>
                </div>
              ))}
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
