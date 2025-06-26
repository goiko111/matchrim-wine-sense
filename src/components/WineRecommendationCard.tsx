import React from 'react';
import { Wine, Star, Thermometer, Clock, PartyPopper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WineRecommendationCardProps {
  response: string;
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';
}

const WineRecommendationCard: React.FC<WineRecommendationCardProps> = ({ response, functionType }) => {
  // Parse the response to extract structured information
  const parseResponse = (text: string) => {
    const sections = text.split('\n\n').filter(section => section.trim());
    return sections.map(section => section.trim());
  };

  const sections = parseResponse(response);
  
  const getIconForFunction = () => {
    switch (functionType) {
      case 'wine-for-dish':
        return <Wine className="h-5 w-5 text-red-700" />;
      case 'dish-for-wine':
        return <Clock className="h-5 w-5 text-red-700" />;
      case 'pairing-check':
        return <Star className="h-5 w-5 text-red-700" />;
      case 'special-moments':
        return <PartyPopper className="h-5 w-5 text-red-700" />;
      default:
        return <Wine className="h-5 w-5 text-red-700" />;
    }
  };

  const formatSection = (section: string, index: number) => {
    // Check if it's a numbered list item
    if (section.match(/^\d+\./)) {
      const [title, ...content] = section.split(':');
      return (
        <div key={index} className="mb-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-800 text-sm font-semibold mt-0.5">
              {index + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                {title.replace(/^\d+\./, '').trim()}
              </h4>
              {content.length > 0 && (
                <p className="text-gray-700 leading-relaxed">
                  {content.join(':').trim()}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Check for wine examples or recommendations
    if (section.toLowerCase().includes('ejemplo') || section.toLowerCase().includes('recomendación')) {
      return (
        <div key={index} className="mb-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-300">
          <div className="flex items-start gap-2">
            <Wine className="h-4 w-4 text-red-600 mt-1" />
            <p className="text-gray-800 leading-relaxed">{section}</p>
          </div>
        </div>
      );
    }

    // Check for temperature or serving suggestions
    if (section.toLowerCase().includes('temperatura') || section.toLowerCase().includes('servir')) {
      return (
        <div key={index} className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Thermometer className="h-4 w-4 text-blue-600 mt-1" />
            <p className="text-gray-800 leading-relaxed">{section}</p>
          </div>
        </div>
      );
    }

    // Default paragraph formatting
    return (
      <div key={index} className="mb-3">
        <p className="text-gray-800 leading-relaxed">{section}</p>
      </div>
    );
  };

  return (
    <Card className="border-red-200 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          {getIconForFunction()}
          <h3 className="text-xl font-bold text-red-900">
            Recomendación del Sommelier
          </h3>
        </div>
        
        <div className="space-y-2">
          {sections.map((section, index) => formatSection(section, index))}
        </div>

        <div className="mt-6 pt-4 border-t border-red-100">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <Star className="h-4 w-4" />
            <span>Recomendación generada por IA especializada en maridajes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WineRecommendationCard;
