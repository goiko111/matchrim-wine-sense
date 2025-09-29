import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Wine, Droplet, Zap, Grape, Heart, Clock, Sun, Moon, Star,
  Users, Utensils, Coffee, Cake, Fish, Beef, Apple,
  Mountain, Sparkles, Thermometer, Eye, ChefHat, Calendar
} from 'lucide-react';
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

interface WineExample {
  name: string;
  region: string;
  grape: string;
  priceRange: string;
  description: string;
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
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setStyle(data);
      }
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

  const getStyleConfig = (name: string) => {
    const cleanName = cleanStyleName(name).toLowerCase();
    
    const configs: Record<string, any> = {
      'burbuja fresca': {
        icon: Droplet,
        color: 'emerald',
        gradient: 'from-emerald-600 to-teal-700',
        heroPhrase: 'El chispeo que abre la mesa y despierta la conversación',
        bgImage: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100',
        curiosity: 'Las burbujas de un espumoso pueden permanecer activas hasta 6 horas después de abrir la botella si se conserva correctamente.',
        story: 'Cada burbuja es una pequeña celebración que estalla en tu paladar, recordándonos que la vida está llena de momentos efervescentes por descubrir.'
      },
      'brut elegante': {
        icon: Sparkles,
        color: 'emerald',
        gradient: 'from-emerald-700 to-green-800',
        heroPhrase: 'La sofisticación en su máxima expresión',
        bgImage: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100',
        curiosity: 'El método tradicional de elaboración requiere al menos 15 meses de crianza en rima para desarrollar su complejidad.',
        story: 'Nacido en los viñedos más prestigiosos, cada sorbo cuenta la historia de tradición, paciencia y maestría enológica.'
      },
      'blanco vital': {
        icon: Zap,
        color: 'yellow',
        gradient: 'from-yellow-500 to-amber-600',
        heroPhrase: 'Energía pura que despierta todos los sentidos',
        bgImage: 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100',
        curiosity: 'Los blancos con alta acidez pueden maridar con más de 200 tipos diferentes de alimentos.',
        story: 'Como el primer rayo de sol del amanecer, este vino aporta luminosidad y energía a cada momento del día.'
      },
      'blanco goloso': {
        icon: Heart,
        color: 'orange',
        gradient: 'from-orange-400 to-amber-500',
        heroPhrase: 'La tentación hecha vino, imposible de resistir',
        bgImage: 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100',
        curiosity: 'Su dulzura natural proviene de uvas cosechadas en el punto exacto de maduración óptima.',
        story: 'Un abrazo cálido en cada copa, perfecto para esos momentos donde el alma necesita un poco de dulzura.'
      },
      'tinto versátil': {
        icon: Wine,
        color: 'red',
        gradient: 'from-red-600 to-red-800',
        heroPhrase: 'El compañero perfecto para cada ocasión',
        bgImage: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-100',
        curiosity: 'Su equilibrio permite maridar desde una pizza informal hasta un banquete de gala.',
        story: 'Como un buen amigo, siempre está ahí cuando lo necesitas, adaptándose a cada momento y celebración.'
      },
      'tinto de estructura': {
        icon: Mountain,
        color: 'red',
        gradient: 'from-red-800 to-red-900',
        heroPhrase: 'Carácter inquebrantable, personalidad única',
        bgImage: 'bg-gradient-to-br from-red-100 via-red-50 to-rose-100',
        curiosity: 'Sus taninos pueden evolucionar y suavizarse durante décadas en botella.',
        story: 'Forjado en terruños excepcionales, cada sorbo revela la fuerza de la tierra y la pasión del viticultor.'
      },
      'tinto goloso': {
        icon: Heart,
        color: 'red',
        gradient: 'from-red-500 to-rose-600',
        heroPhrase: 'Seducción en estado puro',
        bgImage: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-100',
        curiosity: 'Su perfil frutal intenso lo convierte en el favorito para iniciarse en el mundo del vino tinto.',
        story: 'Un vino que conquista desde el primer encuentro, dejando una huella imborrable en el corazón.'
      },
      'rosado ligero': {
        icon: Sun,
        color: 'pink',
        gradient: 'from-pink-400 to-rose-500',
        heroPhrase: 'La delicadeza del verano en cada sorbo',
        bgImage: 'bg-gradient-to-br from-pink-50 via-rose-50 to-red-100',
        curiosity: 'Su color rosado se obtiene por contacto breve con las pieles de uvas tintas, no por mezcla.',
        story: 'Como una brisa suave en una tarde de verano, refresca el alma y alegra el espíritu.'
      },
      'rosado gastronómico': {
        icon: ChefHat,
        color: 'pink',
        gradient: 'from-pink-500 to-red-600',
        heroPhrase: 'El arte de maridar elevado a la perfección',
        bgImage: 'bg-gradient-to-br from-pink-100 via-rose-50 to-red-100',
        curiosity: 'Su versatilidad gastronómica lo hace el favorito de chefs estrella Michelin.',
        story: 'Nacido para acompañar las creaciones más exquisitas, es el puente perfecto entre plato y placer.'
      }
    };

    return configs[cleanName] || {
      icon: Wine,
      color: 'purple',
      gradient: 'from-purple-600 to-purple-800',
      heroPhrase: 'Un estilo único con personalidad propia',
      bgImage: 'bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-100',
      curiosity: 'Cada vino tiene su propia historia y características únicas.',
      story: 'Un estilo especial que merece ser descubierto y apreciado en toda su complejidad.'
    };
  };

  const getEvocativeDescription = (style: WineStyle) => {
    const cleanName = cleanStyleName(style.name);
    const config = getStyleConfig(style.name);
    
    // Descripción sensorial rica basada en las características
    let description = `${cleanName} despierta los sentidos desde el primer encuentro. `;
    
    // Aroma
    if (style.afrutado >= 7) {
      description += `Su nariz estalla en una sinfonía de aromas frutales, donde cada inhalación revela capas de complejidad aromática. `;
    } else if (style.afrutado <= 3) {
      description += `Su perfil aromático es sutil y mineral, invitando a descubrir matices terrosos y especiados que hablan de su origen. `;
    } else {
      description += `Su bouquet equilibrado combina notas frutales con toques minerales, creando una armonía olfativa única. `;
    }
    
    // Textura en boca
    if (style.tanico >= 7) {
      description += `En boca, sus taninos firmes estructuran cada sorbo, proporcionando una sensación de plenitud y carácter robusto. `;
    } else if (style.tanico <= 3) {
      description += `Su textura sedosa acaricia el paladar, ofreciendo una experiencia suave y envolvente. `;
    } else {
      description += `Su estructura equilibrada proporciona una sensación armoniosa, ni demasiado robusta ni excesivamente delicada. `;
    }
    
    // Acidez y frescura
    if (style.acidez >= 7) {
      description += `Su acidez vibrante aporta una frescura revitalizante que limpia el paladar y prepara para el siguiente sorbo. `;
    } else if (style.acidez <= 3) {
      description += `Su acidez contenida permite que otros sabores se expresen plenamente, creando una sensación de redondez. `;
    }
    
    // Final
    description += `Es el vino perfecto para momentos donde se busca ${style.potente >= 7 ? 'intensidad y carácter' : style.potente <= 3 ? 'elegancia y sutileza' : 'equilibrio y versatilidad'}.`;
    
    return description;
  };

  const getPairings = (style: WineStyle) => {
    const pairings = {
      cotidianos: [] as Array<{name: string, icon: any, description: string}>,
      gastronomicos: [] as Array<{name: string, icon: any, description: string}>
    };

    const cleanName = cleanStyleName(style.name).toLowerCase();

    // Maridajes específicos por estilo
    if (cleanName.includes('burbuja') || cleanName.includes('brut')) {
      pairings.cotidianos.push(
        { name: 'Sushi', icon: Fish, description: 'La frescura del pescado crudo' },
        { name: 'Queso fresco', icon: Cake, description: 'Cremosidad que complementa las burbujas' },
        { name: 'Frutos secos', icon: Apple, description: 'Snack perfecto para el aperitivo' }
      );
      pairings.gastronomicos.push(
        { name: 'Ostras', icon: Fish, description: 'Maridaje clásico de alta cocina' },
        { name: 'Foie gras', icon: ChefHat, description: 'Contraste perfecto de texturas' },
        { name: 'Caviar', icon: Star, description: 'Lujo absoluto en cada bocado' }
      );
    } else if (cleanName.includes('blanco')) {
      pairings.cotidianos.push(
        { name: 'Pescado a la plancha', icon: Fish, description: 'Sencillez que resalta sabores' },
        { name: 'Ensaladas frescas', icon: Apple, description: 'Verduras de temporada' },
        { name: 'Pollo al limón', icon: Utensils, description: 'Clásico familiar reconfortante' }
      );
      pairings.gastronomicos.push(
        { name: 'Vieiras', icon: Fish, description: 'Moluscos de textura refinada' },
        { name: 'Risotto', icon: ChefHat, description: 'Cremosidad italiana perfecta' },
        { name: 'Trufa blanca', icon: Star, description: 'Lujo gastronómico supremo' }
      );
    } else if (cleanName.includes('tinto')) {
      pairings.cotidianos.push(
        { name: 'Pizza margherita', icon: Utensils, description: 'Clásico italiano infalible' },
        { name: 'Hamburguesa', icon: Beef, description: 'Carne jugosa y especias' },
        { name: 'Queso curado', icon: Cake, description: 'Sabores intensos y añejados' }
      );
      pairings.gastronomicos.push(
        { name: 'Cordero', icon: Beef, description: 'Carne noble de gran carácter' },
        { name: 'Cochinillo', icon: ChefHat, description: 'Tradición culinaria española' },
        { name: 'Chocolate negro', icon: Cake, description: 'Final dulce sofisticado' }
      );
    } else if (cleanName.includes('rosado')) {
      pairings.cotidianos.push(
        { name: 'Jamón serrano', icon: Beef, description: 'Salazón española tradicional' },
        { name: 'Gazpacho', icon: Apple, description: 'Frescura mediterránea' },
        { name: 'Paella', icon: Utensils, description: 'Arroz con mariscos y azafrán' }
      );
      pairings.gastronomicos.push(
        { name: 'Salmón', icon: Fish, description: 'Pescado graso de textura oleosa' },
        { name: 'Magret de pato', icon: ChefHat, description: 'Ave de caza refinada' },
        { name: 'Tartar de atún', icon: Star, description: 'Pescado crudo de alta calidad' }
      );
    }

    return pairings;
  };

  const getConsumptionOccasions = (style: WineStyle) => {
    const occasions = [];
    const cleanName = cleanStyleName(style.name).toLowerCase();

    if (cleanName.includes('burbuja') || cleanName.includes('brut')) {
      occasions.push(
        { icon: Star, time: 'Celebraciones', description: 'Brindis y momentos especiales' },
        { icon: Sun, time: 'Aperitivo', description: 'Inicio perfecto de una comida' },
        { icon: Users, time: 'Reuniones sociales', description: 'Ambiente festivo y elegante' }
      );
    } else if (cleanName.includes('blanco')) {
      occasions.push(
        { icon: Sun, time: 'Comida veraniega', description: 'Días calurosos y terrazas' },
        { icon: Fish, time: 'Almuerzo marinero', description: 'Pescados y mariscos frescos' },
        { icon: Coffee, time: 'Aperitivo relajado', description: 'Momento de desconexión' }
      );
    } else if (cleanName.includes('tinto')) {
      occasions.push(
        { icon: Moon, time: 'Cena íntima', description: 'Momentos románticos especiales' },
        { icon: Users, time: 'Cena con amigos', description: 'Conversaciones largas y profundas' },
        { icon: Calendar, time: 'Fin de semana', description: 'Relajación y buen vivir' }
      );
    } else if (cleanName.includes('rosado')) {
      occasions.push(
        { icon: Sun, time: 'Comida al aire libre', description: 'Picnics y barbacoas' },
        { icon: Heart, time: 'Cita romántica', description: 'Ambiente delicado y especial' },
        { icon: Users, time: 'Reunión familiar', description: 'Versatilidad para todos los gustos' }
      );
    }

    return occasions;
  };

  const getWineExamples = (style: WineStyle): WineExample[] => {
    const cleanName = cleanStyleName(style.name).toLowerCase();
    
    // Ejemplos representativos basados en el estilo
    if (cleanName.includes('burbuja fresca')) {
      return [
        { name: 'Cava Brut Nature', region: 'D.O. Cava', grape: 'Macabeo, Xarel·lo', priceRange: '8-15€', description: 'Frescura y elegancia mediterránea' },
        { name: 'Prosecco di Valdobbiadene', region: 'DOCG Italia', grape: 'Glera', priceRange: '12-20€', description: 'Burbujas finas y aromáticas' },
        { name: 'Crémant de Loire', region: 'Francia', grape: 'Chenin Blanc', priceRange: '10-18€', description: 'Mineralidad del Valle del Loira' }
      ];
    } else if (cleanName.includes('brut elegante')) {
      return [
        { name: 'Champagne Brut', region: 'A.O.C. Champagne', grape: 'Chardonnay, Pinot Noir', priceRange: '35-80€', description: 'La referencia mundial en elegancia' },
        { name: 'Cava Gran Reserva', region: 'D.O. Cava', grape: 'Chardonnay, Pinot Noir', priceRange: '18-35€', description: 'Complejidad tras larga crianza' },
        { name: 'Franciacorta DOCG', region: 'Italia', grape: 'Chardonnay', priceRange: '25-45€', description: 'Sofisticación italiana' }
      ];
    } else if (cleanName.includes('blanco vital')) {
      return [
        { name: 'Riesling', region: 'D.O. Rías Baixas', grape: 'Riesling', priceRange: '12-25€', description: 'Acidez vibrante y mineralidad' },
        { name: 'Sauvignon Blanc', region: 'D.O. Rueda', grape: 'Sauvignon Blanc', priceRange: '8-16€', description: 'Frescura herbácea intensa' },
        { name: 'Albariño', region: 'D.O. Rías Baixas', grape: 'Albariño', priceRange: '10-20€', description: 'Mineralidad atlántica única' }
      ];
    } else if (cleanName.includes('tinto versátil')) {
      return [
        { name: 'Tempranillo Crianza', region: 'D.O. Ribera del Duero', grape: 'Tempranillo', priceRange: '15-30€', description: 'Equilibrio perfecto español' },
        { name: 'Garnacha', region: 'D.O. Campo de Borja', grape: 'Garnacha', priceRange: '8-18€', description: 'Versatilidad mediterránea' },
        { name: 'Merlot', region: 'V.T. Castilla', grape: 'Merlot', priceRange: '6-15€', description: 'Suavidad internacional' }
      ];
    } else {
      return [
        { name: 'Vino Representativo 1', region: 'Región Destacada', grape: 'Varietal Principal', priceRange: '10-25€', description: 'Ejemplo característico del estilo' },
        { name: 'Vino Representativo 2', region: 'Otra Región', grape: 'Varietal Secundario', priceRange: '12-30€', description: 'Alternativa con personalidad propia' },
        { name: 'Vino Representativo 3', region: 'Región Premium', grape: 'Blend Selecto', priceRange: '20-45€', description: 'Versión premium del estilo' }
      ];
    }
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

  const config = getStyleConfig(style.name);
  const IconComponent = config.icon;
  const pairings = getPairings(style);
  const occasions = getConsumptionOccasions(style);
  const wineExamples = getWineExamples(style);

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <div className={`relative ${config.bgImage} overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
        <div className="relative container mx-auto px-4 py-16">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/wine-styles')}
            className="mb-8 text-gray-700 hover:text-gray-900 hover:bg-white/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Estilos
          </Button>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${config.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <Badge className={`bg-${config.color}-100 text-${config.color}-800 px-4 py-2 text-lg`}>
                  {cleanStyleName(style.name)}
                </Badge>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {config.heroPhrase}
              </h1>
              
              <p className="text-xl text-gray-700 leading-relaxed">
                {style.description}
              </p>
            </div>
            
            <div className="lg:order-first">
              <div className={`w-full h-80 bg-gradient-to-br ${config.gradient} rounded-3xl shadow-2xl relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-center">
                    <IconComponent className="h-24 w-24 text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Descripción Evocadora */}
        <Card className="overflow-hidden">
          <CardHeader className={`bg-gradient-to-r ${config.gradient} text-white`}>
            <CardTitle className="text-2xl flex items-center gap-3">
              <Eye className="h-6 w-6" />
              Experiencia Sensorial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-lg text-gray-700 leading-relaxed">
              {getEvocativeDescription(style)}
            </p>
          </CardContent>
        </Card>

        <div className="grid xl:grid-cols-3 gap-8">
          {/* Columna Principal */}
          <div className="xl:col-span-2 space-y-8">
            {/* Perfil Sensorial Mejorado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Zap className="h-6 w-6" />
                  Perfil Sensorial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { label: 'Potencia', value: style.potente, icon: Mountain, description: 'Intensidad general' },
                    { label: 'Acidez', value: style.acidez, icon: Zap, description: 'Frescura y vivacidad' },
                    { label: 'Dulzura', value: style.dulce, icon: Heart, description: 'Percepción dulce' },
                    { label: 'Taninos', value: style.tanico, icon: Grape, description: 'Estructura y cuerpo' },
                    { label: 'Afrutado', value: style.afrutado, icon: Apple, description: 'Aromas frutales' }
                  ].map((attr, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <attr.icon className="h-5 w-5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{attr.label}</span>
                            <span className="text-sm text-gray-500">{attr.value}/10</span>
                          </div>
                          <p className="text-xs text-gray-500">{attr.description}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={attr.value * 10} className="h-3" />
                        <div className="flex justify-between mt-1">
                          {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                            <div key={num} className={`w-1 h-2 rounded-full ${attr.value >= num ? `bg-${config.color}-500` : 'bg-gray-200'}`}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Maridajes Expandidos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <ChefHat className="h-6 w-6" />
                  Maridajes Recomendados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    Maridajes Cotidianos
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {pairings.cotidianos.map((pairing, index) => (
                      <div key={index} className={`p-4 bg-${config.color}-50 rounded-lg border border-${config.color}-100`}>
                        <div className="flex items-center gap-3 mb-2">
                          <pairing.icon className={`h-6 w-6 text-${config.color}-600`} />
                          <h4 className={`font-semibold text-${config.color}-800`}>{pairing.name}</h4>
                        </div>
                        <p className={`text-sm text-${config.color}-700`}>{pairing.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Maridajes Gastronómicos
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {pairings.gastronomicos.map((pairing, index) => (
                      <div key={index} className={`p-4 bg-gradient-to-br from-${config.color}-100 to-${config.color}-50 rounded-lg border border-${config.color}-200`}>
                        <div className="flex items-center gap-3 mb-2">
                          <pairing.icon className={`h-6 w-6 text-${config.color}-700`} />
                          <h4 className={`font-semibold text-${config.color}-900`}>{pairing.name}</h4>
                        </div>
                        <p className={`text-sm text-${config.color}-800`}>{pairing.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ocasiones de Consumo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Clock className="h-6 w-6" />
                  Momentos Perfectos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {occasions.map((occasion, index) => (
                    <div key={index} className="text-center space-y-3">
                      <div className={`w-16 h-16 bg-gradient-to-r ${config.gradient} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
                        <occasion.icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">{occasion.time}</h3>
                      <p className="text-sm text-gray-600">{occasion.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selección Destacada */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Wine className="h-6 w-6" />
                  Vinos Representativos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {wineExamples.map((wine, index) => (
                    <div key={index} className={`p-4 border border-${config.color}-200 rounded-lg hover:shadow-md transition-shadow`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{wine.name}</h3>
                        <Badge variant="outline" className={`text-${config.color}-700 border-${config.color}-300`}>
                          {wine.priceRange}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 mb-2 text-sm text-gray-600">
                        <span><strong>Región:</strong> {wine.region}</span>
                        <span><strong>Uva:</strong> {wine.grape}</span>
                      </div>
                      <p className="text-sm text-gray-700">{wine.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Servicio Recomendado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Temperatura</h4>
                  <p className="text-sm text-gray-600">
                    {cleanStyleName(style.name).toLowerCase().includes('espumoso') || cleanStyleName(style.name).toLowerCase().includes('burbuja') || cleanStyleName(style.name).toLowerCase().includes('brut') ? '6-8°C' :
                     cleanStyleName(style.name).toLowerCase().includes('blanco') ? '8-12°C' :
                     cleanStyleName(style.name).toLowerCase().includes('rosado') ? '10-12°C' :
                     cleanStyleName(style.name).toLowerCase().includes('tinto') ? '16-18°C' : '12-14°C'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Decantación</h4>
                  <p className="text-sm text-gray-600">
                    {style.tanico >= 6 ? 'Recomendada 30-60 min' : 'No necesaria'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Copa</h4>
                  <p className="text-sm text-gray-600">
                    {cleanStyleName(style.name).toLowerCase().includes('espumoso') || cleanStyleName(style.name).toLowerCase().includes('burbuja') || cleanStyleName(style.name).toLowerCase().includes('brut') ? 'Flauta o tulipán' :
                     cleanStyleName(style.name).toLowerCase().includes('blanco') || cleanStyleName(style.name).toLowerCase().includes('rosado') ? 'Copa de vino blanco' :
                     'Copa de vino tinto'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Datos y Storytelling */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  ¿Sabías que...?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 bg-${config.color}-50 rounded-lg`}>
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Curiosidad:</strong> {config.curiosity}
                  </p>
                  <p className="text-sm text-gray-600 italic">
                    {config.story}
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