
import React from 'react';
import { Wine, Star, Thermometer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AIResponseCardProps {
  response: string;
  queryType: 'dish-to-wine' | 'wine-to-dish' | 'pairing-check';
}

const AIResponseCard: React.FC<AIResponseCardProps> = ({ response, queryType }) => {
  // Extract score if it's a pairing check
  const extractScore = (text: string): number | null => {
    const scorePatterns = [
      /(\d+)\/10/,
      /(\d+)\s*de\s*10/,
      /(\d+)\s*sobre\s*10/,
      /puntuación.*?(\d+)/i,
    ];
    
    for (const pattern of scorePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  const score = queryType === 'pairing-check' ? extractScore(response) : null;

  const getScoreEmoji = (score: number | null) => {
    if (!score) return '';
    if (score >= 8) return '🎯';
    if (score >= 6) return '👍';
    return '🤔';
  };

  const formatResponse = (text: string) => {
    const sections = text.split('\n\n').filter(section => section.trim());
    
    return sections.map((section, index) => {
      // Check for numbered sections
      if (section.match(/^\d+\./)) {
        const [title, ...content] = section.split(':');
        return (
          <div key={index} className="mb-4">
            <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-800 text-sm">
                {index + 1}
              </div>
              {title.replace(/^\d+\./, '').trim()}
            </h4>
            {content.length > 0 && (
              <p className="text-gray-700 leading-relaxed ml-8 font-light">
                {content.join(':').trim()}
              </p>
            )}
          </div>
        );
      }

      // Check for wine examples
      if (section.toLowerCase().includes('ejemplo') || section.toLowerCase().includes('vino')) {
        return (
          <div key={index} className="mb-4 p-3 bg-red-50 rounded-lg border-l-3 border-red-300">
            <div className="flex items-start gap-2">
              <Wine className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
              <p className="text-gray-800 leading-relaxed font-light">{section}</p>
            </div>
          </div>
        );
      }

      // Check for temperature/serving info
      if (section.toLowerCase().includes('temperatura') || section.toLowerCase().includes('servir')) {
        return (
          <div key={index} className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Thermometer className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <p className="text-gray-800 leading-relaxed font-light">{section}</p>
            </div>
          </div>
        );
      }

      // Default paragraph
      return (
        <p key={index} className="mb-4 text-gray-800 leading-relaxed font-light">
          {section}
        </p>
      );
    });
  };

  return (
    <Card className="border-red-200 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
            <Wine className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-900">
              Recomendación del sommelier
            </h3>
            {score && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{getScoreEmoji(score)}</span>
                <span className="text-lg font-medium text-red-800">{score}/10</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {formatResponse(response)}
        </div>

        <div className="mt-6 pt-4 border-t border-red-100">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <Star className="h-4 w-4" />
            <span className="font-light">Generado por Inteligencia Líquida</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIResponseCard;
