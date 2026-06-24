import React from 'react';

interface GrapeCardProps {
  grape: string;
  /** Afinidad media (0-1) de los vinos de esta uva con el perfil. */
  affinity: number;
  /** Nº de vinos del universo afín que contienen esta uva. */
  support: number;
}

const GrapeCard: React.FC<GrapeCardProps> = ({ grape, affinity, support }) => {
  const affinityPct = Math.round(affinity * 100);

  return (
    <div className="w-full text-left p-4 rounded-lg border-2 border-purple-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🍇</div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{grape}</h4>
          <p className="text-sm text-purple-700 font-medium mt-1">Muy afín a tu paladar</p>
          <p className="text-xs text-gray-500 mt-0.5">
            afinidad {affinityPct}% · {support.toLocaleString('es-ES')} {support === 1 ? 'vino' : 'vinos'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GrapeCard;
