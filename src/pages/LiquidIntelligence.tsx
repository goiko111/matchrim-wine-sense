
import React, { useState } from 'react';
import LiquidIntelligenceHero from '@/components/liquid-intelligence/LiquidIntelligenceHero';
import QueryTypeSelector from '@/components/liquid-intelligence/QueryTypeSelector';
import AIChat from '@/components/liquid-intelligence/AIChat';
import WineStyleExplorer from '@/components/liquid-intelligence/WineStyleExplorer';

type AppState = 'hero' | 'query-selector' | 'ai-chat' | 'wine-explorer';
type QueryType = 'dish-to-wine' | 'wine-to-dish' | 'pairing-check';

const LiquidIntelligence = () => {
  const [currentState, setCurrentState] = useState<AppState>('hero');
  const [selectedQuery, setSelectedQuery] = useState<QueryType | null>(null);

  const handleGetStarted = () => {
    setCurrentState('query-selector');
  };

  const handleSelectQuery = (type: QueryType) => {
    setSelectedQuery(type);
    setCurrentState('ai-chat');
  };

  const handleBackToSelector = () => {
    setCurrentState('query-selector');
    setSelectedQuery(null);
  };

  const handleBackToHero = () => {
    setCurrentState('hero');
    setSelectedQuery(null);
  };

  const handleOpenWineExplorer = () => {
    setCurrentState('wine-explorer');
  };

  const handleBackFromExplorer = () => {
    setCurrentState('query-selector');
  };

  const renderContent = () => {
    switch (currentState) {
      case 'hero':
        return <LiquidIntelligenceHero onGetStarted={handleGetStarted} />;
      
      case 'query-selector':
        return (
          <div>
            <QueryTypeSelector 
              onBack={handleBackToHero} 
              onSelectQuery={handleSelectQuery} 
            />
            
            {/* Wine Explorer Button */}
            <div className="fixed bottom-6 right-6">
              <button
                onClick={handleOpenWineExplorer}
                className="bg-red-900 hover:bg-red-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-light"
              >
                🔍 Descubre tu estilo
              </button>
            </div>
          </div>
        );
      
      case 'ai-chat':
        if (!selectedQuery) return null;
        return <AIChat queryType={selectedQuery} onBack={handleBackToSelector} />;
      
      case 'wine-explorer':
        return <WineStyleExplorer onBack={handleBackFromExplorer} />;
      
      default:
        return <LiquidIntelligenceHero onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {renderContent()}
      
      {/* Global Restaurant CTA - only show on hero and query selector */}
      {(currentState === 'hero' || currentState === 'query-selector') && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-900 to-red-800 text-white p-4 text-center">
          <p className="text-sm font-light mb-2">
            💡 ¿Eres restaurante? Esto también funciona en tu carta.
          </p>
          <button className="text-white hover:text-red-200 font-medium text-sm underline">
            Descubre Winerim para restaurantes
          </button>
        </div>
      )}
    </div>
  );
};

export default LiquidIntelligence;
