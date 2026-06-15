
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';
import MatchrimWelcome from '@/components/MatchrimWelcome';
import MatchrimMenu from '@/components/MatchrimMenu';
import MatchrimFunction from '@/components/MatchrimFunction';
import SpecialMomentsFlow from '@/components/SpecialMomentsFlow';

type AppState = 'welcome' | 'menu' | 'function';
type FunctionType = 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';

const VALID_FUNCTIONS: FunctionType[] = ['wine-for-dish', 'dish-for-wine', 'pairing-check', 'special-moments'];

const LiquidIntelligence = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentState, setCurrentState] = useState<AppState>('welcome');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType | null>(null);
  const [initialInput1, setInitialInput1] = useState<string>('');
  const [initialInput2, setInitialInput2] = useState<string>('');

  useEffect(() => {
    const fn = searchParams.get('function') as FunctionType | null;
    const wineParam = searchParams.get('wine') || '';
    const dishParam = searchParams.get('dish') || '';

    if (fn && VALID_FUNCTIONS.includes(fn)) {
      setSelectedFunction(fn);
      setCurrentState('function');
      if (fn === 'wine-for-dish') {
        setInitialInput1(dishParam);
        setInitialInput2('');
      } else if (fn === 'dish-for-wine') {
        setInitialInput1(wineParam);
        setInitialInput2('');
      } else if (fn === 'pairing-check') {
        setInitialInput1(wineParam);
        setInitialInput2(dishParam);
      }
    }
  }, [searchParams]);

  const handleGetStarted = () => {
    setCurrentState('menu');
  };

  const handleSelectFunction = (functionType: FunctionType) => {
    setSelectedFunction(functionType);
    setInitialInput1('');
    setInitialInput2('');
    setCurrentState('function');
  };

  const handleBackToMenu = () => {
    setCurrentState('menu');
    setSelectedFunction(null);
    setInitialInput1('');
    setInitialInput2('');
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
        return (
          <MatchrimFunction
            functionType={selectedFunction}
            onBack={handleBackToMenu}
            initialInput1={initialInput1}
            initialInput2={initialInput2}
          />
        );
      default:
        return <MatchrimWelcome onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <>
      {user && <AppNav />}
      <div className="min-h-screen">
        <div className="hidden">
          <Header />
        </div>
        {renderContent()}
      </div>
    </>
  );
};

export default LiquidIntelligence;
