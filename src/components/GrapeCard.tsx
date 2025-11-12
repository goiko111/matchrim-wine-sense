import React from 'react';

interface GrapeCardProps {
  grape: string;
  count: number;
  onClick: () => void;
  isHighlighted?: boolean;
}

const GrapeCard: React.FC<GrapeCardProps> = ({
  grape,
  count,
  onClick,
  isHighlighted = false
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer ${
        isHighlighted
          ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
          : 'border-purple-200 bg-white hover:border-purple-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl">🍇</div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{grape}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Encontrada en <span className="font-semibold text-purple-700">{count}</span>{' '}
            {count === 1 ? 'vino' : 'vinos'} compatibles
          </p>
        </div>
        <div className="text-purple-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default GrapeCard;
