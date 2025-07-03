
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

          {/* Footer informativo */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-red-800 mb-4">
                  ¿Qué son los Estilos Winerim?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Los Estilos Winerim son 16 categorías únicas que clasifican todos los vinos según 5 atributos sensoriales: Potencia, Acidez, Dulzura, Taninos y Afrutado. Cada estilo tiene su propio perfil, color e icono para facilitar la comprensión.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-red-800 mb-4">
                  ¿Cómo funciona?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Cada vino se evalúa del 1 al 5 en los 5 atributos sensoriales. Nuestro algoritmo analiza esta combinación y asigna automáticamente el estilo más apropiado, generando una descripción pedagógica para el comensal.
                </p>
              </div>
            </div>

            {/* Footer principal */}
            <div className="text-center py-8 border-t border-gray-100">
              <h4 className="text-2xl font-bold text-red-800 mb-2">Winerim</h4>
              <p className="text-gray-600">
                Sistema inteligente de clasificación de vinos • Transformando la experiencia del comensal
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WineStyles;
