import React from 'react';

interface GrapeCardProps {
  grape: string;
  /** Afinidad media (0-1) de los vinos de esta uva con el perfil. */
  affinity?: number;
  /** Nº de vinos del universo afín que contienen esta uva. */
  support?: number;
  /** Compat: número de vinos usado por QuizResults (equivalente a support). */
  count?: number;
  onClick?: () => void;
  isHighlighted?: boolean;
}

const GrapeCard: React.FC<GrapeCardProps> = ({ grape, affinity, support, count, onClick, isHighlighted }) => {
  const effectiveSupport = support ?? count ?? 0;
  const affinityPct = typeof affinity === 'number' ? Math.round(affinity * 100) : null;


  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`w-full text-left p-4 rounded-lg border-2 bg-white ${onClick ? 'cursor-pointer' : ''} ${isHighlighted ? 'border-purple-500 shadow-md' : 'border-purple-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">🍇</div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{grape}</h4>
          <p className="text-sm text-purple-700 font-medium mt-1">Muy afín a tu paladar</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {affinityPct !== null ? `afinidad ${affinityPct}% · ` : ''}
            {effectiveSupport.toLocaleString('es-ES')} {effectiveSupport === 1 ? 'vino' : 'vinos'}
          </p>
        </div>
      </div>
    </div>
  );
};


export default GrapeCard;
