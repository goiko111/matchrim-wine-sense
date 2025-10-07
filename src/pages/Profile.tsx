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
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadQuizHistory = async () => {
      const history = await getQuizHistory();
      setQuizHistory(history);
      if (history.length > 0) {
        setCurrentProfile(history[0]);
      }
    };

    loadQuizHistory();
  }, [user, navigate, getQuizHistory]);

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

  // Wine style details state
  const [styleDetails, setStyleDetails] = useState([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

  // Fetch wine style details from database
  useEffect(() => {
    const fetchStyleDetails = async () => {
      if (!currentProfile || wineStyles.length === 0) {
        setIsLoadingStyles(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('wine_styles')
          .select('*')
          .in('name', wineStyles);

        if (error) throw error;
        
        // Ordenar según el orden de wineStyles
        const ordered = wineStyles
          .map(styleName => data?.find(s => s.name === styleName))
          .filter(Boolean);
        
        setStyleDetails(ordered);
      } catch (error) {
        console.error('Error fetching wine styles:', error);
      } finally {
        setIsLoadingStyles(false);
      }
    };

    fetchStyleDetails();
  }, [currentProfile, wineStyles]);

  // Configuración de los iconos para los estilos
  const getCardConfig = (styleName) => {
    const configs = {
      'Burbuja Fresca': { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-200', icon: Droplet, iconColor: 'text-white' },
      'Brut Elegante': { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-600', icon: Diamond, iconColor: 'text-white' },
      'Blanco Vital': { bg: 'bg-yellow-50', border: 'border-yellow-100', iconBg: 'bg-yellow-300', icon: Zap, iconColor: 'text-white' },
      'Blanco Goloso': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Grape, iconColor: 'text-white' },
      'Dulce Intenso': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Flame, iconColor: 'text-white' },
      'Oxidativo/Maduro': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-700', icon: Clock, iconColor: 'text-white' },
      'Experimental': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-400', icon: Beaker, iconColor: 'text-white' },
      'Vino de Terruño': { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-500', icon: Mountain, iconColor: 'text-white' },
      'Tinto Versátil': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Shield, iconColor: 'text-white' },
      'Tinto de Estructura': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-800', icon: Sword, iconColor: 'text-white' },
      'Tinto Goloso': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-600', icon: Heart, iconColor: 'text-white' },
      'Dulce Ligero': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Feather, iconColor: 'text-white' },
      'Blanco de Carácter': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Wine, iconColor: 'text-white' },
      'Rosado Ligero': { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-300', icon: Sun, iconColor: 'text-white' },
      'Rosado Gastronómico': { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-500', icon: Utensils, iconColor: 'text-white' },
      'Tinto Ligero': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Leaf, iconColor: 'text-white' }
    };
    return configs[styleName] || { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-500', icon: Wine, iconColor: 'text-white' };
  };

  // Descripciones detalladas de uvas
  const getGrapeDescription = (grape) => {
    const descriptions = {
      'Chardonnay': `Versátil y elegante, esta uva te ofrece ${currentProfile?.potente >= 3 ? 'cuerpo y estructura' : 'finesse'}, con ${currentProfile?.acidez >= 3 ? 'buena acidez' : 'redondez'} que se adapta a tu perfil.`,
      'Cabernet Sauvignon': `Potente y estructurada, ideal por tu gusto por ${currentProfile?.tanico >= 3 ? 'taninos marcados' : 'vinos con carácter'} y ${currentProfile?.potente >= 3 ? 'intensidad' : 'equilibrio'}.`,
      'Merlot': `Suave y afrutada, encaja con tu preferencia por ${currentProfile?.afrutado >= 3 ? 'aromas frutales' : 'vinos amables'} y ${currentProfile?.tanico <= 3 ? 'taninos sedosos' : 'estructura equilibrada'}.`,
      'Pinot Noir': `Elegante y delicada, perfecta por tu inclinación hacia ${currentProfile?.potente <= 3 ? 'vinos sutiles' : 'complejidad'} con ${currentProfile?.acidez >= 3 ? 'frescura vibrante' : 'equilibrio'}.`,
      'Sauvignon Blanc': `Fresca y aromática, te va bien por tu gusto por ${currentProfile?.acidez >= 3 ? 'acidez marcada' : 'vivacidad'} y ${currentProfile?.afrutado >= 3 ? 'expresión frutal' : 'carácter definido'}.`,
      'Syrah': `Especiada y compleja, se alinea con tu perfil ${currentProfile?.potente >= 3 ? 'potente' : 'estructurado'} y ${currentProfile?.tanico >= 3 ? 'tánico' : 'equilibrado'}.`,
      'Riesling': `Aromática y vibrante, combina ${currentProfile?.acidez >= 3 ? 'acidez refrescante' : 'equilibrio'} con ${currentProfile?.dulce >= 2 ? 'notas dulces' : 'precisión'} que te gustan.`,
      'Tempranillo': `La gran uva española que ofrece ${currentProfile?.potente >= 3 ? 'estructura' : 'elegancia'} y ${currentProfile?.tanico >= 3 ? 'taninos firmes' : 'suavidad'} según tu preferencia.`,
      'Malbec': `Intensa y frutal, perfecta por tu gusto por ${currentProfile?.afrutado >= 3 ? 'aromas intensos' : 'expresión frutal'} y ${currentProfile?.potente >= 3 ? 'cuerpo generoso' : 'estructura media'}.`,
      'Garnacha': `Generosa y especiada, se adapta a tu perfil ${currentProfile?.dulce >= 2 ? 'con dulzor' : 'equilibrado'} y ${currentProfile?.afrutado >= 3 ? 'frutal' : 'complejo'}.`,
      'Albariño': `Atlántica y refrescante, ideal por tu preferencia por ${currentProfile?.acidez >= 3 ? 'frescura vibrante' : 'vinos vivos'} y ${currentProfile?.afrutado >= 3 ? 'aromas frutales' : 'carácter mineral'}.`,
      'Sangiovese': `Estructurada y elegante, combina ${currentProfile?.acidez >= 3 ? 'acidez marcada' : 'vivacidad'} con ${currentProfile?.tanico >= 3 ? 'taninos firmes' : 'estructura media'}.`,
      'Nebbiolo': `Potente y compleja, perfecta por tu gusto por ${currentProfile?.tanico >= 4 ? 'taninos poderosos' : 'estructura seria'} y ${currentProfile?.potente >= 3 ? 'intensidad' : 'carácter'}.`,
      'Gewürztraminer': `Aromática y exótica, se alinea con tu perfil ${currentProfile?.dulce >= 3 ? 'con dulzor' : 'aromático'} y ${currentProfile?.afrutado >= 4 ? 'muy frutal' : 'expresivo'}.`,
      'Mencía': `Fresca y frutal, ideal por tu preferencia por ${currentProfile?.acidez >= 3 ? 'frescura' : 'vivacidad'} y ${currentProfile?.afrutado >= 3 ? 'expresión frutal' : 'elegancia'}.`,
      'Godello': `Atlántica y mineral, encaja con tu gusto por ${currentProfile?.acidez >= 3 ? 'acidez vibrante' : 'frescura'} y ${currentProfile?.potente >= 2 ? 'cuerpo medio' : 'elegancia'}.`
    };
    return descriptions[grape] || `Una uva que se adapta perfectamente a tu perfil sensorial.`;
  };

  // Descripciones detalladas de regiones
  const getRegionDescription = (region) => {
    const descriptions = {
      'Borgoña (Francia)': `Cuna del Pinot Noir y Chardonnay, produce vinos ${currentProfile?.potente <= 3 ? 'elegantes y sutiles' : 'con carácter'} con ${currentProfile?.acidez >= 3 ? 'excelente acidez' : 'equilibrio'}.`,
      'Burdeos (Francia)': `Región de grandes tintos estructurados, perfecta por tu gusto por ${currentProfile?.tanico >= 3 ? 'taninos firmes' : 'vinos estructurados'} y ${currentProfile?.potente >= 3 ? 'potencia' : 'equilibrio'}.`,
      'Toscana (Italia)': `Hogar del Sangiovese, ofrece vinos con ${currentProfile?.acidez >= 3 ? 'acidez vibrante' : 'frescura'} y ${currentProfile?.tanico >= 3 ? 'estructura tánica' : 'elegancia'}.`,
      'Rioja (España)': `La región española icónica que produce vinos ${currentProfile?.potente >= 3 ? 'con cuerpo' : 'equilibrados'} y ${currentProfile?.tanico >= 2 ? 'taninos pulidos' : 'suaves'}.`,
      'Ribera del Duero (España)': `Tintos potentes y concentrados, ideales por tu preferencia por ${currentProfile?.potente >= 3 ? 'intensidad' : 'estructura'} y ${currentProfile?.tanico >= 3 ? 'taninos marcados' : 'carácter'}.`,
      'Rías Baixas (España)': `La tierra del Albariño, perfecta por tu gusto por ${currentProfile?.acidez >= 4 ? 'acidez refrescante' : 'frescura atlántica'} y ${currentProfile?.afrutado >= 3 ? 'aromas frutales' : 'elegancia'}.`,
      'Priorat (España)': `Vinos de terruño único, muy ${currentProfile?.potente >= 4 ? 'potentes' : 'concentrados'} con ${currentProfile?.tanico >= 4 ? 'taninos poderosos' : 'estructura seria'}.`,
      'Piemonte (Italia)': `Hogar del Nebbiolo, produce vinos con ${currentProfile?.tanico >= 4 ? 'taninos serios' : 'estructura'} y ${currentProfile?.acidez >= 3 ? 'acidez elevada' : 'vivacidad'}.`,
      'Mosel (Alemania)': `Rieslings elegantes con ${currentProfile?.acidez >= 4 ? 'acidez brillante' : 'frescura'} y ${currentProfile?.dulce >= 2 ? 'dulzor equilibrado' : 'pureza frutal'}.`,
      'Napa Valley (EE.UU.)': `Vinos ${currentProfile?.potente >= 4 ? 'muy potentes' : 'generosos'} y ${currentProfile?.afrutado >= 3 ? 'frutales' : 'expresivos'} con carácter californiano.`,
      'Mendoza (Argentina)': `Malbecs intensos que combinan ${currentProfile?.afrutado >= 3 ? 'fruta generosa' : 'expresión frutal'} con ${currentProfile?.potente >= 3 ? 'cuerpo robusto' : 'estructura media'}.`,
      'Valle de Maipo (Chile)': `Cabernets estructurados con ${currentProfile?.potente >= 3 ? 'potencia' : 'equilibrio'} y ${currentProfile?.tanico >= 3 ? 'taninos firmes' : 'estructura definida'}.`,
      'Marlborough (Nueva Zelanda)': `Sauvignon Blancs con ${currentProfile?.acidez >= 4 ? 'acidez brillante' : 'frescura intensa'} y ${currentProfile?.afrutado >= 4 ? 'aromas explosivos' : 'expresión frutal'}.`,
      'Barossa Valley (Australia)': `Shiraz potentes y especiadas, ideales por tu gusto por ${currentProfile?.potente >= 4 ? 'vinos con músculo' : 'intensidad'} y ${currentProfile?.afrutado >= 3 ? 'fruta madura' : 'carácter frutal'}.`
    };
    return descriptions[region] || `Una región que produce vinos alineados con tu perfil.`;
  };

  // Agrupar regiones por país
  const regionsByCountry = recommendedRegions.reduce((acc, region) => {
    const country = region.split('(')[1]?.replace(')', '') || 'Otros';
    if (!acc[country]) acc[country] = [];
    acc[country].push(region);
    return acc;
  }, {});

  const sortedCountries = Object.entries(regionsByCountry)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([country, regions]) => ({ country, regions }));

  const getCountryEmoji = (countryName) => {
    const countryLower = countryName.toLowerCase();
    if (countryLower.includes('francia') || countryLower.includes('france')) return '🇫🇷';
    if (countryLower.includes('italia') || countryLower.includes('italy')) return '🇮🇹';
    if (countryLower.includes('españa') || countryLower.includes('spain')) return '🇪🇸';
    if (countryLower.includes('eeuu') || countryLower.includes('usa')) return '🇺🇸';
    if (countryLower.includes('argentina')) return '🇦🇷';
    if (countryLower.includes('chile')) return '🇨🇱';
    if (countryLower.includes('australia')) return '🇦🇺';
    if (countryLower.includes('nueva zelanda') || countryLower.includes('new zealand')) return '🇳🇿';
    if (countryLower.includes('portugal')) return '🇵🇹';
    if (countryLower.includes('alemania') || countryLower.includes('germany')) return '🇩🇪';
    return '🌍';
  };
                  
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
                  Vinos que te encantarán
                </CardTitle>
                <CardDescription>
                  Vinos recomendados basados en tu perfil actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentProfile && currentProfile.wine_recommendations && currentProfile.wine_recommendations.length > 0 ? (
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
