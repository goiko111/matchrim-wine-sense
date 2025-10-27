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
  Users, Utensils, Coffee, Cake, Fish, Beef, Apple, Flame, Beaker, Shield, Sword, Feather, Leaf,
  Mountain, Diamond, Thermometer, Eye, ChefHat, Calendar
} from 'lucide-react';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [style, setStyle] = useState<WineStyle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchWineStyle();
    }
  }, [slug]);

  const fetchWineStyle = async () => {
    if (!slug) return;

    try {
      // Primero obtenemos todos los estilos
      const { data: allStyles, error } = await supabase
        .from('wine_styles')
        .select('*');

      if (error) throw error;

      // Función para limpiar el nombre
      const cleanName = (name: string) => {
        return name
          .replace(/^\d+;\d+;\d+;\d+;\d+;/, '') // Quitar prefijo numérico
          .replace(/\s*\(\d+\)\s*$/, '') // Quitar números entre paréntesis
          .trim();
      };

      // Función para generar slug (igual que en WineStylesGrid)
      const generateSlug = (name: string) => {
        return cleanName(name)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      };

      // Función para extraer valores sensoriales del nombre si tiene el prefijo
      const extractSensoryValues = (name: string) => {
        const match = name.match(/^(\d+);(\d+);(\d+);(\d+);(\d+);/);
        if (match) {
          return {
            potente: parseInt(match[1]),
            acidez: parseInt(match[2]),
            dulce: parseInt(match[3]),
            tanico: parseInt(match[4]),
            afrutado: parseInt(match[5])
          };
        }
        return null;
      };

      // Buscar el estilo que coincida con el slug
      const matchedStyle = allStyles?.find(s => generateSlug(s.name) === slug);

      if (matchedStyle) {
        // Extraer valores sensoriales del nombre si existen
        const sensoryValues = extractSensoryValues(matchedStyle.name);
        
        // Si el nombre tiene el prefijo con valores, usarlos; si no, usar los de la BD
        const finalStyle = {
          ...matchedStyle,
          name: cleanName(matchedStyle.name), // Limpiar el nombre para mostrar
          potente: sensoryValues?.potente ?? matchedStyle.potente,
          acidez: sensoryValues?.acidez ?? matchedStyle.acidez,
          dulce: sensoryValues?.dulce ?? matchedStyle.dulce,
          tanico: sensoryValues?.tanico ?? matchedStyle.tanico,
          afrutado: sensoryValues?.afrutado ?? matchedStyle.afrutado
        };
        
        setStyle(finalStyle);
        return;
      }

      // Fallback: usar placeholder si el slug pertenece a uno de los 16 estilos base
      const baseNames = [
        'Burbuja Fresca', 'Brut Elegante', 'Blanco Vital', 'Blanco Goloso',
        'Dulce Intenso', 'Oxidativo/Maduro', 'Experimental', 'Vino de Terruño',
        'Tinto Versátil', 'Tinto de Estructura', 'Tinto Goloso', 'Dulce Ligero',
        'Blanco de Carácter', 'Rosado Ligero', 'Rosado Gastronómico', 'Tinto Ligero'
      ];
      const fallbackName = baseNames.find(n => generateSlug(n) === slug);
      if (fallbackName) {
        setStyle({
          id: `placeholder-${slug}`,
          name: fallbackName,
          description: 'Próximamente',
          potente: 0,
          acidez: 0,
          dulce: 0,
          tanico: 0,
          afrutado: 0,
        });
        return;
      }

      throw new Error('Wine style not found');
    } catch (error: any) {
      console.error('Error fetching wine style:', error);
      toast({
        title: "Error",
        description: "No hemos encontrado este estilo.",
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
        icon: Diamond,
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
      },
      'dulce intenso': {
        icon: Flame,
        color: 'amber',
        gradient: 'from-amber-500 to-orange-600',
        heroPhrase: 'Intensidad dulce que abraza el alma',
        bgImage: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100',
        curiosity: 'Su concentración azucarera puede alcanzar los 300 gramos por litro.',
        story: 'Un vino que despierta emociones profundas, perfecto para momentos de contemplación y celebración.'
      },
      'dulce ligero': {
        icon: Feather,
        color: 'orange',
        gradient: 'from-orange-300 to-amber-400',
        heroPhrase: 'Dulzura sutil que acaricia el paladar',
        bgImage: 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100',
        curiosity: 'Su equilibrio permite maridar tanto con postres como con foie gras.',
        story: 'La elegancia de lo sutil, donde cada sorbo es una caricia delicada al paladar.'
      },
      'experimental': {
        icon: Beaker,
        color: 'purple',
        gradient: 'from-purple-500 to-indigo-600',
        heroPhrase: 'La vanguardia enológica sin límites',
        bgImage: 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-100',
        curiosity: 'Técnicas innovadoras como la maceración carbónica o fermentación en ánforas.',
        story: 'Donde la tradición se encuentra con la innovación, creando experiencias únicas e inolvidables.'
      },
      'oxidativo/maduro': {
        icon: Clock,
        color: 'amber',
        gradient: 'from-amber-600 to-orange-700',
        heroPhrase: 'El tiempo como maestro enólogo',
        bgImage: 'bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100',
        curiosity: 'La crianza oxidativa puede durar décadas, desarrollando aromas únicos de frutos secos.',
        story: 'Paciencia convertida en néctar, donde cada año añade una nueva capa de complejidad.'
      },
      'vino de terruño': {
        icon: Mountain,
        color: 'stone',
        gradient: 'from-stone-600 to-slate-700',
        heroPhrase: 'La expresión pura de la tierra',
        bgImage: 'bg-gradient-to-br from-stone-50 via-slate-50 to-gray-100',
        curiosity: 'Cada viñedo transmite características únicas del suelo, clima y microclima.',
        story: 'La voz de la tierra hecha vino, donde cada sorbo narra la historia de su origen.'
      },
      'blanco de carácter': {
        icon: Wine,
        color: 'amber',
        gradient: 'from-amber-500 to-yellow-600',
        heroPhrase: 'Personalidad definida en cada copa',
        bgImage: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100',
        curiosity: 'Su crianza en barrica aporta complejidad y capacidad de guarda.',
        story: 'Un blanco con alma de tinto, que desafía las expectativas y conquista paladares exigentes.'
      },
      'tinto ligero': {
        icon: Leaf,
        color: 'red',
        gradient: 'from-red-400 to-pink-500',
        heroPhrase: 'Elegancia en ligereza, frescura sin límites',
        bgImage: 'bg-gradient-to-br from-red-50 via-pink-50 to-rose-100',
        curiosity: 'Su bajo contenido tánico permite servirlo ligeramente refrigerado.',
        story: 'La demostración de que la elegancia no requiere peso, sino finura y equilibrio.'
      }
    };

    return configs[cleanName] || {
      icon: Wine,
      color: 'gray',
      gradient: 'from-gray-600 to-gray-800',
      heroPhrase: 'Un estilo único con personalidad propia',
      bgImage: 'bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-100',
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
    if (style.afrutado >= 4) {
      description += `Su nariz estalla en una sinfonía de aromas frutales, donde cada inhalación revela capas de complejidad aromática. `;
    } else if (style.afrutado <= 1) {
      description += `Su perfil aromático es sutil y mineral, invitando a descubrir matices terrosos y especiados que hablan de su origen. `;
    } else {
      description += `Su bouquet equilibrado combina notas frutales con toques minerales, creando una armonía olfativa única. `;
    }
    
    // Textura en boca
    if (style.tanico >= 4) {
      description += `En boca, sus taninos firmes estructuran cada sorbo, proporcionando una sensación de plenitud y carácter robusto. `;
    } else if (style.tanico <= 1) {
      description += `Su textura sedosa acaricia el paladar, ofreciendo una experiencia suave y envolvente. `;
    } else {
      description += `Su estructura equilibrada proporciona una sensación armoniosa, ni demasiado robusta ni excesivamente delicada. `;
    }
    
    // Acidez y frescura
    if (style.acidez >= 4) {
      description += `Su acidez vibrante aporta una frescura revitalizante que limpia el paladar y prepara para el siguiente sorbo. `;
    } else if (style.acidez <= 1) {
      description += `Su acidez contenida permite que otros sabores se expresen plenamente, creando una sensación de redondez. `;
    }
    
    // Final
    description += `Es el vino perfecto para momentos donde se busca ${style.potente >= 4 ? 'intensidad y carácter' : style.potente <= 1 ? 'elegancia y sutileza' : 'equilibrio y versatilidad'}.`;
    
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
    } else if (cleanName.includes('dulce')) {
      pairings.cotidianos.push(
        { name: 'Tarta de manzana', icon: Cake, description: 'Postre clásico reconfortante' },
        { name: 'Queso azul', icon: Cake, description: 'Contraste salado perfecto' },
        { name: 'Frutos secos', icon: Apple, description: 'Combinación natural dulce' }
      );
      pairings.gastronomicos.push(
        { name: 'Foie gras', icon: ChefHat, description: 'Lujo gastronómico supremo' },
        { name: 'Chocolate negro', icon: Star, description: 'Intensidad aromática única' },
        { name: 'Postres elaborados', icon: Cake, description: 'Creaciones de alta repostería' }
      );
    } else if (cleanName.includes('experimental')) {
      pairings.cotidianos.push(
        { name: 'Quesos artesanos', icon: Cake, description: 'Sabores únicos y naturales' },
        { name: 'Charcutería ibérica', icon: Beef, description: 'Tradición y modernidad' },
        { name: 'Panes de masa madre', icon: Utensils, description: 'Fermentación natural' }
      );
      pairings.gastronomicos.push(
        { name: 'Cocina de autor', icon: ChefHat, description: 'Creatividad gastronómica' },
        { name: 'Fermentados', icon: Star, description: 'Técnicas ancestrales' },
        { name: 'Platos veganos', icon: Apple, description: 'Nueva gastronomía sostenible' }
      );
    } else if (cleanName.includes('oxidativo') || cleanName.includes('maduro')) {
      pairings.cotidianos.push(
        { name: 'Jamón ibérico', icon: Beef, description: 'Curación perfecta' },
        { name: 'Almendras', icon: Apple, description: 'Frutos secos tostados' },
        { name: 'Tapas tradicionales', icon: Utensils, description: 'Tradición española pura' }
      );
      pairings.gastronomicos.push(
        { name: 'Consommés', icon: ChefHat, description: 'Caldos concentrados' },
        { name: 'Pato confitado', icon: Star, description: 'Cocción lenta tradicional' },
        { name: 'Quesos añejos', icon: Cake, description: 'Maduración perfecta' }
      );
    } else if (cleanName.includes('terruño')) {
      pairings.cotidianos.push(
        { name: 'Productos locales', icon: Apple, description: 'Ingredientes del territorio' },
        { name: 'Carnes de caza', icon: Beef, description: 'Sabores silvestres auténticos' },
        { name: 'Setas de temporada', icon: Utensils, description: 'Frutos del bosque' }
      );
      pairings.gastronomicos.push(
        { name: 'Cuisine terroir', icon: ChefHat, description: 'Cocina del territorio' },
        { name: 'Trufa negra', icon: Star, description: 'Diamante negro gastronómico' },
        { name: 'Preparaciones ancestrales', icon: Cake, description: 'Técnicas tradicionales' }
      );
    } else {
      // Maridajes genéricos para estilos no específicos
      pairings.cotidianos.push(
        { name: 'Tabla de quesos', icon: Cake, description: 'Variedad de sabores y texturas' },
        { name: 'Jamón serrano', icon: Beef, description: 'Clásico español universal' },
        { name: 'Frutos secos', icon: Apple, description: 'Aperitivo tradicional' }
      );
      pairings.gastronomicos.push(
        { name: 'Platos de temporada', icon: ChefHat, description: 'Ingredientes estacionales' },
        { name: 'Carnes selectas', icon: Star, description: 'Cortes premium' },
        { name: 'Pescados nobles', icon: Fish, description: 'Especies de alta calidad' }
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
    } else if (cleanName.includes('dulce')) {
      occasions.push(
        { icon: Moon, time: 'Sobremesa', description: 'Final perfecto de una cena' },
        { icon: Heart, time: 'Momento íntimo', description: 'Compartir dulzura especial' },
        { icon: Star, time: 'Ocasión especial', description: 'Celebraciones memorables' }
      );
    } else if (cleanName.includes('experimental')) {
      occasions.push(
        { icon: Coffee, time: 'Cata exploratoria', description: 'Descubrir nuevos sabores' },
        { icon: Users, time: 'Reunión de curiosos', description: 'Paladares aventureros' },
        { icon: Star, time: 'Experiencia única', description: 'Momentos de descubrimiento' }
      );
    } else if (cleanName.includes('oxidativo') || cleanName.includes('maduro')) {
      occasions.push(
        { icon: Clock, time: 'Sobremesa larga', description: 'Conversaciones pausadas' },
        { icon: Coffee, time: 'Aperitivo tradicional', description: 'Ritual español auténtico' },
        { icon: Users, time: 'Tertulia', description: 'Intercambio cultural y social' }
      );
    } else if (cleanName.includes('terruño')) {
      occasions.push(
        { icon: Mountain, time: 'Cena gastronómica', description: 'Experiencia del territorio' },
        { icon: Calendar, time: 'Ocasión especial', description: 'Momentos memorables' },
        { icon: Heart, time: 'Cena íntima', description: 'Compartir autenticidad' }
      );
    } else {
      // Ocasiones genéricas para cualquier estilo
      occasions.push(
        { icon: Sun, time: 'Comida casual', description: 'Momentos relajados y agradables' },
        { icon: Users, time: 'Reunión social', description: 'Compartir con amigos' },
        { icon: Heart, time: 'Momento especial', description: 'Ocasiones que merecen celebrarse' }
      );
    }

    return occasions;
  };

  const getWineExamples = (style: WineStyle): WineExample[] => {
    const cleanName = cleanStyleName(style.name).toLowerCase();
    
    // Ejemplos representativos basados en el estilo
    if (cleanName.includes('burbuja fresca')) {
      return [
        { name: 'Cava Brut Nature', region: 'D.O. Cava, España', grape: 'Macabeo, Xarel·lo', priceRange: '8-15€', description: 'Frescura y elegancia mediterránea' },
        { name: 'Prosecco di Valdobbiadene', region: 'DOCG, Italia', grape: 'Glera', priceRange: '12-20€', description: 'Burbujas finas y aromáticas' },
        { name: 'Crémant de Loire', region: 'Valle del Loira, Francia', grape: 'Chenin Blanc', priceRange: '10-18€', description: 'Mineralidad del Valle del Loira' },
        { name: 'Sekt', region: 'Alemania', grape: 'Riesling', priceRange: '10-22€', description: 'Precisión alemana espumosa' }
      ];
    } else if (cleanName.includes('brut elegante')) {
      return [
        { name: 'Champagne Brut', region: 'A.O.C. Champagne, Francia', grape: 'Chardonnay, Pinot Noir', priceRange: '35-80€', description: 'La referencia mundial en elegancia' },
        { name: 'Cava Gran Reserva', region: 'D.O. Cava, España', grape: 'Chardonnay, Pinot Noir', priceRange: '18-35€', description: 'Complejidad tras larga crianza' },
        { name: 'Franciacorta DOCG', region: 'Lombardía, Italia', grape: 'Chardonnay', priceRange: '25-45€', description: 'Sofisticación italiana' },
        { name: 'English Sparkling Wine', region: 'Sussex, Reino Unido', grape: 'Chardonnay, Pinot Noir', priceRange: '30-55€', description: 'Nueva elegancia británica' }
      ];
    } else if (cleanName.includes('blanco vital')) {
      return [
        { name: 'Albariño', region: 'D.O. Rías Baixas, España', grape: 'Albariño', priceRange: '10-20€', description: 'Mineralidad atlántica única' },
        { name: 'Sauvignon Blanc', region: 'Marlborough, Nueva Zelanda', grape: 'Sauvignon Blanc', priceRange: '12-22€', description: 'Explosión aromática del Pacífico' },
        { name: 'Riesling Trocken', region: 'Mosel, Alemania', grape: 'Riesling', priceRange: '12-25€', description: 'Acidez vibrante y mineralidad' },
        { name: 'Vermentino', region: 'Cerdeña, Italia', grape: 'Vermentino', priceRange: '10-18€', description: 'Frescura mediterránea' }
      ];
    } else if (cleanName.includes('blanco goloso')) {
      return [
        { name: 'Gewürztraminer', region: 'Alsacia, Francia', grape: 'Gewürztraminer', priceRange: '15-28€', description: 'Aromático y seductor' },
        { name: 'Viognier', region: 'Condrieu, Francia', grape: 'Viognier', priceRange: '18-35€', description: 'Expresividad floral única del Ródano' },
        { name: 'Moscatel', region: 'D.O. Valencia, España', grape: 'Moscatel', priceRange: '8-18€', description: 'Dulzura natural equilibrada' },
        { name: 'Torrontés', region: 'Salta, Argentina', grape: 'Torrontés', priceRange: '10-20€', description: 'Aromático de alta montaña' }
      ];
    } else if (cleanName.includes('blanco de carácter')) {
      return [
        { name: 'Chardonnay Barrica', region: 'D.O. Somontano, España', grape: 'Chardonnay', priceRange: '15-30€', description: 'Complejidad y estructura' },
        { name: 'Chablis Premier Cru', region: 'Borgoña, Francia', grape: 'Chardonnay', priceRange: '25-50€', description: 'Mineralidad y elegancia borgoñona' },
        { name: 'Godello', region: 'D.O. Valdeorras, España', grape: 'Godello', priceRange: '12-25€', description: 'Mineralidad y carácter atlántico' },
        { name: 'Grüner Veltliner Smaragd', region: 'Wachau, Austria', grape: 'Grüner Veltliner', priceRange: '18-35€', description: 'Potencia y finura austríaca' }
      ];
    } else if (cleanName.includes('tinto versátil')) {
      return [
        { name: 'Tempranillo Crianza', region: 'D.O. Ribera del Duero, España', grape: 'Tempranillo', priceRange: '15-30€', description: 'Equilibrio perfecto español' },
        { name: 'Chianti Classico', region: 'Toscana, Italia', grape: 'Sangiovese', priceRange: '12-25€', description: 'Versatilidad italiana clásica' },
        { name: 'Côtes du Rhône', region: 'Valle del Ródano, Francia', grape: 'Garnacha, Syrah', priceRange: '10-20€', description: 'Equilibrio mediterráneo francés' },
        { name: 'Malbec', region: 'Mendoza, Argentina', grape: 'Malbec', priceRange: '12-22€', description: 'Suavidad andina concentrada' }
      ];
    } else if (cleanName.includes('tinto de estructura')) {
      return [
        { name: 'Cabernet Sauvignon Reserva', region: 'Valle de Maipo, Chile', grape: 'Cabernet Sauvignon', priceRange: '18-40€', description: 'Potencia andina estructurada' },
        { name: 'Tempranillo Gran Reserva', region: 'D.O.Ca. Rioja, España', grape: 'Tempranillo', priceRange: '25-60€', description: 'Madurez y complejidad' },
        { name: 'Barolo DOCG', region: 'Piemonte, Italia', grape: 'Nebbiolo', priceRange: '35-80€', description: 'Rey de los vinos italianos' },
        { name: 'Priorat', region: 'D.O.Q. Priorat, España', grape: 'Garnacha, Cariñena', priceRange: '25-70€', description: 'Concentración y mineralidad' }
      ];
    } else if (cleanName.includes('tinto goloso')) {
      return [
        { name: 'Garnacha Joven', region: 'D.O. Navarra, España', grape: 'Garnacha', priceRange: '6-12€', description: 'Fruta exuberante y jugosa' },
        { name: 'Zinfandel', region: 'California, EE.UU.', grape: 'Zinfandel', priceRange: '15-30€', description: 'Fruta madura californiana' },
        { name: 'Valpolicella Ripasso', region: 'Véneto, Italia', grape: 'Corvina', priceRange: '15-28€', description: 'Dulzura frutal italiana' },
        { name: 'Carmenère', region: 'Valle de Colchagua, Chile', grape: 'Carmenère', priceRange: '12-22€', description: 'Jugosidad chilena especiada' }
      ];
    } else if (cleanName.includes('tinto ligero')) {
      return [
        { name: 'Pinot Noir', region: 'Borgoña, Francia', grape: 'Pinot Noir', priceRange: '20-50€', description: 'Elegancia borgoñona suprema' },
        { name: 'Gamay', region: 'Beaujolais, Francia', grape: 'Gamay', priceRange: '12-22€', description: 'Ligereza y frescura francesa' },
        { name: 'Mencía', region: 'D.O. Bierzo, España', grape: 'Mencía', priceRange: '10-20€', description: 'Finura atlántica española' },
        { name: 'Schiava', region: 'Alto Adige, Italia', grape: 'Schiava', priceRange: '12-20€', description: 'Delicadeza alpina' }
      ];
    } else if (cleanName.includes('rosado ligero')) {
      return [
        { name: 'Rosado de Garnacha', region: 'D.O. Navarra, España', grape: 'Garnacha', priceRange: '6-12€', description: 'Frescura mediterránea' },
        { name: 'Rosé de Provence', region: 'Provenza, Francia', grape: 'Cinsault, Grenache', priceRange: '15-25€', description: 'Delicadeza provenzal icónica' },
        { name: 'Bardolino Chiaretto', region: 'Véneto, Italia', grape: 'Corvina', priceRange: '8-15€', description: 'Ligereza del lago de Garda' },
        { name: 'White Zinfandel', region: 'California, EE.UU.', grape: 'Zinfandel', priceRange: '6-12€', description: 'Dulzura frutal americana' }
      ];
    } else if (cleanName.includes('rosado gastronómico')) {
      return [
        { name: 'Rosado Fermentado en Barrica', region: 'D.O. Somontano, España', grape: 'Pinot Noir', priceRange: '18-30€', description: 'Complejidad gastronómica' },
        { name: 'Tavel Rosé', region: 'Valle del Ródano, Francia', grape: 'Grenache', priceRange: '15-28€', description: 'Potencia rosada francesa' },
        { name: 'Rosé de Saignée', region: 'D.O. Toro, España', grape: 'Tinta de Toro', priceRange: '15-25€', description: 'Intensidad y carácter' },
        { name: 'Cerasuolo d\'Abruzzo', region: 'Abruzzo, Italia', grape: 'Montepulciano', priceRange: '12-20€', description: 'Estructura rosada italiana' }
      ];
    } else if (cleanName.includes('dulce intenso')) {
      return [
        { name: 'Pedro Ximénez', region: 'D.O. Jerez, España', grape: 'Pedro Ximénez', priceRange: '20-40€', description: 'Dulzura concentrada extrema' },
        { name: 'Sauternes', region: 'Burdeos, Francia', grape: 'Sémillon, Sauvignon', priceRange: '30-80€', description: 'Noble dulzura botritizada' },
        { name: 'Tokaji Aszú', region: 'Tokaj, Hungría', grape: 'Furmint', priceRange: '25-60€', description: 'Dulzura imperial histórica' },
        { name: 'Eiswein', region: 'Rheingau, Alemania', grape: 'Riesling', priceRange: '35-80€', description: 'Dulzura de hielo concentrada' }
      ];
    } else if (cleanName.includes('dulce ligero')) {
      return [
        { name: 'Moscatel de Grano Menudo', region: 'D.O. Rías Baixas, España', grape: 'Moscatel', priceRange: '12-25€', description: 'Dulzura delicada atlántica' },
        { name: 'Vin Santo', region: 'Toscana, Italia', grape: 'Trebbiano, Malvasia', priceRange: '20-40€', description: 'Tradición toscana dulce' },
        { name: 'Riesling Kabinett', region: 'Mosel, Alemania', grape: 'Riesling', priceRange: '15-25€', description: 'Equilibrio perfecto dulce-ácido' },
        { name: 'Muscat de Beaumes-de-Venise', region: 'Valle del Ródano, Francia', grape: 'Muscat', priceRange: '15-30€', description: 'Dulzura aromática sureña' }
      ];
    } else if (cleanName.includes('experimental')) {
      return [
        { name: 'Vino Naranja', region: 'D.O. Penedès, España', grape: 'Xarel·lo', priceRange: '20-35€', description: 'Maceración pelicular innovadora' },
        { name: 'Vino Naranja de Georgia', region: 'Kakheti, Georgia', grape: 'Rkatsiteli', priceRange: '18-35€', description: 'Tradición milenaria en qvevri' },
        { name: 'Pet-Nat', region: 'Loire, Francia', grape: 'Chenin Blanc', priceRange: '15-28€', description: 'Método ancestral francés' },
        { name: 'Natural Wine', region: 'Friuli, Italia', grape: 'Ribolla Gialla', priceRange: '22-40€', description: 'Vino natural italiano de vanguardia' }
      ];
    } else if (cleanName.includes('oxidativo') || cleanName.includes('maduro')) {
      return [
        { name: 'Amontillado', region: 'D.O. Jerez, España', grape: 'Palomino', priceRange: '18-35€', description: 'Crianza oxidativa compleja' },
        { name: 'Palo Cortado', region: 'D.O. Jerez, España', grape: 'Palomino', priceRange: '25-50€', description: 'Elegancia oxidativa única' },
        { name: 'Vin Jaune', region: 'Jura, Francia', grape: 'Savagnin', priceRange: '35-70€', description: 'Crianza oxidativa francesa bajo velo' },
        { name: 'Marsala Vergine', region: 'Sicilia, Italia', grape: 'Grillo', priceRange: '20-45€', description: 'Tradición oxidativa siciliana' }
      ];
    } else if (cleanName.includes('vino de terruño') || cleanName.includes('terruno')) {
      return [
        { name: 'Priorat Vi de Vila', region: 'D.O.Q. Priorat, España', grape: 'Garnacha, Cariñena', priceRange: '30-60€', description: 'Mineralidad de licorella' },
        { name: 'Clos de Vougeot', region: 'Borgoña, Francia', grape: 'Pinot Noir', priceRange: '80-200€', description: 'Expresión máxima del terruño borgoñón' },
        { name: 'Barolo Bussia', region: 'Piemonte, Italia', grape: 'Nebbiolo', priceRange: '50-120€', description: 'Terruño singular de las Langhe' },
        { name: 'Etna Rosso', region: 'Sicilia, Italia', grape: 'Nerello Mascalese', priceRange: '25-55€', description: 'Mineralidad volcánica única' }
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
    <>
      {user ? <AppNav /> : <Header />}
      <div className="min-h-screen">
      
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
                  <span className="text-2xl font-bold text-white">
                    {cleanStyleName(style.name).split(' ').map(word => word[0]).join('').toUpperCase()}
                  </span>
                </div>
                <Badge className={`bg-${config.color}-100 text-${config.color}-800 px-4 py-2 text-lg`}>
                  {cleanStyleName(style.name)}
                </Badge>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {config.heroPhrase}
              </h1>
              
              <p className="text-xl text-gray-700 leading-relaxed">
                {style.description || config.story || getEvocativeDescription(style)}
              </p>
            </div>
            
            <div className="lg:order-first">
              <div className={`w-full h-80 bg-gradient-to-br ${config.gradient} rounded-3xl shadow-2xl relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <IconComponent className="h-32 w-32 text-white/90" />
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
                  ].map((attr, index) => {
                    // Rango típico del estilo: números enteros alrededor del valor central
                    const minRange = Math.max(0, attr.value - 1);
                    const maxRange = Math.min(5, attr.value + 1);
                    
                    // Obtener colores de la paleta del estilo
                    const getAttributeColors = () => {
                      const baseColor = config.color;
                      switch(baseColor) {
                        case 'emerald':
                          return { light: 'bg-emerald-200', medium: 'bg-emerald-400', dark: 'bg-emerald-600' };
                        case 'yellow':
                          return { light: 'bg-yellow-200', medium: 'bg-yellow-400', dark: 'bg-yellow-600' };
                        case 'orange':
                          return { light: 'bg-orange-200', medium: 'bg-orange-400', dark: 'bg-orange-600' };
                        case 'red':
                          return { light: 'bg-red-200', medium: 'bg-red-400', dark: 'bg-red-600' };
                        case 'pink':
                          return { light: 'bg-pink-200', medium: 'bg-pink-400', dark: 'bg-pink-600' };
                        case 'amber':
                          return { light: 'bg-amber-200', medium: 'bg-amber-400', dark: 'bg-amber-600' };
                        case 'purple':
                          return { light: 'bg-purple-200', medium: 'bg-purple-400', dark: 'bg-purple-600' };
                        case 'stone':
                          return { light: 'bg-stone-200', medium: 'bg-stone-400', dark: 'bg-stone-600' };
                        default:
                          return { light: 'bg-gray-200', medium: 'bg-gray-400', dark: 'bg-gray-600' };
                      }
                    };
                    
                    const colors = getAttributeColors();
                    
                    return (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <attr.icon className={`h-5 w-5 text-${config.color}-600`} />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{attr.label}</span>
                              <span className="text-sm text-gray-500">
                                {minRange === maxRange ? attr.value : `${minRange}-${maxRange}`} / 5
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{attr.description}</p>
                          </div>
                        </div>
                        
                        {/* Visualización con colores del estilo */}
                        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                          {/* Rango del estilo con color del estilo */}
                          <div 
                            className={`absolute top-0 h-full transition-all duration-300 ${colors.light}`}
                            style={{
                              left: `${(minRange / 5) * 100}%`,
                              width: `${((maxRange - minRange + 1) / 5) * 100}%`
                            }}
                          ></div>
                          
                          {/* Valor típico (centro del estilo) */}
                          <div 
                            className={`absolute top-1 bottom-1 w-1 rounded-full shadow-sm ${colors.dark}`}
                            style={{
                              left: `calc(${(attr.value / 5) * 100}% - 2px)`
                            }}
                          ></div>
                          
                          {/* Marcadores de escala */}
                          {[1, 2, 3, 4].map((mark) => (
                            <div
                              key={mark}
                              className="absolute top-0 bottom-0 w-px bg-gray-300"
                              style={{ left: `${(mark / 5) * 100}%` }}
                            ></div>
                          ))}
                        </div>
                        
                        {/* Leyenda de la escala */}
                        <div className="flex justify-between text-xs text-gray-400 px-1">
                          <span>0</span>
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      </div>
                    );
                  })}
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
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3 mb-2">
                          <pairing.icon className="h-6 w-6 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">{pairing.name}</h4>
                        </div>
                        <p className="text-sm text-blue-700">{pairing.description}</p>
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
                      <div key={index} className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <pairing.icon className="h-6 w-6 text-blue-700" />
                          <h4 className="font-semibold text-blue-900">{pairing.name}</h4>
                        </div>
                        <p className="text-sm text-blue-800">{pairing.description}</p>
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
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
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
                    <div key={index} className="p-4 border border-blue-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{wine.name}</h3>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
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
                    {style.tanico >= 3 ? 'Recomendada 30-60 min' : 'No necesaria'}
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
                  <Star className="h-5 w-5" />
                  ¿Sabías que...?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
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
    </>
  );
};

export default WineStyleDetail;