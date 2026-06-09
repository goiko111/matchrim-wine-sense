import React from 'react';
import { ChefHat, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DishRecommendationCardProps {
  response: string;
}

interface DishInfo {
  name: string;
  recommendation: string;
  cuisine: string;
  ingredients: string;
  technique: string;
  occasion: string;
  difficulty: string;
  whyItWorks: string;
}

const DishRecommendationCard: React.FC<DishRecommendationCardProps> = ({ response }) => {
  const parseDishRecommendations = (text: string): { intro: string; dishes: DishInfo[]; conclusion: string } => {
    const dishes: DishInfo[] = [];
    let intro = '';
    let conclusion = '';
    
    // Split by ### to get sections
    const parts = text.split('###');
    
    // First part before any ### is the intro
    if (parts[0] && parts[0].trim()) {
      intro = parts[0].trim();
    }
    
    // Process each numbered section
    for (let i = 1; i < parts.length; i++) {
      const section = parts[i];
      const sectionText = section.trimStart();
      
      // Check if this is a numbered dish section (1., 2., 3.)
      const numberMatch = sectionText.match(/^(\d+)\./);
      if (numberMatch) {
        const dishInfo: DishInfo = {
          name: '',
          recommendation: '',
          cuisine: '',
          ingredients: '',
          technique: '',
          occasion: '',
          difficulty: '',
          whyItWorks: ''
        };
        
        // Extract title (first line after number)
        const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
        if (lines[0]) {
          dishInfo.name = lines[0].replace(/^\d+\.\s*/, '').trim();
        }
        
        // Recomendación
        const recoMatch = sectionText.match(/\*\*Recomendación:\*\*\s*([^\n]+)/i);
        if (recoMatch) {
          dishInfo.recommendation = recoMatch[1].trim();
        } else if (dishInfo.name) {
          dishInfo.recommendation = dishInfo.name;
        }
        
        // Tipo de cocina
        let cuisineMatch = sectionText.match(/\*\*Tipo de cocina:\*\*\s*([^\n]+)/i);
        if (!cuisineMatch) cuisineMatch = sectionText.match(/[-•]\s*\*?Tipo de cocina\*?:\s*([^\n]+)/i);
        if (cuisineMatch) dishInfo.cuisine = cuisineMatch[1].replace(/\*\*/g, '').trim();
        
        // Ingredientes principales
        let ingredientsMatch = sectionText.match(/\*\*Ingredientes principales:\*\*\s*([^\n]+)/i);
        if (!ingredientsMatch) ingredientsMatch = sectionText.match(/[-•]\s*\*?Ingredientes principales\*?:\s*([^\n]+)/i);
        if (ingredientsMatch) dishInfo.ingredients = ingredientsMatch[1].replace(/\*\*/g, '').trim();
        
        // Técnica de cocción
        let techniqueMatch = sectionText.match(/\*\*Técnica de cocción:\*\*\s*([^\n]+)/i);
        if (!techniqueMatch) techniqueMatch = sectionText.match(/[-•]\s*\*?Técnica de cocción\*?:\s*([^\n]+)/i);
        if (techniqueMatch) dishInfo.technique = techniqueMatch[1].replace(/\*\*/g, '').trim();
        
        // Ocasión ideal
        let occasionMatch = sectionText.match(/\*\*Ocasión ideal:\*\*\s*([^\n]+)/i);
        if (!occasionMatch) occasionMatch = sectionText.match(/[-•]\s*\*?Ocasión ideal\*?:\s*([^\n]+)/i);
        if (occasionMatch) dishInfo.occasion = occasionMatch[1].replace(/\*\*/g, '').trim();
        
        // Dificultad
        let difficultyMatch = sectionText.match(/\*\*Dificultad:\*\*\s*([^\n]+)/i);
        if (!difficultyMatch) difficultyMatch = sectionText.match(/[-•]\s*\*?Dificultad\*?:\s*([^\n]+)/i);
        if (difficultyMatch) dishInfo.difficulty = difficultyMatch[1].replace(/\*\*/g, '').trim();
        
        // Why it works
        let whyMatch = sectionText.match(/\*\*Por qué funciona(?:\s+con\s+este\s+vino)?:\*\*\s*([^#]+?)(?=\n\n|###|$)/is);
        if (!whyMatch) whyMatch = sectionText.match(/[-•]\s*\*?Por qué funciona(?:\s+con\s+este\s+vino)?\*?:\s*([^#\n-]+)/i);
        if (whyMatch) {
          dishInfo.whyItWorks = whyMatch[1].replace(/\*\*/g, '').trim();
        }
        
        dishes.push(dishInfo);
      }
    }
    
    // Extract conclusion if present
    const lastPart = parts[parts.length - 1];
    if (lastPart && !lastPart.match(/^\d+\./) && dishes.length > 0) {
      if (lastPart.match(/temperatura|copa|servicio|espero|salud|disfrut/i)) {
        conclusion = lastPart.trim();
      }
    }
    
    return { intro, dishes, conclusion };
  };

  const { intro, dishes, conclusion } = parseDishRecommendations(response);

  return (
    <Card className="border-red-200 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6" />
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

          {/* Dish Recommendations */}
          <div className="space-y-6">
            {dishes.map((dish, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl border-2 border-red-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Dish Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-red-700 font-bold text-xl">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-xl leading-tight">
                        {dish.recommendation || dish.name}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Dish Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {dish.cuisine && (
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-2xl">🍽️</div>
                        <div>
                          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Tipo de cocina</div>
                          <div className="text-gray-800 font-medium">{dish.cuisine}</div>
                        </div>
                      </div>
                    )}
                    
                    {dish.ingredients && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-2xl">🥘</div>
                        <div>
                          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Ingredientes principales</div>
                          <div className="text-gray-800 font-medium">{dish.ingredients}</div>
                        </div>
                      </div>
                    )}
                    
                    {dish.technique && (
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="text-2xl">👨‍🍳</div>
                        <div>
                          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Técnica de cocción</div>
                          <div className="text-gray-800 font-medium">{dish.technique}</div>
                        </div>
                      </div>
                    )}
                    
                    {dish.occasion && (
                      <div className="flex items-start gap-3 p-3 bg-pink-50 rounded-lg border border-pink-100">
                        <div className="text-2xl">🎉</div>
                        <div>
                          <div className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-1">Ocasión ideal</div>
                          <div className="text-gray-800 font-medium">{dish.occasion}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {dish.difficulty && (
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-400 mb-4">
                      <div className="text-2xl">⭐</div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Nivel de dificultad</div>
                        <div className="text-gray-800 font-bold text-lg">{dish.difficulty}</div>
                      </div>
                    </div>
                  )}

                  {/* Why it works */}
                  {dish.whyItWorks && (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-400">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">✨</div>
                        <div>
                          <h5 className="font-bold text-amber-900 mb-2">Por qué funciona</h5>
                          <p className="text-gray-700 leading-relaxed">{dish.whyItWorks}</p>
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

export default DishRecommendationCard;
