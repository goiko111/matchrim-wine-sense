
import React from 'react';
import Header from '@/components/Header';
import WineStylesGrid from '@/components/wine-styles/WineStylesGrid';
import SensoryCalculator from '@/components/wine-styles/SensoryCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Calculator } from 'lucide-react';

const WineStyles = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Los 16 Estilos Winerim
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Cada vino tiene su personalidad única. Descubre los estilos que mejor definen aquello que necesitas a informar y elegir el vino perfecto para cada momento.
          </p>
          
          <Tabs defaultValue="styles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="styles" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Estilos de Vino
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculadora Sensorial
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="styles" className="mt-6">
              <WineStylesGrid />
            </TabsContent>
            
            <TabsContent value="calculator" className="mt-6">
              <SensoryCalculator />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default WineStyles;
