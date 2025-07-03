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
    // Split by double newlines and filter empty sections
    const sections = text.split('\n\n').filter(section => section.trim());
    
    // Process each section to identify its type
    return sections.map(section => {
      const trimmed = section.trim();
      
      // Check if it's a numbered section with ###
      const numberedMatch = trimmed.match(/^###\s*(\d+)\.\s*(.+?)(\*\*.*?\*\*)?(.*)$/s);
      if (numberedMatch) {
        const [, number, title, highlight, content] = numberedMatch;
        return {
          type: 'numbered',
          number: parseInt(number),
          title: title.trim(),
          highlight: highlight?.replace(/\*\*/g, '') || '',
          content: content.trim()
        };
      }
      
      // Check if it's a conclusion/ending section
      if (trimmed.includes('Espero que') || trimmed.includes('¡Salud') || trimmed.includes('memorable')) {
        return {
          type: 'conclusion',
          content: trimmed
        };
      }
      
      // Default to intro/paragraph
      return {
        type: 'paragraph',
        content: trimmed
      };
    });
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

  const renderSection = (section: any, index: number) => {
    if (section.type === 'numbered') {
      return (
        <div key={index} className="mb-6 bg-gradient-to-r from-red-50 to-red-25 p-6 rounded-xl border border-red-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {section.number}
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                {section.title}
                {section.highlight && (
                  <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    {section.highlight}
                  </span>
                )}
              </h4>
              {section.content && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (section.type === 'conclusion') {
      return (
        <div key={index} className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-l-4 border-amber-400 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <span className="text-2xl">🍷</span>
            </div>
            <div className="flex-1">
              <p className="text-amber-900 leading-relaxed font-medium italic">
                {section.content}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Intro/paragraph section
    return (
      <div key={index} className="mb-6">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-gray-800 leading-relaxed text-base">
            {section.content}
          </p>
        </div>
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
        
        <div className="space-y-4">
          {sections.map((section, index) => renderSection(section, index))}
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
