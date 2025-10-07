import React from 'react';
import { Wine, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WineRecommendationCardProps {
  response: string;
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';
}

interface WineInfo {
  name: string;
  recommendation: string;
  type: string;
  bodega: string;
  region: string;
  country: string;
  price: string;
  whyItWorks: string;
}

const WineRecommendationCard: React.FC<WineRecommendationCardProps> = ({ response, functionType }) => {
  const parseWineRecommendations = (text: string): { intro: string; wines: WineInfo[]; conclusion: string } => {
    const wines: WineInfo[] = [];
    let intro = '';
    let conclusion = '';
    
    // Split by ### to get sections
    const sections = text.split('###').filter(s => s.trim());
    
    // First section before any ### is the intro
    const firstSplit = text.split('###')[0];
    if (firstSplit && firstSplit.trim()) {
      intro = firstSplit.trim();
    }
    
    sections.forEach((section) => {
      // Check if this is a numbered wine section
      const numberMatch = section.match(/^(\d+)\./);
      if (numberMatch) {
        const wineInfo: WineInfo = {
          name: '',
          recommendation: '',
          type: '',
          bodega: '',
          region: '',
          country: '',
          price: '',
          whyItWorks: ''
        };
        
        // Extract title (first line after number)
        const lines = section.split('\n').filter(l => l.trim());
        if (lines[0]) {
          wineInfo.name = lines[0].replace(/^\d+\.\s*/, '').trim();
        }
        
        // Extract Recomendación (can be bold or in bullet)
        const recoMatch = section.match(/\*\*Recomendación:\*\*\s*([^\n]+)/i) || 
                         section.match(/[-•]\s*\*\*Recomendación:\*\*\s*([^\n]+)/i);
        if (recoMatch) {
          wineInfo.recommendation = recoMatch[1].trim();
        }
        
        // Extract Tipo (flexible matching)
        const tipoMatch = section.match(/\*\*Tipo(?:\s+y\s+estilo)?:\*\*\s*([^\n]+)/i) ||
                         section.match(/[-•]\s*\*\*Tipo(?:\s+y\s+estilo)?:\*\*\s*([^\n]+)/i);
        if (tipoMatch) wineInfo.type = tipoMatch[1].trim();
        
        // Extract Bodega (can include "y bodega" or "específico y bodega")
        const bodegaMatch = section.match(/\*\*(?:Nombre específico y )?Bodega:\*\*\s*([^\n]+)/i) ||
                           section.match(/[-•]\s*\*\*(?:Nombre específico y )?Bodega:\*\*\s*([^\n]+)/i);
        if (bodegaMatch) wineInfo.bodega = bodegaMatch[1].trim();
        
        // Extract Región
        const regionMatch = section.match(/\*\*Región:\*\*\s*([^\n]+)/i) ||
                           section.match(/[-•]\s*\*\*Región:\*\*\s*([^\n]+)/i);
        if (regionMatch) wineInfo.region = regionMatch[1].trim();
        
        // Extract País
        const countryMatch = section.match(/\*\*País:\*\*\s*([^\n]+)/i) ||
                            section.match(/[-•]\s*\*\*País:\*\*\s*([^\n]+)/i);
        if (countryMatch) wineInfo.country = countryMatch[1].trim();
        
        // Extract Precio (flexible matching)
        const priceMatch = section.match(/\*\*(?:Precio aproximado|Rango de precio):\*\*\s*([^\n]+)/i) ||
                          section.match(/[-•]\s*\*\*(?:Precio aproximado|Rango de precio):\*\*\s*([^\n]+)/i);
        if (priceMatch) wineInfo.price = priceMatch[1].trim();
        
        // Extract "Por qué funciona" (flexible matching)
        const whyMatch = section.match(/\*\*Por qué funciona(?:\s+con\s+este\s+plato)?:\*\*\s*([^\n#]+)/i) ||
                        section.match(/[-•]\s*\*\*Por qué funciona(?:\s+con\s+este\s+plato)?:\*\*\s*([^\n#]+)/i);
        if (whyMatch) {
          wineInfo.whyItWorks = whyMatch[1].trim();
        }
        
        wines.push(wineInfo);
      }
    });
    
    // Extract conclusion (text after last wine that contains closing phrases)
    if (wines.length > 0) {
      const lastWineSection = text.split('###').filter(s => s.trim())[wines.length];
      if (lastWineSection && !lastWineSection.match(/^\d+\./)) {
        conclusion = lastWineSection.trim();
      }
    }
    
    return { intro, wines, conclusion };
  };

  const { intro, wines, conclusion } = parseWineRecommendations(response);

  return (
    <Card className="border-red-200 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <Wine className="h-6 w-6" />
            <h3 className="text-2xl font-bold">Recomendaciones de Winerim</h3>
          </div>
        </div>

        <div className="p-6">
          {/* Intro */}
          {intro && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-400">
              <p className="text-gray-800 leading-relaxed">{intro}</p>
            </div>
          )}

          {/* Wine Recommendations */}
          <div className="space-y-6">
            {wines.map((wine, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl border-2 border-red-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Wine Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-red-700 font-bold text-xl">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-xl leading-tight">
                        {wine.recommendation || wine.name}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Wine Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {wine.type && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="text-2xl">🍷</div>
                        <div>
                          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Tipo</div>
                          <div className="text-gray-800 font-medium">{wine.type}</div>
                        </div>
                      </div>
                    )}
                    
                    {wine.bodega && (
                      <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="text-2xl">🏛️</div>
                        <div>
                          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Bodega</div>
                          <div className="text-gray-800 font-medium">{wine.bodega}</div>
                        </div>
                      </div>
                    )}
                    
                    {wine.region && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-2xl">📍</div>
                        <div>
                          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Región</div>
                          <div className="text-gray-800 font-medium">{wine.region}</div>
                        </div>
                      </div>
                    )}
                    
                    {wine.country && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-2xl">🌍</div>
                        <div>
                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">País</div>
                          <div className="text-gray-800 font-medium">{wine.country}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {wine.price && (
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-l-4 border-emerald-400 mb-4">
                      <div className="text-2xl">💰</div>
                      <div>
                        <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Precio aproximado</div>
                        <div className="text-gray-800 font-bold text-lg">{wine.price}</div>
                      </div>
                    </div>
                  )}

                  {/* Why it works */}
                  {wine.whyItWorks && (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-400">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">✨</div>
                        <div>
                          <h5 className="font-bold text-amber-900 mb-2">Por qué funciona</h5>
                          <p className="text-gray-700 leading-relaxed">{wine.whyItWorks}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Conclusion */}
          {conclusion && (
            <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-400">
              <div className="flex items-start gap-3">
                <div className="text-xl">🍷</div>
                <p className="text-gray-800 leading-relaxed italic">{conclusion}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-red-100">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Star className="h-4 w-4" />
              <span>Recomendación generada por Winerim</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WineRecommendationCard;
