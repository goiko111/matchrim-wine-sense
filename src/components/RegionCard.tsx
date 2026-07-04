import React from 'react';

interface RegionCardProps {
  region: string;
  /** Afinidad media (0-1) de los vinos de esta región con el perfil. */
  affinity?: number;
  /** Nº de vinos del universo afín de esta región. */
  support?: number;
  /** Compat: país y contadores usados por QuizResults. */
  country?: string;
  count?: number;
  avgMatch?: number;
  onClick?: () => void;
  isHighlighted?: boolean;
}

const RegionCard: React.FC<RegionCardProps> = ({
  region,
  affinity,
  support,
  country,
  count,
  avgMatch,
  onClick,
  isHighlighted,
}) => {
  const effectiveSupport = support ?? count ?? 0;
  const effectiveAffinity =
    typeof affinity === 'number'
      ? Math.round(affinity * 100)
      : typeof avgMatch === 'number'
        ? Math.round(avgMatch > 1 ? avgMatch : avgMatch * 100)
        : null;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`w-full text-left p-4 rounded-lg border-2 bg-white ${onClick ? 'cursor-pointer' : ''} ${isHighlighted ? 'border-green-500 shadow-md' : 'border-green-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">🌍</div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{region}</h4>
          {country && <p className="text-xs text-gray-500">{country}</p>}
          <p className="text-sm text-green-700 font-medium mt-1">Muy afín a tu paladar</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {effectiveAffinity !== null ? `afinidad ${effectiveAffinity}% · ` : ''}
            {effectiveSupport.toLocaleString('es-ES')} {effectiveSupport === 1 ? 'vino' : 'vinos'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegionCard;
