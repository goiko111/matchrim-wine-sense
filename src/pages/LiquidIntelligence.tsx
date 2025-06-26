
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, MessageCircle, Calculator, TrendingUp, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import AIChatInterface from '@/components/AIChatInterface';
import WineAnalysisCard from '@/components/WineAnalysisCard';

const LiquidIntelligence = () => {
  const [selectedAI, setSelectedAI] = useState<string | null>(null);

  const aiOptions = [
    {
      id: 'openai',
      name: 'OpenAI GPT',
      description: 'Análisis avanzado de perfiles y recomendaciones personalizadas',
      icon: Brain,
      cost: 'Alto',
      costColor: 'bg-red-100 text-red-800',
      features: ['Análisis de perfil sensorial', 'Recomendaciones de vinos', 'Chat interactivo'],
      status: 'Disponible'
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      description: 'Modelos especializados para análisis de datos estructurados',
      icon: Calculator,
      cost: 'Medio',
      costColor: 'bg-yellow-100 text-yellow-800',
      features: ['Análisis de patrones', 'Clasificación automática', 'Procesamiento local'],
      status: 'En desarrollo'
    },
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      description: 'Búsqueda inteligente y análisis de tendencias vinícolas',
      icon: TrendingUp,
      cost: 'Bajo',
      costColor: 'bg-green-100 text-green-800',
      features: ['Búsqueda de información', 'Análisis de mercado', 'Tendencias actuales'],
      status: 'Disponible'
    }
  ];

  const handleSelectAI = (aiId: string) => {
    setSelectedAI(aiId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
            <Sparkles className="h-8 w-8 text-red-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-900">Inteligencia Líquida</h1>
            <p className="text-red-600">Potencia tu experiencia vinícola con IA avanzada</p>
          </div>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AIChatInterface context="Usuario interactuando con el sistema de Inteligencia Líquida" />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-900 text-lg">Sugerencias</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-left justify-start text-sm border-red-200 hover:bg-red-50"
                      onClick={() => {/* Will be implemented in chat interface */}}
                    >
                      "¿Qué vino me recomiendas para una cena romántica?"
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-left justify-start text-sm border-red-200 hover:bg-red-50"
                      onClick={() => {/* Will be implemented in chat interface */}}
                    >
                      "Analiza mi perfil sensorial"
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-left justify-start text-sm border-red-200 hover:bg-red-50"
                      onClick={() => {/* Will be implemented in chat interface */}}
                    >
                      "¿Cómo debo maridar un Cabernet Sauvignon?"
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <div className="grid gap-6">
              <WineAnalysisCard />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <TrendingUp className="h-5 w-5" />
                    Próximas Funcionalidades de Análisis
                  </CardTitle>
                  <CardDescription>
                    Herramientas avanzadas que estarán disponibles próximamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Análisis de Perfil Personal</h3>
                      <p className="text-sm text-red-700">
                        Análisis detallado de tus preferencias basado en tus respuestas del perfil sensorial.
                      </p>
                    </div>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Predicciones de Maridaje</h3>
                      <p className="text-sm text-red-700">
                        Recomendaciones automáticas de maridajes basadas en machine learning.
                      </p>
                    </div>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Análisis de Tendencias</h3>
                      <p className="text-sm text-red-700">
                        Insights sobre tendencias del mercado vinícola y preferencias emergentes.
                      </p>
                    </div>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Comparativa de Vinos</h3>
                      <p className="text-sm text-red-700">
                        Herramienta para comparar diferentes vinos y obtener análisis detallados.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {aiOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card 
                    key={option.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedAI === option.id ? 'ring-2 ring-red-500 bg-red-50' : ''
                    }`}
                    onClick={() => handleSelectAI(option.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <IconComponent className="h-8 w-8 text-red-700" />
                        <Badge className={option.costColor}>
                          {option.cost}
                        </Badge>
                      </div>
                      <CardTitle className="text-red-900">{option.name}</CardTitle>
                      <CardDescription>{option.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-red-700">Estado:</span>
                          <Badge variant={option.status === 'Disponible' ? 'default' : 'secondary'}>
                            {option.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-2">Características:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {option.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-red-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button 
                          className="w-full bg-red-700 hover:bg-red-800"
                          disabled={option.status !== 'Disponible'}
                        >
                          {option.status === 'Disponible' ? 'Activo' : 'Próximamente'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedAI === 'openai' && (
              <Card className="mt-8 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900">
                    Configuración de OpenAI GPT
                  </CardTitle>
                  <CardDescription>
                    El motor de IA está configurado y listo para usar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800 text-sm">
                      ✅ OpenAI API configurada correctamente. El asistente especializado en vinos 
                      está disponible en la pestaña "Chat IA" y las herramientas de análisis en 
                      la pestaña "Análisis".
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidIntelligence;
