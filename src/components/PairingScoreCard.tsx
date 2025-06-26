
import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PairingScoreCardProps {
  response: string;
}

const PairingScoreCard: React.FC<PairingScoreCardProps> = ({ response }) => {
  // Extract score from response (looking for patterns like "8/10", "7 de 10", etc.)
  const extractScore = (text: string): number | null => {
    const scorePatterns = [
      /(\d+)\/10/,
      /(\d+)\s*de\s*10/,
      /(\d+)\s*sobre\s*10/,
      /puntuación.*?(\d+)/i,
      /calificación.*?(\d+)/i
    ];
    
    for (const pattern of scorePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  const score = extractScore(response);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number | null) => {
    if (!score) return <Minus className="h-5 w-5" />;
    if (score >= 8) return <TrendingUp className="h-5 w-5" />;
    if (score >= 6) return <Minus className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return 'Sin puntuación';
    if (score >= 8) return 'Excelente maridaje';
    if (score >= 6) return 'Buen maridaje';
    return 'Maridaje mejorable';
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-red-900">Evaluación del Maridaje</h4>
        {score && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${getScoreColor(score)}`}>
              {getScoreIcon(score)}
              <span className="text-2xl font-bold">{score}</span>
              <span className="text-sm">/10</span>
            </div>
          </div>
        )}
      </div>
      
      {score && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i <= score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </span>
        </div>
      )}
    </div>
  );
};

export default PairingScoreCard;
