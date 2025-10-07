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
      // Parse the content to extract structured information
      const lines = section.content.split('\n').filter((line: string) => line.trim());
      const structuredInfo: { label: string; value: string; icon: string }[] = [];
      let remainingContent = '';
      let wineName = '';

      lines.forEach((line: string) => {
        const trimmedLine = line.trim();
        // Match patterns like "- Label: value" or "**Label**: value"
        const labelMatch = trimmedLine.match(/^[-•]\s*\*?\*?([^:*]+)\*?\*?:\s*(.+)$/);
        
        if (labelMatch) {
          const label = labelMatch[1].trim();
          const value = labelMatch[2].trim();
          let icon = '📌';

          // Extract wine name if this is the "Nombre" field
          if (label.toLowerCase().includes('nombre')) {
            wineName = value;
            icon = '🏷️';
          } else if (label.toLowerCase().includes('bodega')) {
            icon = '🏷️';
          } else if (label.toLowerCase().includes('tipo') || label.toLowerCase().includes('estilo')) {
            icon = '🍷';
          } else if (label.toLowerCase().includes('funciona') || label.toLowerCase().includes('maridaje') || label.toLowerCase().includes('por qué')) {
            icon = '✨';
          } else if (label.toLowerCase().includes('precio') || label.toLowerCase().includes('rango')) {
            icon = '💰';
          } else if (label.toLowerCase().includes('temperatura')) {
            icon = '🌡️';
          } else if (label.toLowerCase().includes('copa')) {
            icon = '🥂';
          } else if (label.toLowerCase().includes('plato') || label.toLowerCase().includes('comida')) {
            icon = '🍽️';
          } else if (label.toLowerCase().includes('ocasión')) {
            icon = '🎉';
          }

          structuredInfo.push({ label, value, icon });
        } else if (trimmedLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('•')) {
          remainingContent += (remainingContent ? ' ' : '') + trimmedLine;
        }
      });

      return (
        <div key={index} className="mb-6 animate-fade-in">
          <div className="bg-gradient-to-br from-white to-red-50/30 rounded-xl border-2 border-red-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Header with number */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-red-700 font-bold text-lg">{section.number}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg leading-tight">
                    {wineName || section.title}
                  </h4>
                  {section.highlight && (
                    <span className="inline-block mt-2 text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium backdrop-blur-sm">
                      {section.highlight}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Structured information in grid */}
              {structuredInfo.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {structuredInfo.map((info, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 transition-colors"
                    >
                      <div className="flex-shrink-0 text-xl mt-0.5">
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-red-900 text-sm mb-1">
                          {info.label}
                        </div>
                        <div className="text-gray-700 text-sm leading-relaxed">
                          {info.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Additional content */}
              {remainingContent && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-400">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {remainingContent}
                  </p>
                </div>
              )}

              {/* Fallback if no structured info was found */}
              {structuredInfo.length === 0 && section.content && (
                <p className="text-gray-700 text-sm leading-relaxed p-3 bg-white rounded-lg border border-red-100">
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
