import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import QuizResults from '@/components/QuizResults';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Wine, User, History, Settings, Copy, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateMatchrimName, 
  generateWineStyles, 
  generateGrapeRecommendations, 
  generateRegionRecommendations 
} from '@/utils/profileUtils';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getQuizHistory } = useQuizResults();
  const [quizHistory, setQuizHistory] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [matchingWineStyle, setMatchingWineStyle] = useState(null);

  useEffect(() => {
    const loadQuizHistory = async () => {
      if (user) {
        const history = await getQuizHistory();
        setQuizHistory(history);
        if (history.length > 0) {
          setCurrentProfile(history[0]);
        }
      }
    };

    loadQuizHistory();
  }, [user, getQuizHistory]);

  // Efecto para calcular el estilo Winerim cuando cambie el perfil actual
  useEffect(() => {
    if (currentProfile) {
      calculateMatchingWineStyle();
    }
  }, [currentProfile]);

  const calculateMatchingWineStyle = async () => {
    if (!currentProfile) return;

    try {
      const { data: wineStyles, error } = await supabase
        .from('wine_styles')
        .select('*');

      if (error) throw error;

      if (wineStyles && wineStyles.length > 0) {
        // Calcular la distancia euclidiana entre el perfil del usuario y cada estilo
        const distances = wineStyles.map(style => {
          const distance = Math.sqrt(
            Math.pow(currentProfile.potente - style.potente, 2) +
            Math.pow(currentProfile.acidez - style.acidez, 2) +
            Math.pow(currentProfile.dulce - style.dulce, 2) +
            Math.pow(currentProfile.tanico - style.tanico, 2) +
            Math.pow(currentProfile.afrutado - style.afrutado, 2)
          );
          return { style, distance };
        });

        // Encontrar el estilo con la menor distancia
        const closest = distances.reduce((prev, current) => 
          prev.distance < current.distance ? prev : current
        );

        setMatchingWineStyle(closest.style);
      }
    } catch (error) {
      console.error('Error calculating matching wine style:', error);
    }
  };

  const cleanStyleName = (name) => {
    // Quitar IDs entre paréntesis al final del nombre
    return name?.replace(/\s*\(\d+\)\s*$/, '').trim() || name;
  };

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

  // Generate profile data using the new consistent functions
  const profileName = currentProfile ? generateMatchrimName(currentProfile) : "";
  const wineStyles = currentProfile ? generateWineStyles(currentProfile) : [];
  const recommendedGrapes = currentProfile ? generateGrapeRecommendations(currentProfile) : [];
  const recommendedRegions = currentProfile ? generateRegionRecommendations(currentProfile) : [];

  const copyProfileToClipboard = () => {
    navigator.clipboard.writeText(profileName);
    toast({
      title: "¡Perfil copiado!",
      description: `Tu perfil ${profileName} está listo para usar en Winerim.`,
    });
  };


  // Organize recommendations by country
  const spanishWines = currentProfile?.wine_recommendations?.filter(wine => wine.country === "España") || [];
  const internationalWines = currentProfile?.wine_recommendations?.filter(wine => wine.country !== "España") || [];

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
            {!user ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-900">Inicia sesión para ver tu perfil</CardTitle>
                  <CardDescription>
                    Necesitas iniciar sesión para acceder a tu perfil personalizado y ver tus resultados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="bg-red-700 hover:bg-red-800 mr-4"
                  >
                    Iniciar Sesión
                  </Button>
                  <Button 
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="border-red-700 text-red-700 hover:bg-red-50"
                  >
                    Realizar Test sin Cuenta
                  </Button>
                </CardContent>
              </Card>
            ) : currentProfile ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md">
                <div className="flex items-center justify-center mb-8">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 flex items-center justify-center bg-red-100 rounded-full mb-2">
                      <img 
                        src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
                        alt="Logo Winerim" 
                        className="h-12 w-12"
                      />
                    </div>
                    <h2 className="text-3xl font-bold text-red-900">Resultados de tu perfil</h2>
                  </div>
                </div>
                
                <div className="border-b border-red-200 pb-6 mb-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-red-800 mb-2">
                      🎉 Tu perfil sensorial es:
                    </h3>
                    <div className="inline-flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
                      <span className="text-xl font-semibold text-red-900">{profileName}</span>
                      <button 
                        onClick={copyProfileToClipboard} 
                        className="text-red-600 hover:text-red-800 transition-colors"
                        aria-label="Copiar perfil"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-red-50/50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
                      <span className="text-2xl">🧭</span> Tu estilo de vino
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Tu estilo Winerim */}
                      {matchingWineStyle && (
                        <div>
                          <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Tu estilo Winerim:
                          </h4>
                          <div className="bg-gradient-to-r from-red-100 to-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-start gap-3">
                              <div className="bg-red-200 rounded-full p-2 flex-shrink-0">
                                <Wine className="h-4 w-4 text-red-700" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className="bg-red-600 text-white hover:bg-red-700">
                                    🍷 {cleanStyleName(matchingWineStyle.name)}
                                  </Badge>
                                </div>
                                {matchingWineStyle.description && (
                                  <p className="text-sm text-gray-700 mb-2">
                                    {matchingWineStyle.description}
                                  </p>
                                )}
                                <div className="text-xs text-red-600">
                                  <strong>Perfil sensorial:</strong> Potente: {matchingWineStyle.potente}, 
                                  Acidez: {matchingWineStyle.acidez}, Dulzor: {matchingWineStyle.dulce}, 
                                  Tánico: {matchingWineStyle.tanico}, Afrutado: {matchingWineStyle.afrutado}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Estilos generales:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {wineStyles.map((style, index) => (
                            <li key={index}>{style}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Uvas que deberías probar:</h4>
                        <div className="flex flex-wrap gap-2">
                          {recommendedGrapes.map((grape, index) => (
                            <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                              {grape}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Regiones que van contigo:</h4>
                        <div className="flex flex-wrap gap-2">
                          {recommendedRegions.map((region, index) => (
                            <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                              {region}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-80">
                    <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🍷</span> Tu radar sensorial
                    </h3>
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
                
                <div className="bg-red-50 p-5 rounded-lg border border-red-200 mt-8">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-xl">💡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Tip del sumiller:</h4>
                      <p className="text-gray-700">
                        Guarda tu perfil <span className="font-semibold text-red-700">{profileName}</span> y, 
                        cuando estés en un restaurante con Winerim, introdúcelo para recibir solo los vinos 
                        que encajan contigo.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-4 mt-6">
                  <Button 
                    onClick={() => navigate('/')}
                    className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
                  >
                    Realizar Nuevo Test
                  </Button>
                </div>
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
                {!user ? (
                  <p className="text-gray-600 text-center py-8">
                    Inicia sesión para ver tu historial de tests
                  </p>
                ) : quizHistory.length > 0 ? (
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
                  Vinos que te encantarán
                </CardTitle>
                <CardDescription>
                  Vinos recomendados basados en tu perfil actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <p className="text-gray-600 text-center py-8">
                    Inicia sesión para ver recomendaciones de vinos personalizadas
                  </p>
                ) : currentProfile && currentProfile.wine_recommendations && currentProfile.wine_recommendations.length > 0 ? (
                  <div className="space-y-6">
                    {spanishWines.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-4">
                          🇪🇸 España
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {spanishWines.map((wine, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0 mt-1">
                                  <Wine className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{wine.wine_name}</h4>
                                  <p className="text-xs text-gray-600 mb-1">{wine.wine_type}</p>
                                  <p className="text-xs text-gray-600 mb-1">
                                    <span className="font-medium">Bodega:</span> {wine.winery}
                                  </p>
                                  <p className="text-xs text-gray-600 mb-1">
                                    <span className="font-medium">Región:</span> {wine.region}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">País:</span> {wine.country}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {internationalWines.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-4">
                          🌎 Internacional
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {internationalWines.map((wine, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0 mt-1">
                                  <Wine className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{wine.wine_name}</h4>
                                  <p className="text-xs text-gray-600 mb-1">{wine.wine_type}</p>
                                  <p className="text-xs text-gray-600 mb-1">
                                    <span className="font-medium">Bodega:</span> {wine.winery}
                                  </p>
                                  <p className="text-xs text-gray-600 mb-1">
                                    <span className="font-medium">Región:</span> {wine.region}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">País:</span> {wine.country}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
