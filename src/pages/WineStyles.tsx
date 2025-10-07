
import React from 'react';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';
import WineStylesGrid from '@/components/wine-styles/WineStylesGrid';
import SensoryCalculator from '@/components/wine-styles/SensoryCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Calculator, Wine, Zap, Target, Lightbulb, CheckCircle } from 'lucide-react';

const WineStyles = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen">
      {user ? <AppNav /> : <Header />}
      
      {/* Hero mejorado */}
      <section className="relative py-20 winerim-bg text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30"></div>
        <div className="relative container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <Badge className="inline-flex items-center gap-2 bg-white/20 text-white border-white/30 mb-6">
              <Wine className="h-4 w-4" />
              16 Estilos Únicos
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Los Estilos <span className="text-accent">Winerim</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
              Cada vino tiene su <strong>personalidad única</strong>. Descubre los estilos que definen 
              la experiencia sensorial perfecta para cada momento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Zap className="h-8 w-8 text-accent mb-3 mx-auto" />
                <h3 className="font-semibold mb-2">5 Atributos</h3>
                <p className="text-sm opacity-80">Potencia, Acidez, Dulzura, Taninos y Afrutado</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Target className="h-8 w-8 text-accent mb-3 mx-auto" />
                <h3 className="font-semibold mb-2">Precisión Total</h3>
                <p className="text-sm opacity-80">Algoritmo que identifica el estilo perfecto</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Lightbulb className="h-8 w-8 text-accent mb-3 mx-auto" />
                <h3 className="font-semibold mb-2">Fácil Comprensión</h3>
                <p className="text-sm opacity-80">Clasificación visual e intuitiva</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="styles" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-2 bg-white shadow-elegant rounded-2xl p-2">
                <TabsTrigger 
                  value="styles" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Palette className="h-4 w-4" />
                  Estilos de Vino
                </TabsTrigger>
                <TabsTrigger 
                  value="calculator" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Calculator className="h-4 w-4" />
                  Calculadora Sensorial
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="styles" className="mt-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Descubre los 16 Estilos Únicos
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Cada estilo representa una combinación única de atributos sensoriales, 
                  creando una experiencia vínica distintiva y memorable.
                </p>
              </div>
              <WineStylesGrid />
            </TabsContent>
            
            <TabsContent value="calculator" className="mt-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Calculadora de Perfil Sensorial
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Experimenta con los 5 atributos sensoriales y descubre qué estilo 
                  emerge de cada combinación única.
                </p>
              </div>
              <SensoryCalculator />
            </TabsContent>
          </Tabs>

          {/* Sección informativa mejorada */}
          <section className="mt-20 py-16 gradient-subtle rounded-3xl">
            <div className="container mx-auto px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  El Sistema Winerim
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Una revolución en la clasificación vínica que transforma la experiencia del comensal
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <Card className="bg-white shadow-elegant rounded-2xl border-0 transform hover:scale-105 transition-smooth">
                  <CardContent className="p-8 text-center">
                    <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-6">
                      <Wine className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      ¿Qué son los Estilos Winerim?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      16 categorías únicas que clasifican todos los vinos según 5 atributos sensoriales: 
                      Potencia, Acidez, Dulzura, Taninos y Afrutado.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white shadow-elegant rounded-2xl border-0 transform hover:scale-105 transition-smooth">
                  <CardContent className="p-8 text-center">
                    <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-6">
                      <Target className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      ¿Cómo funciona?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Cada vino se evalúa del 1 al 5 en los 5 atributos. Nuestro algoritmo asigna 
                      automáticamente el estilo más apropiado.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-elegant rounded-2xl border-0 transform hover:scale-105 transition-smooth md:col-span-2 lg:col-span-1">
                  <CardContent className="p-8 text-center">
                    <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-6">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Ventajas del Sistema
                    </h3>
                    <ul className="text-gray-600 text-left space-y-2">
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-primary mr-2" />Comunicación enológica clara</li>
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-primary mr-2" />Búsquedas rápidas en portafolio</li>
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-primary mr-2" />Control de preferencias</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* CTA Section */}
              <div className="text-center bg-white rounded-2xl p-12 shadow-elegant">
                <Wine className="h-16 w-16 text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ¿Listo para descubrir tu estilo personal?
                </h3>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Realiza nuestro test Matchrim y obtén tu perfil sensorial único, 
                  diseñado para encontrar los vinos que realmente conectan contigo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/registration" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold shadow-lg transform hover:scale-105 transition-smooth"
                  >
                    Hacer Test Matchrim
                  </a>
                  <a 
                    href="/matchrim" 
                    className="border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-smooth"
                  >
                    Explorar AIRIM
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default WineStyles;
