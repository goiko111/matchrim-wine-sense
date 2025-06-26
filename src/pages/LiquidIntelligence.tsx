
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, MessageCircle, Calculator, TrendingUp, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

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

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis
            </TabsTrigger>
          </TabsList>

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
                          {option.status === 'Disponible' ? 'Configurar' : 'Próximamente'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedAI && (
              <Card className="mt-8 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900">
                    Configuración de {aiOptions.find(ai => ai.id === selectedAI)?.name}
                  </CardTitle>
                  <CardDescription>
                    Configure los parámetros para optimizar la experiencia de IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-800 text-sm">
                      La configuración detallada para este motor de IA estará disponible próximamente. 
                      Incluirá opciones para personalizar el comportamiento, ajustar la sensibilidad 
                      y configurar las preferencias de análisis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <MessageCircle className="h-5 w-5" />
                  Chat con IA Especializada
                </CardTitle>
                <CardDescription>
                  Conversa con nuestro asistente especializado en vinos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Chat IA en Desarrollo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Esta funcionalidad permitirá conversar en tiempo real con un asistente 
                    especializado en vinos que conoce tu perfil sensorial.
                  </p>
                  <Button disabled className="bg-gray-300">
                    Próximamente Disponible
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <TrendingUp className="h-5 w-5" />
                  Análisis Inteligente de Datos
                </CardTitle>
                <CardDescription>
                  Insights avanzados sobre tu perfil y preferencias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Análisis Avanzado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Aquí podrás ver análisis detallados de tus patrones de consumo, 
                    evolución de tu perfil sensorial y predicciones personalizadas.
                  </p>
                  <Button disabled className="bg-gray-300">
                    En Desarrollo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LiquidIntelligence;
