import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Wine, Droplet, Zap, Grape, Heart } from 'lucide-react';
import Header from '@/components/Header';

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

const WineStyleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [style, setStyle] = useState<WineStyle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWineStyle();
    }
  }, [id]);

  const fetchWineStyle = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setStyle(data);
    } catch (error: any) {
      console.error('Error fetching wine style:', error);
      toast({
        title: "Error",
        description: "Error al cargar el estilo de vino",
        variant: "destructive"
      });
      navigate('/wine-styles');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanStyleName = (name: string) => {
    return name.replace(/\s*\(\d+\)\s*$/, '').trim();
  };

  const getCharacteristicColor = (value: number) => {
    if (value <= 3) return 'bg-green-500';
    if (value <= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStyleCategory = (name: string) => {
    if (name.toLowerCase().includes('burbuja') || name.toLowerCase().includes('brut')) {
      return { category: 'Espumosos', color: 'bg-green-100 text-green-800' };
    }
    if (name.toLowerCase().includes('blanco')) {
      return { category: 'Blancos', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (name.toLowerCase().includes('tinto')) {
      return { category: 'Tintos', color: 'bg-red-100 text-red-800' };
    }
    if (name.toLowerCase().includes('rosado')) {
      return { category: 'Rosados', color: 'bg-pink-100 text-pink-800' };
    }
    if (name.toLowerCase().includes('dulce')) {
      return { category: 'Dulces', color: 'bg-orange-100 text-orange-800' };
    }
    return { category: 'Especiales', color: 'bg-purple-100 text-purple-800' };
  };

  const getDetailedDescription = (style: WineStyle) => {
    const category = getStyleCategory(style.name);
    const cleanName = cleanStyleName(style.name);
    
    // Generar descripciones detalladas basadas en las características
    let description = `${cleanName} es un estilo único que representa `;
    
    if (style.potente >= 7) {
      description += "la intensidad y fuerza en cada sorbo, ";
    } else if (style.potente <= 3) {
      description += "la sutileza y elegancia refinada, ";
    } else {
      description += "el equilibrio perfecto entre fuerza y delicadeza, ";
    }

    if (style.acidez >= 7) {
      description += "con una acidez vibrante que aporta frescura y vivacidad. ";
    } else if (style.acidez <= 3) {
      description += "con una acidez suave que permite disfrutar de su carácter sedoso. ";
    } else {
      description += "con una acidez balanceada que complementa perfectamente su perfil. ";
    }

    if (style.dulce >= 7) {
      description += "Su dulzura natural lo convierte en un vino extraordinario para momentos especiales. ";
    } else if (style.dulce <= 2) {
      description += "Su carácter seco lo hace versátil para diversas ocasiones gastronómicas. ";
    }

    if (style.tanico >= 7) {
      description += "Los taninos robustos le otorgan estructura y personalidad, ";
    } else if (style.tanico <= 3) {
      description += "Sus taninos suaves proporcionan una textura sedosa, ";
    }

    if (style.afrutado >= 7) {
      description += "mientras que sus intensos aromas frutales crean una experiencia sensorial memorable.";
    } else if (style.afrutado <= 3) {
      description += "con notas más minerales y terrosas que expresan su origen único.";
    } else {
      description += "equilibrado con toques frutales que complementan su complejidad.";
    }

    return description;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
        </div>
      </div>
    );
  }

  if (!style) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Estilo no encontrado</h1>
          <Button onClick={() => navigate('/wine-styles')} className="mt-4">
            Volver a Estilos
          </Button>
        </div>
      </div>
    );
  }

  const category = getStyleCategory(style.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Botón de regreso */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/wine-styles')}
          className="mb-6 hover:bg-white/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Estilos
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-900 to-red-700 text-white">
                <div className="flex items-center gap-4">
                  <Wine className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      {cleanStyleName(style.name)}
                    </CardTitle>
                    <Badge className={`mt-2 ${category.color}`}>
                      {category.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Descripción Original</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {style.description || 'Descripción no disponible'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Análisis Detallado</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {getDetailedDescription(style)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recomendaciones de maridaje */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recomendaciones de Maridaje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {style.potente >= 6 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-800">Carnes Rojas</h4>
                      <p className="text-red-700 text-sm">Ideal para asados, cordero y carnes a la parrilla</p>
                    </div>
                  )}
                  
                  {style.acidez >= 6 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800">Mariscos y Pescados</h4>
                      <p className="text-green-700 text-sm">Perfecto con ceviches y pescados blancos</p>
                    </div>
                  )}
                  
                  {style.dulce >= 6 && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-800">Postres</h4>
                      <p className="text-orange-700 text-sm">Excelente con chocolates y frutas</p>
                    </div>
                  )}
                  
                  {style.tanico >= 6 && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-800">Quesos Maduros</h4>
                      <p className="text-purple-700 text-sm">Combina bien con quesos curados</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de características */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Perfil Sensorial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Potencia</span>
                    <span className="text-sm text-gray-600">{style.potente}/10</span>
                  </div>
                  <Progress value={style.potente * 10} className="h-2" />
                  <div className={`w-3 h-3 rounded-full ${getCharacteristicColor(style.potente)} ml-auto -mt-1`}></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Acidez</span>
                    <span className="text-sm text-gray-600">{style.acidez}/10</span>
                  </div>
                  <Progress value={style.acidez * 10} className="h-2" />
                  <div className={`w-3 h-3 rounded-full ${getCharacteristicColor(style.acidez)} ml-auto -mt-1`}></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Dulzura</span>
                    <span className="text-sm text-gray-600">{style.dulce}/10</span>
                  </div>
                  <Progress value={style.dulce * 10} className="h-2" />
                  <div className={`w-3 h-3 rounded-full ${getCharacteristicColor(style.dulce)} ml-auto -mt-1`}></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taninos</span>
                    <span className="text-sm text-gray-600">{style.tanico}/10</span>
                  </div>
                  <Progress value={style.tanico * 10} className="h-2" />
                  <div className={`w-3 h-3 rounded-full ${getCharacteristicColor(style.tanico)} ml-auto -mt-1`}></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Afrutado</span>
                    <span className="text-sm text-gray-600">{style.afrutado}/10</span>
                  </div>
                  <Progress value={style.afrutado * 10} className="h-2" />
                  <div className={`w-3 h-3 rounded-full ${getCharacteristicColor(style.afrutado)} ml-auto -mt-1`}></div>
                </div>
              </CardContent>
            </Card>

            {/* Temperatura y servicio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Servicio Recomendado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Temperatura de Servicio</h4>
                  <p className="text-sm text-gray-600">
                    {category.category === 'Espumosos' && '6-8°C'}
                    {category.category === 'Blancos' && '8-12°C'}
                    {category.category === 'Rosados' && '10-12°C'}
                    {category.category === 'Tintos' && '16-18°C'}
                    {category.category === 'Dulces' && '6-10°C'}
                    {category.category === 'Especiales' && '12-16°C'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Copa Recomendada</h4>
                  <p className="text-sm text-gray-600">
                    {category.category === 'Espumosos' && 'Copa flauta o tulipán'}
                    {category.category === 'Blancos' && 'Copa de vino blanco'}
                    {category.category === 'Rosados' && 'Copa de vino blanco'}
                    {(category.category === 'Tintos' || category.category === 'Especiales') && 'Copa de vino tinto'}
                    {category.category === 'Dulces' && 'Copa pequeña de postre'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WineStyleDetail;