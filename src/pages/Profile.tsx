
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import QuizResults from '@/components/QuizResults';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Wine, User, History, Settings } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getQuizHistory } = useQuizResults();
  const [quizHistory, setQuizHistory] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadQuizHistory = async () => {
      const history = await getQuizHistory();
      setQuizHistory(history);
      if (history.length > 0) {
        setCurrentProfile(history[0]); // Mostrar el perfil más reciente
      }
    };

    loadQuizHistory();
  }, [user, navigate, getQuizHistory]);

  const chartData = currentProfile ? [
    { attribute: "Potente", value: currentProfile.potente },
    { attribute: "Acidez", value: currentProfile.acidez },
    { attribute: "Dulce", value: currentProfile.dulce },
    { attribute: "Tánico", value: currentProfile.tanico },
    { attribute: "Afrutado", value: currentProfile.afrutado },
  ] : [];

  const chartConfig = {
    radar: {
      label: "Radar",
      theme: {
        light: "#be123c",
        dark: "#be123c",
      },
    },
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
            <img 
              src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
              alt="Logo Winerim" 
              className="h-8 w-8"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-900">Mi Perfil Matchrim</h1>
            <p className="text-red-600">Descubre y gestiona tu perfil sensorial de vino</p>
          </div>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil Actual
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Wine className="h-4 w-4" />
              Recomendaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-6">
            {currentProfile ? (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <User className="h-5 w-5" />
                      Tu Perfil Sensorial Actual
                    </CardTitle>
                    <CardDescription>
                      Creado el {new Date(currentProfile.created_at).toLocaleDateString('es-ES')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-semibold text-red-800 mb-4">Tu Radar Sensorial</h3>
                        <div className="h-80">
                          <ChartContainer config={chartConfig}>
                            <RadarChart outerRadius={90} data={chartData}>
                              <PolarGrid stroke="#be123c33" />
                              <PolarAngleAxis dataKey="attribute" tick={{ fill: '#be123c' }} />
                              <PolarRadiusAxis domain={[1, 5]} stroke="#be123c" />
                              <Radar 
                                name="Perfil" 
                                dataKey="value" 
                                stroke="#be123c" 
                                fill="#be123c" 
                                fillOpacity={0.6} 
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </RadarChart>
                          </ChartContainer>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">Descripción de tu perfil:</h4>
                          <p className="text-gray-700">{currentProfile.profile_description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-red-50 p-3 rounded-lg">
                            <span className="font-medium text-red-700">Potente:</span>
                            <span className="ml-2">{currentProfile.potente}/5</span>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <span className="font-medium text-red-700">Acidez:</span>
                            <span className="ml-2">{currentProfile.acidez}/5</span>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <span className="font-medium text-red-700">Dulce:</span>
                            <span className="ml-2">{currentProfile.dulce}/5</span>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <span className="font-medium text-red-700">Tánico:</span>
                            <span className="ml-2">{currentProfile.tanico}/5</span>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg col-span-2">
                            <span className="font-medium text-red-700">Afrutado:</span>
                            <span className="ml-2">{currentProfile.afrutado}/5</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => navigate('/')}
                          className="w-full bg-red-700 hover:bg-red-800"
                        >
                          Realizar Nuevo Test
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-900">No tienes un perfil aún</CardTitle>
                  <CardDescription>
                    Realiza nuestro test para descubrir tu perfil sensorial único
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate('/')}
                    className="bg-red-700 hover:bg-red-800"
                  >
                    Realizar Test de Perfil
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <History className="h-5 w-5" />
                  Historial de Tests
                </CardTitle>
                <CardDescription>
                  Revisa todos los tests que has realizado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quizHistory.length > 0 ? (
                  <div className="space-y-4">
                    {quizHistory.map((result, index) => (
                      <div key={result.id} className="border border-red-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-red-800">
                              Test #{quizHistory.length - index}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {new Date(result.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentProfile(result)}
                            className="text-red-700 border-red-700 hover:bg-red-50"
                          >
                            Ver Detalles
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-red-700 font-medium">Potente</div>
                            <div>{result.potente}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-700 font-medium">Acidez</div>
                            <div>{result.acidez}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-700 font-medium">Dulce</div>
                            <div>{result.dulce}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-700 font-medium">Tánico</div>
                            <div>{result.tanico}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-700 font-medium">Afrutado</div>
                            <div>{result.afrutado}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    No has realizado ningún test aún
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <Wine className="h-5 w-5" />
                  Recomendaciones de Vinos
                </CardTitle>
                <CardDescription>
                  Vinos recomendados basados en tu perfil actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentProfile && currentProfile.wine_recommendations ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentProfile.wine_recommendations.map((wine, index) => (
                      <div key={index} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                            <Wine className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{wine.wine_name}</p>
                            <p className="text-sm text-gray-600">{wine.wine_type}</p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Bodega:</span> {wine.winery}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Región:</span> {wine.region}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">País:</span> {wine.country}
                            </p>
                            <div className="mt-2">
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                {wine.compatibility_score}% compatible
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    Realiza un test para obtener recomendaciones personalizadas
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
