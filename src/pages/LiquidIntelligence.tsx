
import React, { useState } from 'react';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';
import MatchrimWelcome from '@/components/MatchrimWelcome';
import MatchrimMenu from '@/components/MatchrimMenu';
import MatchrimFunction from '@/components/MatchrimFunction';
import SpecialMomentsFlow from '@/components/SpecialMomentsFlow';

type AppState = 'welcome' | 'menu' | 'function';
type FunctionType = 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';

const LiquidIntelligence = () => {
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('welcome');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType | null>(null);

  const handleGetStarted = () => {
    setCurrentState('menu');
  };

  const handleSelectFunction = (functionType: FunctionType) => {
    setSelectedFunction(functionType);
    setCurrentState('function');
  };

  const handleBackToMenu = () => {
    setCurrentState('menu');
    setSelectedFunction(null);
  };

  const handleBackToWelcome = () => {
    setCurrentState('welcome');
    setSelectedFunction(null);
  };

  const renderContent = () => {
    switch (currentState) {
      case 'welcome':
        return <MatchrimWelcome onGetStarted={handleGetStarted} />;
      case 'menu':
        return <MatchrimMenu onBack={handleBackToWelcome} onSelectFunction={handleSelectFunction} />;
      case 'function':
        if (!selectedFunction) return null;
        if (selectedFunction === 'special-moments') {
          return <SpecialMomentsFlow onBack={handleBackToMenu} />;
        }
        return <MatchrimFunction functionType={selectedFunction} onBack={handleBackToMenu} />;
      default:
        return <MatchrimWelcome onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <>
      {user && <AppNav />}
      <div className="min-h-screen">
        {/* Solo mostrar el header en modo debug o si necesitas navegación adicional */}
        <div className="hidden">
          <Header />
        </div>
        
        {/* App content */}
        {renderContent()}
      </div>
    </>
  );
};

export default LiquidIntelligence;
