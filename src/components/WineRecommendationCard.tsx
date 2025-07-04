import React from 'react';
import { Wine, Star, Thermometer, Clock, PartyPopper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WineRecommendationCardProps {
  response: string;
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';
}

const WineRecommendationCard: React.FC<WineRecommendationCardProps> = ({ response, functionType }) => {
  // Parse the response to extract wine information and structured sections
  const parseResponse = (text: string) => {
    const sections = text.split('\n\n').filter(section => section.trim());
    
    let wineInfo = {
      name: '',
      region: '',
      description: '',
      characteristics: []
    };
    
    const parsedSections = sections.map((section, index) => {
      const trimmed = section.trim();
      
      // Extract wine name from bold text patterns
      const wineNameMatch = trimmed.match(/\*\*([^*]+(?:Sauvignon Blanc|Chardonnay|Merlot|Cabernet|Tempranillo|Garnacha|Rioja|Ribera|Verdejo|Albariño)[^*]*)\*\*/);
      if (wineNameMatch && !wineInfo.name) {
        wineInfo.name = wineNameMatch[1];
      }
      
      // Extract region information
      const regionMatch = trimmed.match(/región de ([^,\.]+)|de la ([^,\.]+)|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+en\s+[A-Z][a-z]+)?)/);
      if (regionMatch && !wineInfo.region && (regionMatch[1] || regionMatch[2] || regionMatch[3])) {
        wineInfo.region = regionMatch[1] || regionMatch[2] || regionMatch[3];
      }
      
      // Check if it's a numbered section
      const numberedMatch = trimmed.match(/^###?\s*(\d+)\.\s*(.+?)(\*\*.*?\*\*)?(.*)$/s);
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
      
      // Check for wine characteristics (Aroma, Sabor, Cuerpo, etc.)
      const characteristicMatch = trimmed.match(/\*\*(Aroma|Sabor|Cuerpo|Temperatura|Cristalería|Decantación|Maridaje)\*\*:\s*(.+)/);
      if (characteristicMatch) {
        wineInfo.characteristics.push({
          type: characteristicMatch[1],
          description: characteristicMatch[2]
        });
      }
      
      // Check if it's a conclusion
      if (trimmed.includes('Espero que') || trimmed.includes('¡Salud') || trimmed.includes('memorable')) {
        return {
          type: 'conclusion',
          content: trimmed
        };
      }
      
      // Default to paragraph
      return {
        type: 'paragraph',
        content: trimmed,
        isIntro: index === 0
      };
    });
    
    return { sections: parsedSections, wineInfo };
  };

  const { sections, wineInfo } = parseResponse(response);
  
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

  const renderCharacteristic = (characteristic: any, index: number) => {
    const getCharacteristicIcon = (type: string) => {
      switch (type) {
        case 'Aroma':
          return '👃';
        case 'Sabor':
          return '👅';
        case 'Cuerpo':
          return '🏺';
        case 'Temperatura':
          return '🌡️';
        case 'Cristalería':
          return '🍷';
        case 'Decantación':
          return '⏰';
        case 'Maridaje':
          return '🍽️';
        default:
          return '✨';
      }
    };

    return (
      <div key={index} className="flex items-start gap-3 p-3 bg-red-25 rounded-lg border border-red-100">
        <div className="text-lg">{getCharacteristicIcon(characteristic.type)}</div>
        <div>
          <h5 className="font-semibold text-red-800">{characteristic.type}</h5>
          <p className="text-sm text-gray-700 mt-1">{characteristic.description}</p>
        </div>
      </div>
    );
  };

  const renderSection = (section: any, index: number) => {
    if (section.type === 'numbered') {
      return (
        <div key={index} className="mb-4">
          <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-red-100 shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {section.number}
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                {section.title}
                {section.highlight && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    {section.highlight}
                  </span>
                )}
              </h4>
              {section.content && (
                <p className="text-gray-700 text-sm leading-relaxed">
                  {section.content}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (section.type === 'conclusion') {
      return (
        <div key={index} className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <div className="text-xl">🍷</div>
            <p className="text-amber-900 text-sm leading-relaxed font-medium italic">
              {section.content}
            </p>
          </div>
        </div>
      );
    }

    if (section.isIntro) {
      return (
        <div key={index} className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-25 rounded-lg border-l-4 border-red-300">
          <div className="flex items-start gap-3">
            <div className="text-xl">🍷</div>
            <p className="text-gray-800 leading-relaxed font-medium">
              {section.content}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="border-red-200 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            {getIconForFunction()}
            <h3 className="text-xl font-bold">
              Recomendación del Sommelier
            </h3>
          </div>
          {wineInfo.name && (
            <div className="bg-white/10 rounded-lg p-3 mt-4">
              <h4 className="text-lg font-bold mb-1">{wineInfo.name}</h4>
              {wineInfo.region && (
                <p className="text-red-100 text-sm">{wineInfo.region}</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Intro sections */}
          <div className="mb-6">
            {sections.filter(s => s.isIntro).map((section, index) => renderSection(section, index))}
          </div>

          {/* Wine characteristics */}
          {wineInfo.characteristics.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                <Wine className="h-5 w-5" />
                Características del Vino
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wineInfo.characteristics.map((characteristic, index) => 
                  renderCharacteristic(characteristic, index)
                )}
              </div>
            </div>
          )}

          {/* Numbered sections */}
          <div className="mb-6">
            {sections.filter(s => s.type === 'numbered').map((section, index) => renderSection(section, index))}
          </div>

          {/* Conclusion */}
          {sections.filter(s => s.type === 'conclusion').map((section, index) => renderSection(section, index))}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-red-100">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Star className="h-4 w-4" />
              <span>Recomendación generada por IA especializada en maridajes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WineRecommendationCard;
