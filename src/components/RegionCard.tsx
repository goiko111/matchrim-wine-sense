import React from 'react';

interface RegionCardProps {
  region: string;
  /** Afinidad media (0-1) de los vinos de esta región con el perfil. */
  affinity: number;
  /** Nº de vinos del universo afín de esta región. */
  support: number;
}

const RegionCard: React.FC<RegionCardProps> = ({ region, affinity, support }) => {
  const affinityPct = Math.round(affinity * 100);

  return (
    <div className="w-full text-left p-4 rounded-lg border-2 border-green-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🌍</div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{region}</h4>
          <p className="text-sm text-green-700 font-medium mt-1">Muy afín a tu paladar</p>
          <p className="text-xs text-gray-500 mt-0.5">
            afinidad {affinityPct}% · {support.toLocaleString('es-ES')} {support === 1 ? 'vino' : 'vinos'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegionCard;
