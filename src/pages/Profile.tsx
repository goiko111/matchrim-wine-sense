import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Wine, User, History, Copy, Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Sun, Utensils, Leaf, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import RegionMap from '@/components/RegionMap';
import { 
  generateMatchrimName, 
  generateWineStyles, 
  generateGrapeRecommendations, 
  generateRegionRecommendations 
} from '@/utils/profileUtils';

interface WineStyle {
  id: string;
  name: string;
  description: string | null;
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getQuizHistory } = useQuizResults();
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [styleDetails, setStyleDetails] = useState<WineStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

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

  // Generate profile data
  const profileName = currentProfile ? generateMatchrimName(currentProfile) : "";
  const wineStyles = currentProfile ? generateWineStyles(currentProfile) : [];
  const recommendedGrapes = currentProfile ? generateGrapeRecommendations(currentProfile) : [];
  const recommendedRegions = currentProfile ? generateRegionRecommendations(currentProfile) : [];

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
        
        const ordered = wineStyles
          .map(styleName => data?.find(s => s.name === styleName))
          .filter(Boolean) as WineStyle[];
        
        setStyleDetails(ordered);
      } catch (error) {
        console.error('Error fetching wine styles:', error);
      } finally {
        setIsLoadingStyles(false);
      }
    };

    fetchStyleDetails();
  }, [currentProfile, wineStyles]);

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

  const getCardConfig = (styleName: string) => {
    const configs: Record<string, any> = {
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

  const getGrapeDescription = (grape: string) => {
    const descriptions: Record<string, string> = {
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
    };
    return descriptions[grape] || `Una uva que se adapta perfectamente a tu perfil sensorial.`;
  };

  const getRegionDescription = (region: string) => {
    const descriptions: Record<string, string> = {
      'Borgoña (Francia)': `Cuna del Pinot Noir y Chardonnay, produce vinos ${currentProfile?.potente <= 3 ? 'elegantes y sutiles' : 'con carácter'} con ${currentProfile?.acidez >= 3 ? 'excelente acidez' : 'equilibrio'}.`,
      'Burdeos (Francia)': `Región de grandes tintos estructurados, perfecta por tu gusto por ${currentProfile?.tanico >= 3 ? 'taninos firmes' : 'vinos estructurados'} y ${currentProfile?.potente >= 3 ? 'potencia' : 'equilibrio'}.`,
      'Toscana (Italia)': `Hogar del Sangiovese, ofrece vinos con ${currentProfile?.acidez >= 3 ? 'acidez vibrante' : 'frescura'} y ${currentProfile?.tanico >= 3 ? 'estructura tánica' : 'elegancia'}.`,
      'Rioja (España)': `La región española icónica que produce vinos ${currentProfile?.potente >= 3 ? 'con cuerpo' : 'equilibrados'} y ${currentProfile?.tanico >= 2 ? 'taninos pulidos' : 'suaves'}.`,
      'Ribera del Duero (España)': `Tintos potentes y concentrados, ideales por tu preferencia por ${currentProfile?.potente >= 3 ? 'intensidad' : 'estructura'} y ${currentProfile?.tanico >= 3 ? 'taninos marcados' : 'carácter'}.`,
    };
    return descriptions[region] || `Una región que produce vinos alineados con tu perfil.`;
  };

  const regionsByCountry = recommendedRegions.reduce((acc, region) => {
    const country = region.split('(')[1]?.replace(')', '') || 'Otros';
    if (!acc[country]) acc[country] = [];
    acc[country].push(region);
    return acc;
  }, {} as Record<string, string[]>);

  const sortedCountries = Object.entries(regionsByCountry)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([country, regions]) => ({ country, regions }));

  const getCountryEmoji = (countryName: string) => {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-red-900 mb-2 flex items-center gap-2">
          <User className="w-8 h-8" />
          Mi Perfil
        </h1>
        <p className="text-gray-600">
          Gestiona tu información y visualiza tu perfil sensorial Winerim
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Wine className="w-4 h-4" />
            Perfil Sensorial
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {currentProfile ? (
            <div className="space-y-8">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-red-900 mb-2">
                      {profileName}
                    </h2>
                    <p className="text-gray-700">
                      Tu perfil sensorial único que define tus preferencias
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(profileName);
                      toast({
                        title: "Código copiado",
                        description: "Tu código de perfil ha sido copiado al portapapeles",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar código
                  </Button>
                </div>
              </div>

              {/* Radar Chart */}
              <Card>
                <CardContent className="pt-6">
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
                </CardContent>
              </Card>

              {/* Wine Styles Section */}
              {styleDetails.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                    <Wine className="w-6 h-6" />
                    Tus estilos de vino
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {styleDetails.map((style) => {
                      const config = getCardConfig(style.name);
                      const IconComponent = config.icon;
                      
                      return (
                        <Card key={style.id} className={`${config.bg} ${config.border} border-2 hover:shadow-lg transition-shadow cursor-pointer`}
                          onClick={() => navigate(`/wine-styles/${style.id}`)}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4 mb-4">
                              <div className={`${config.iconBg} rounded-lg p-3 flex-shrink-0`}>
                                <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg mb-2">{style.name}</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {style.description || 'Estilo de vino que se adapta a tu perfil sensorial.'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommended Grapes */}
              {recommendedGrapes.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                    <Grape className="w-6 h-6" />
                    Uvas recomendadas para ti
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedGrapes.map((grape, index) => (
                      <Card key={index} className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-200 rounded-full p-2 flex-shrink-0">
                              <Grape className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <h4 className="font-bold text-purple-900 mb-2">{grape}</h4>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {getGrapeDescription(grape)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Regions */}
              {sortedCountries.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    Regiones que van con tu estilo
                  </h3>
                  
                  {sortedCountries.map(({ country, regions }) => (
                    <div key={country} className="mb-8">
                      <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-2xl">{getCountryEmoji(country)}</span>
                        {country}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {regions.map((region, index) => (
                          <Card key={index} className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <div className="bg-blue-200 rounded-full p-2 flex-shrink-0">
                                  <MapPin className="w-5 h-5 text-blue-700" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-blue-900 mb-2">{region}</h5>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {getRegionDescription(region)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tip Section */}
              <div className="bg-red-50 p-5 rounded-lg border border-red-200">
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
              
              <div className="flex flex-col items-center gap-4">
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

        <TabsContent value="history">
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
      </Tabs>
    </div>
  );
};

export default Profile;
