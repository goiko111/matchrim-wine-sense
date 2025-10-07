import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { QuizResult, calculateCompatibility } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Copy, Wine, Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Sun, Utensils, Leaf, ArrowRight, MapPin } from 'lucide-react';
import RegionMap from './RegionMap';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
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

interface QuizResultsProps {
  result: QuizResult;
  description: string;
  recommendations: string[];
  onRestart: () => void;
}

// Función para generar descripción emocional basada en el radar de atributos
const generateEmotionalDescription = (result: QuizResult): string => {
  let description = "";
  
  // Preferencia por potencia
  if (result.potente >= 4) {
    description += "Disfrutas vinos con personalidad y carácter, que dejan huella en el paladar. ";
  } else if (result.potente <= 2) {
    description += "Aprecias la elegancia y sutileza, vinos que no necesitan gritar para hacerse notar. ";
  }
  
  // Preferencia por acidez
  if (result.acidez >= 4) {
    description += "Tu paladar vibra con la frescura y vivacidad de vinos con buena acidez. ";
  } else if (result.acidez <= 2) {
    description += "Buscas vinos suaves, redondos, con equilibrio y amabilidad en boca. ";
  }
  
  // Preferencia por dulzor
  if (result.dulce >= 4) {
    description += "Disfrutas los matices dulces y la sensación envolvente que acaricia el paladar. ";
  } else if (result.dulce <= 2) {
    description += "Te atrae la sequedad y definición, vinos directos y precisos. ";
  }
  
  // Preferencia por taninos
  if (result.tanico >= 4) {
    description += "Te gusta la estructura tánica, vinos con cuerpo y capacidad de guarda. ";
  } else if (result.tanico <= 2) {
    description += "Prefieres vinos de tanino delicado, sin asperezas que distraigan. ";
  }
  
  // Preferencia por fruta
  if (result.afrutado >= 4) {
    description += "El perfil aromático frutal te conquista, vinos expresivos y de aromas intensos. ";
  } else if (result.afrutado <= 2) {
    description += "Te atraen más las notas minerales, especiadas y complejas que las puramente frutales. ";
  }
  
  return description;
};

const QuizResults: React.FC<QuizResultsProps> = ({ result, description, recommendations, onRestart }) => {
  const navigate = useNavigate();
  const [styleDetails, setStyleDetails] = useState<WineStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

  const chartData = [
    { attribute: "Potente", value: result.potente },
    { attribute: "Acidez", value: result.acidez },
    { attribute: "Dulce", value: result.dulce },
    { attribute: "Tánico", value: result.tanico },
    { attribute: "Afrutado", value: result.afrutado },
  ];
  
  const chartConfig = {
    radar: {
      label: "Radar",
      theme: {
        light: "#be123c",
        dark: "#be123c",
      },
    },
  };
  
  // Generar datos personalizados usando las funciones consistentes
  const profileName = generateMatchrimName(result);
  const emotionalDescription = generateEmotionalDescription(result);
  const wineStyles = generateWineStyles(result);
  const recommendedGrapes = generateGrapeRecommendations(result);
  const recommendedRegions = generateRegionRecommendations(result);

  // Descripciones detalladas de uvas basadas en el perfil
  const getGrapeDescription = (grape: string): string => {
    const descriptions: {[key: string]: string} = {
      'Chardonnay': `Versátil y elegante, esta uva te ofrece ${result.potente >= 3 ? 'cuerpo y estructura' : 'finesse'}, con ${result.acidez >= 3 ? 'buena acidez' : 'redondez'} que se adapta a tu perfil.`,
      'Cabernet Sauvignon': `Potente y estructurada, ideal por tu gusto por ${result.tanico >= 3 ? 'taninos marcados' : 'vinos con carácter'} y ${result.potente >= 3 ? 'intensidad' : 'equilibrio'}.`,
      'Merlot': `Suave y afrutada, encaja con tu preferencia por ${result.afrutado >= 3 ? 'aromas frutales' : 'vinos amables'} y ${result.tanico <= 3 ? 'taninos sedosos' : 'estructura equilibrada'}.`,
      'Pinot Noir': `Elegante y delicada, perfecta por tu inclinación hacia ${result.potente <= 3 ? 'vinos sutiles' : 'complejidad'} con ${result.acidez >= 3 ? 'frescura vibrante' : 'equilibrio'}.`,
      'Sauvignon Blanc': `Fresca y aromática, te va bien por tu gusto por ${result.acidez >= 3 ? 'acidez marcada' : 'vivacidad'} y ${result.afrutado >= 3 ? 'expresión frutal' : 'carácter definido'}.`,
      'Syrah': `Especiada y compleja, se alinea con tu perfil ${result.potente >= 3 ? 'potente' : 'estructurado'} y ${result.tanico >= 3 ? 'tánico' : 'equilibrado'}.`,
      'Riesling': `Aromática y vibrante, combina ${result.acidez >= 3 ? 'acidez refrescante' : 'equilibrio'} con ${result.dulce >= 2 ? 'notas dulces' : 'precisión'} que te gustan.`,
      'Tempranillo': `La gran uva española que ofrece ${result.potente >= 3 ? 'estructura' : 'elegancia'} y ${result.tanico >= 3 ? 'taninos firmes' : 'suavidad'} según tu preferencia.`,
      'Malbec': `Intensa y frutal, perfecta por tu gusto por ${result.afrutado >= 3 ? 'aromas intensos' : 'expresión frutal'} y ${result.potente >= 3 ? 'cuerpo generoso' : 'estructura media'}.`,
      'Garnacha': `Generosa y especiada, se adapta a tu perfil ${result.dulce >= 2 ? 'con dulzor' : 'equilibrado'} y ${result.afrutado >= 3 ? 'frutal' : 'complejo'}.`,
      'Albariño': `Atlántica y refrescante, ideal por tu preferencia por ${result.acidez >= 3 ? 'frescura vibrante' : 'vinos vivos'} y ${result.afrutado >= 3 ? 'aromas frutales' : 'carácter mineral'}.`,
      'Sangiovese': `Estructurada y elegante, combina ${result.acidez >= 3 ? 'acidez marcada' : 'vivacidad'} con ${result.tanico >= 3 ? 'taninos firmes' : 'estructura media'}.`,
      'Nebbiolo': `Potente y compleja, perfecta por tu gusto por ${result.tanico >= 4 ? 'taninos poderosos' : 'estructura seria'} y ${result.potente >= 3 ? 'intensidad' : 'carácter'}.`,
      'Gewürztraminer': `Aromática y exótica, se alinea con tu perfil ${result.dulce >= 3 ? 'con dulzor' : 'aromático'} y ${result.afrutado >= 4 ? 'muy frutal' : 'expresivo'}.`,
      'Mencía': `Fresca y frutal, ideal por tu preferencia por ${result.acidez >= 3 ? 'frescura' : 'vivacidad'} y ${result.afrutado >= 3 ? 'expresión frutal' : 'elegancia'}.`,
      'Godello': `Atlántica y mineral, encaja con tu gusto por ${result.acidez >= 3 ? 'acidez vibrante' : 'frescura'} y ${result.potente >= 2 ? 'cuerpo medio' : 'elegancia'}.`
    };
    return descriptions[grape] || `Una uva que se adapta perfectamente a tu perfil sensorial.`;
  };

  // Descripciones detalladas de regiones
  const getRegionDescription = (region: string): string => {
    const descriptions: {[key: string]: string} = {
      'Borgoña (Francia)': `Cuna del Pinot Noir y Chardonnay, produce vinos ${result.potente <= 3 ? 'elegantes y sutiles' : 'con carácter'} con ${result.acidez >= 3 ? 'excelente acidez' : 'equilibrio'}.`,
      'Burdeos (Francia)': `Región de grandes tintos estructurados, perfecta por tu gusto por ${result.tanico >= 3 ? 'taninos firmes' : 'vinos estructurados'} y ${result.potente >= 3 ? 'potencia' : 'equilibrio'}.`,
      'Toscana (Italia)': `Hogar del Sangiovese, ofrece vinos con ${result.acidez >= 3 ? 'acidez vibrante' : 'frescura'} y ${result.tanico >= 3 ? 'estructura tánica' : 'elegancia'}.`,
      'Rioja (España)': `La región española icónica que produce vinos ${result.potente >= 3 ? 'con cuerpo' : 'equilibrados'} y ${result.tanico >= 2 ? 'taninos pulidos' : 'suaves'}.`,
      'Ribera del Duero (España)': `Tintos potentes y concentrados, ideales por tu preferencia por ${result.potente >= 3 ? 'intensidad' : 'estructura'} y ${result.tanico >= 3 ? 'taninos marcados' : 'carácter'}.`,
      'Rías Baixas (España)': `La tierra del Albariño, perfecta por tu gusto por ${result.acidez >= 4 ? 'acidez refrescante' : 'frescura atlántica'} y ${result.afrutado >= 3 ? 'aromas frutales' : 'elegancia'}.`,
      'Priorat (España)': `Vinos de terruño único, muy ${result.potente >= 4 ? 'potentes' : 'concentrados'} con ${result.tanico >= 4 ? 'taninos poderosos' : 'estructura seria'}.`,
      'Piemonte (Italia)': `Hogar del Nebbiolo, produce vinos con ${result.tanico >= 4 ? 'taninos serios' : 'estructura'} y ${result.acidez >= 3 ? 'acidez elevada' : 'vivacidad'}.`,
      'Mosel (Alemania)': `Rieslings elegantes con ${result.acidez >= 4 ? 'acidez brillante' : 'frescura'} y ${result.dulce >= 2 ? 'dulzor equilibrado' : 'pureza frutal'}.`,
      'Napa Valley (EE.UU.)': `Vinos ${result.potente >= 4 ? 'muy potentes' : 'generosos'} y ${result.afrutado >= 3 ? 'frutales' : 'expresivos'} con carácter californiano.`,
      'Mendoza (Argentina)': `Malbecs intensos que combinan ${result.afrutado >= 3 ? 'fruta generosa' : 'expresión frutal'} con ${result.potente >= 3 ? 'cuerpo robusto' : 'estructura media'}.`,
      'Valle de Maipo (Chile)': `Cabernets estructurados con ${result.potente >= 3 ? 'potencia' : 'equilibrio'} y ${result.tanico >= 3 ? 'taninos firmes' : 'estructura definida'}.`,
      'Marlborough (Nueva Zelanda)': `Sauvignon Blancs con ${result.acidez >= 4 ? 'acidez brillante' : 'frescura intensa'} y ${result.afrutado >= 4 ? 'aromas explosivos' : 'expresión frutal'}.`,
      'Barossa Valley (Australia)': `Shiraz potentes y especiadas, ideales por tu gusto por ${result.potente >= 4 ? 'vinos con músculo' : 'intensidad'} y ${result.afrutado >= 3 ? 'fruta madura' : 'carácter frutal'}.`
    };
    return descriptions[region] || `Una región que produce vinos alineados con tu perfil.`;
  };

  // Coordenadas de las regiones para mapas
  const getRegionCoordinates = (region: string): [number, number] => {
    const coordinates: {[key: string]: [number, number]} = {
      'Borgoña (Francia)': [4.8357, 47.0502],
      'Burdeos (Francia)': [-0.5792, 44.8378],
      'Toscana (Italia)': [11.2558, 43.7696],
      'Rioja (España)': [-2.4450, 42.2871],
      'Ribera del Duero (España)': [-4.0580, 41.6370],
      'Rías Baixas (España)': [-8.6446, 42.4296],
      'Priorat (España)': [0.7356, 41.1573],
      'Piemonte (Italia)': [7.6869, 45.0522],
      'Mosel (Alemania)': [6.6371, 49.9929],
      'Napa Valley (EE.UU.)': [-122.2869, 38.5025],
      'Mendoza (Argentina)': [-68.8458, -32.8895],
      'Valle de Maipo (Chile)': [-70.6693, -33.4489],
      'Marlborough (Nueva Zelanda)': [173.9654, -41.5135],
      'Barossa Valley (Australia)': [138.9969, -34.5598]
    };
    return coordinates[region] || [0, 0];
  };

  // Agrupar regiones por país
  const regionsByCountry = recommendedRegions.reduce((acc, region) => {
    const country = region.split('(')[1]?.replace(')', '') || 'Otros';
    if (!acc[country]) acc[country] = [];
    acc[country].push(region);
    return acc;
  }, {} as Record<string, string[]>);

  // Ordenar países por número de regiones (mayor a menor)
  const sortedCountries = Object.entries(regionsByCountry)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([country, regions]) => ({ country, regions }));

  // Configuración de los iconos para los estilos (mismo orden que WineStylesGrid)
  const getCardConfig = (styleName: string) => {
    const configs: {[key: string]: any} = {
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

  const cleanStyleName = (name: string) => {
    return name.replace(/\s*\(\d+\)\s*$/, '').trim();
  };

  const generateSlug = (name: string) => {
    return cleanStyleName(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Fetch wine style details from database
  useEffect(() => {
    const fetchStyleDetails = async () => {
      if (wineStyles.length === 0) {
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
          .filter(Boolean) as WineStyle[];
        
        setStyleDetails(ordered);
      } catch (error) {
        console.error('Error fetching wine styles:', error);
      } finally {
        setIsLoadingStyles(false);
      }
    };

    fetchStyleDetails();
  }, [wineStyles]);

  // Función para copiar el perfil al portapapeles
  const copyProfileToClipboard = () => {
    navigator.clipboard.writeText(profileName);
    toast({
      title: "¡Perfil copiado!",
      description: `Tu perfil ${profileName} está listo para usar en Winerim.`,
    });
  };

  // Extract country from wine recommendation string and return specific flag
  const getCountryFlag = (wineString: string): string => {
    const lowerWine = wineString.toLowerCase();
    
    // ESPAÑA - Regiones españolas
    if (lowerWine.includes('rioja') || lowerWine.includes('ribera') || lowerWine.includes('priorat') || 
        lowerWine.includes('rías baixas') || lowerWine.includes('galicia') || lowerWine.includes('penedès') ||
        lowerWine.includes('jerez') || lowerWine.includes('toro') || lowerWine.includes('rueda') ||
        lowerWine.includes('somontano') || lowerWine.includes('bierzo') || lowerWine.includes('jumilla') ||
        lowerWine.includes('montsant') || lowerWine.includes('empordà') || lowerWine.includes('navarra') ||
        lowerWine.includes('cataluña') || lowerWine.includes('valencia') || lowerWine.includes('muga') ||
        lowerWine.includes('españa') || lowerWine.includes('spain')) {
      return '🇪🇸';
    }
    
    // FRANCIA - Regiones francesas
    if (lowerWine.includes('bordeaux') || lowerWine.includes('borgoña') || lowerWine.includes('burgundy') ||
        lowerWine.includes('champagne') || lowerWine.includes('rhône') || lowerWine.includes('loire') ||
        lowerWine.includes('alsace') || lowerWine.includes('languedoc') || lowerWine.includes('provence') ||
        lowerWine.includes('beaujolais') || lowerWine.includes('morgon') || lowerWine.includes('chiroubles') ||
        lowerWine.includes('fleurie') || lowerWine.includes('moulin') || lowerWine.includes('châteauneuf') ||
        lowerWine.includes('côtes du rhône') || lowerWine.includes('sancerre') || lowerWine.includes('pouilly') ||
        lowerWine.includes('chablis') || lowerWine.includes('meursault') || lowerWine.includes('pomerol') ||
        lowerWine.includes('pauillac') || lowerWine.includes('margaux') || lowerWine.includes('saint-émilion') ||
        lowerWine.includes('côtes du jura') || lowerWine.includes('jura') || lowerWine.includes('arbois') ||
        lowerWine.includes('chinon') || lowerWine.includes('vouvray') || lowerWine.includes('muscadet') ||
        lowerWine.includes('bandol') || lowerWine.includes('cassis') || lowerWine.includes('gigondas') ||
        lowerWine.includes('hermitage') || lowerWine.includes('condrieu') || lowerWine.includes('côte-rôtie') ||
        lowerWine.includes('vin de france') || lowerWine.includes('château') || lowerWine.includes('domaine') ||
        lowerWine.includes('francia') || lowerWine.includes('france')) {
      return '🇫🇷';
    }
    
    // ITALIA - Regiones italianas
    if (lowerWine.includes('toscana') || lowerWine.includes('tuscany') || lowerWine.includes('piemonte') ||
        lowerWine.includes('piedmont') || lowerWine.includes('veneto') || lowerWine.includes('sicilia') ||
        lowerWine.includes('sicily') || lowerWine.includes('puglia') || lowerWine.includes('lombardia') ||
        lowerWine.includes('lombardy') || lowerWine.includes('friuli') || lowerWine.includes('alto adige') ||
        lowerWine.includes('abruzzo') || lowerWine.includes('campania') || lowerWine.includes('marche') ||
        lowerWine.includes('umbria') || lowerWine.includes('barolo') || lowerWine.includes('barbaresco') ||
        lowerWine.includes('chianti') || lowerWine.includes('brunello') || lowerWine.includes('valpolicella') ||
        lowerWine.includes('amarone') || lowerWine.includes('soave') || lowerWine.includes('prosecco') ||
        lowerWine.includes('franciacorta') || lowerWine.includes('ottelia') || lowerWine.includes('italia') || 
        lowerWine.includes('italy')) {
      return '🇮🇹';
    }
    
    // PORTUGAL
    if (lowerWine.includes('douro') || lowerWine.includes('alentejo') || lowerWine.includes('dão') ||
        lowerWine.includes('vinho verde') || lowerWine.includes('lisboa') || lowerWine.includes('vinhas') ||
        lowerWine.includes('tortuga') || lowerWine.includes('portugal')) {
      return '🇵🇹';
    }
    
    // ALEMANIA
    if (lowerWine.includes('mosel') || lowerWine.includes('rheingau') || lowerWine.includes('pfalz') ||
        lowerWine.includes('rheinhessen') || lowerWine.includes('baden') || lowerWine.includes('franken') ||
        lowerWine.includes('alemania') || lowerWine.includes('germany')) {
      return '🇩🇪';
    }
    
    // ARGENTINA
    if (lowerWine.includes('mendoza') || lowerWine.includes('salta') || lowerWine.includes('patagonia') ||
        lowerWine.includes('cafayate') || lowerWine.includes('argentina')) {
      return '🇦🇷';
    }
    
    // CHILE
    if (lowerWine.includes('maipo') || lowerWine.includes('colchagua') || lowerWine.includes('casablanca') ||
        lowerWine.includes('aconcagua') || lowerWine.includes('rapel') || lowerWine.includes('chile')) {
      return '🇨🇱';
    }
    
    // ESTADOS UNIDOS
    if (lowerWine.includes('napa') || lowerWine.includes('sonoma') || lowerWine.includes('california') ||
        lowerWine.includes('oregon') || lowerWine.includes('washington') || lowerWine.includes('willamette') ||
        lowerWine.includes('paso robles') || lowerWine.includes('santa barbara') || lowerWine.includes('russian river') ||
        lowerWine.includes('eeuu') || lowerWine.includes('usa') || lowerWine.includes('estados unidos') || 
        lowerWine.includes('united states')) {
      return '🇺🇸';
    }
    
    // MÉXICO
    if (lowerWine.includes('jalisco') || lowerWine.includes('baja california') || lowerWine.includes('valle de guadalupe') ||
        lowerWine.includes('ensenada') || lowerWine.includes('queretaro') || lowerWine.includes('querétaro') ||
        lowerWine.includes('méxico') || lowerWine.includes('mexico')) {
      return '🇲🇽';
    }
    
    // AUSTRALIA
    if (lowerWine.includes('barossa') || lowerWine.includes('hunter valley') || lowerWine.includes('margaret river') ||
        lowerWine.includes('mclaren vale') || lowerWine.includes('yarra valley') || lowerWine.includes('australia')) {
      return '🇦🇺';
    }
    
    // NUEVA ZELANDA
    if (lowerWine.includes('marlborough') || lowerWine.includes('hawke') || lowerWine.includes('central otago') ||
        lowerWine.includes('nueva zelanda') || lowerWine.includes('new zealand')) {
      return '🇳🇿';
    }
    
    // SUDÁFRICA
    if (lowerWine.includes('stellenbosch') || lowerWine.includes('paarl') || lowerWine.includes('constantia') ||
        lowerWine.includes('swartland') || lowerWine.includes('sudáfrica') || lowerWine.includes('south africa')) {
      return '🇿🇦';
    }
    
    // GRECIA
    if (lowerWine.includes('grecia') || lowerWine.includes('greece') || lowerWine.includes('santorini') ||
        lowerWine.includes('nemea') || lowerWine.includes('naoussa')) {
      return '🇬🇷';
    }
    
    // GEORGIA
    if (lowerWine.includes('georgia') || lowerWine.includes('kakheti') || lowerWine.includes('qvevri')) {
      return '🇬🇪';
    }
    
    // AUSTRIA
    if (lowerWine.includes('wachau') || lowerWine.includes('burgenland') || lowerWine.includes('kremstal') ||
        lowerWine.includes('austria') || lowerWine.includes('österreich')) {
      return '🇦🇹';
    }
    
    // HUNGRÍA
    if (lowerWine.includes('tokaj') || lowerWine.includes('eger') || lowerWine.includes('villány') ||
        lowerWine.includes('hungría') || lowerWine.includes('hungary')) {
      return '🇭🇺';
    }
    
    // CROACIA
    if (lowerWine.includes('istria') || lowerWine.includes('dalmacia') || lowerWine.includes('pelješac') ||
        lowerWine.includes('croacia') || lowerWine.includes('croatia')) {
      return '🇭🇷';
    }
    
    // URUGUAY
    if (lowerWine.includes('canelones') || lowerWine.includes('maldonado') || lowerWine.includes('uruguay')) {
      return '🇺🇾';
    }
    
    // BRASIL
    if (lowerWine.includes('serra gaúcha') || lowerWine.includes('vale dos vinhedos') || 
        lowerWine.includes('brasil') || lowerWine.includes('brazil')) {
      return '🇧🇷';
    }
    
    // CANADÁ
    if (lowerWine.includes('niagara') || lowerWine.includes('okanagan') || lowerWine.includes('british columbia') ||
        lowerWine.includes('canadá') || lowerWine.includes('canada')) {
      return '🇨🇦';
    }
    
    // SUIZA
    if (lowerWine.includes('valais') || lowerWine.includes('vaud') || lowerWine.includes('ticino') ||
        lowerWine.includes('suiza') || lowerWine.includes('switzerland')) {
      return '🇨🇭';
    }
    
    // LÍBANO
    if (lowerWine.includes('bekaa') || lowerWine.includes('líbano') || lowerWine.includes('lebanon')) {
      return '🇱🇧';
    }
    
    // ISRAEL
    if (lowerWine.includes('golan') || lowerWine.includes('galilee') || lowerWine.includes('israel')) {
      return '🇮🇱';
    }
    
    // TURQUÍA
    if (lowerWine.includes('anatolia') || lowerWine.includes('capadocia') || lowerWine.includes('turquía') || 
        lowerWine.includes('turkey')) {
      return '🇹🇷';
    }
    
    // RUMANIA
    if (lowerWine.includes('transilvania') || lowerWine.includes('dealu mare') || lowerWine.includes('rumania') || 
        lowerWine.includes('romania')) {
      return '🇷🇴';
    }
    
    // BULGARIA
    if (lowerWine.includes('thracian valley') || lowerWine.includes('bulgaria')) {
      return '🇧🇬';
    }
    
    // ESLOVENIA
    if (lowerWine.includes('primorska') || lowerWine.includes('podravje') || lowerWine.includes('eslovenia') || 
        lowerWine.includes('slovenia')) {
      return '🇸🇮';
    }
    
    // CHINA
    if (lowerWine.includes('ningxia') || lowerWine.includes('shandong') || lowerWine.includes('china')) {
      return '🇨🇳';
    }
    
    // JAPÓN
    if (lowerWine.includes('yamanashi') || lowerWine.includes('koshu') || lowerWine.includes('japón') || 
        lowerWine.includes('japan')) {
      return '🇯🇵';
    }
    
    // MARRUECOS
    if (lowerWine.includes('meknes') || lowerWine.includes('marruecos') || lowerWine.includes('morocco')) {
      return '🇲🇦';
    }
    
    // REINO UNIDO
    if (lowerWine.includes('sussex') || lowerWine.includes('kent') || lowerWine.includes('hampshire') ||
        lowerWine.includes('reino unido') || lowerWine.includes('united kingdom') || lowerWine.includes('england')) {
      return '🇬🇧';
    }
    
    // Si no se encuentra, intentar extraer del quinto campo (país)
    const parts = wineString.split(", ");
    if (parts.length >= 5) {
      const countryPart = parts[4].toLowerCase().trim();
      
      // Mapeo directo de nombres de países
      const countryMap: {[key: string]: string} = {
        'españa': '🇪🇸', 'spain': '🇪🇸',
        'francia': '🇫🇷', 'france': '🇫🇷',
        'italia': '🇮🇹', 'italy': '🇮🇹',
        'portugal': '🇵🇹',
        'alemania': '🇩🇪', 'germany': '🇩🇪',
        'argentina': '🇦🇷',
        'chile': '🇨🇱',
        'méxico': '🇲🇽', 'mexico': '🇲🇽',
        'eeuu': '🇺🇸', 'usa': '🇺🇸', 'estados unidos': '🇺🇸', 'united states': '🇺🇸',
        'australia': '🇦🇺',
        'nueva zelanda': '🇳🇿', 'new zealand': '🇳🇿',
        'sudáfrica': '🇿🇦', 'south africa': '🇿🇦',
        'grecia': '🇬🇷', 'greece': '🇬🇷',
        'georgia': '🇬🇪',
        'austria': '🇦🇹',
        'hungría': '🇭🇺', 'hungary': '🇭🇺',
        'croacia': '🇭🇷', 'croatia': '🇭🇷',
        'uruguay': '🇺🇾',
        'brasil': '🇧🇷', 'brazil': '🇧🇷',
        'canadá': '🇨🇦', 'canada': '🇨🇦',
        'suiza': '🇨🇭', 'switzerland': '🇨🇭',
        'líbano': '🇱🇧', 'lebanon': '🇱🇧',
        'israel': '🇮🇱',
        'turquía': '🇹🇷', 'turkey': '🇹🇷',
        'rumania': '🇷🇴', 'romania': '🇷🇴',
        'bulgaria': '🇧🇬',
        'eslovenia': '🇸🇮', 'slovenia': '🇸🇮',
        'china': '🇨🇳',
        'japón': '🇯🇵', 'japan': '🇯🇵',
        'marruecos': '🇲🇦', 'morocco': '🇲🇦',
        'reino unido': '🇬🇧', 'united kingdom': '🇬🇧', 'england': '🇬🇧'
      };
      
      for (const [country, flag] of Object.entries(countryMap)) {
        if (countryPart.includes(country)) {
          return flag;
        }
      }
    }
    
    // Si aún no se encuentra, devolver bandera de vino genérica
    return '🍷';
  };

  // Extraer país del string de vino
  const getCountryFromWine = (wineString: string): string => {
    // El formato es: Name, Type, Winery, Region, Country
    const parts = wineString.split(", ");
    const country = parts[4]; // El país está en la posición 4
    
    if (country && country.trim()) {
      return country.trim();
    }
    
    // Fallback: si no hay país explícito, devolver "Otros"
    return 'Otros';
  };

  // Agrupar y ordenar vinos por país
  const winesByCountry = recommendations.reduce((acc, wine) => {
    const country = getCountryFromWine(wine);
    if (!acc[country]) acc[country] = [];
    acc[country].push(wine);
    return acc;
  }, {} as Record<string, string[]>);

  const sortedWineCountries = Object.keys(winesByCountry).sort();

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md mb-8">
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
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🧭</span> Tu estilo de vino
          </h3>
          <p className="text-gray-700 mb-6">{emotionalDescription}</p>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🍷</span> Estilos que encajan contigo
          </h3>
          
          {isLoadingStyles ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {styleDetails.map((style) => {
                const config = getCardConfig(cleanStyleName(style.name));
                const IconComponent = config.icon;
                
                return (
                  <Card 
                    key={style.id} 
                    className={`${config.bg} ${config.border} border-2 hover:border-red-300 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group relative`}
                  >
                    <CardContent className="p-6 relative">
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg`}>
                          <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                        </div>
                        
                        <h3 className="font-bold text-lg mb-3 text-gray-900 group-hover:text-red-700 transition-colors">
                          {cleanStyleName(style.name)}
                        </h3>
                        
                        <p className="text-sm text-gray-700 leading-relaxed text-justify">
                          {style.description || 'Descripción no disponible'}
                        </p>
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-red-800 flex items-center gap-3 mb-6">
            <span className="text-4xl">🍇</span> 
            <span>Uvas que deberías probar</span>
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            Estas uvas encajan perfectamente con tu perfil sensorial:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedGrapes.map((grape, index) => (
              <div 
                key={index} 
                className="group relative bg-gradient-to-br from-purple-50 via-red-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Efecto de brillo */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-[slide-in-right_1s_ease-in-out]"></div>
                
                {/* Contenido */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-red-500 rounded-full flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      🍇
                    </div>
                    <h4 className="font-bold text-xl text-gray-900 group-hover:text-red-700 transition-colors">{grape}</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{getGrapeDescription(grape)}</p>
                  
                  {/* Indicador decorativo */}
                  <div className="mt-4 h-1 w-0 bg-gradient-to-r from-purple-500 to-red-500 group-hover:w-full transition-all duration-500 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-red-800 flex items-center gap-3 mb-6">
            <span className="text-4xl">🌍</span> 
            <span>Regiones que van contigo</span>
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            Estas regiones vinícolas producen vinos que se alinean con tus preferencias:
          </p>
          
          {sortedCountries.map(({ country, regions }, countryIndex) => {
            // Obtener el emoji del país
            const getCountryEmoji = (countryName: string): string => {
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
              <div key={`country-${countryIndex}`} className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="text-3xl">{getCountryEmoji(country)}</span>
                  <span>{country}</span>
                  <span className="text-sm font-normal text-gray-600">({regions.length} {regions.length === 1 ? 'región' : 'regiones'})</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regions.map((region: string, index: number) => (
                    <div 
                      key={index} 
                      className="group relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 rounded-2xl border-2 border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      {/* Efecto de brillo */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-[slide-in-right_1s_ease-in-out]"></div>
                      
                      {/* Contenido */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <MapPin className="w-6 h-6 text-white" />
                          </div>
                          <h5 className="font-bold text-lg text-gray-900 group-hover:text-red-700 transition-colors flex-1">
                            {region.split('(')[0].trim()}
                          </h5>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">{getRegionDescription(region)}</p>
                        
                        {/* Mapa de la región */}
                        <RegionMap 
                          region={region} 
                          coordinates={getRegionCoordinates(region)} 
                        />
                        
                        {/* Indicador decorativo */}
                        <div className="mt-4 h-1 w-0 bg-gradient-to-r from-amber-500 to-red-600 group-hover:w-full transition-all duration-500 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Tu radar sensorial
          </h3>
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
        
        <div className="border-t border-red-200 pt-6 mb-6">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🔎</span> Vinos que te encantarán
          </h3>
          
          {recommendations.length === 0 ? (
            <div className="text-center py-8 bg-red-50 rounded-lg">
              <p className="text-gray-700">No se encontraron vinos en la base de datos que coincidan con tu perfil. Intenta agregar más vinos a la base de datos.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedWineCountries.map((country) => (
                <div key={country}>
                  <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">{getCountryFlag(winesByCountry[country][0])}</span>
                    {country}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {winesByCountry[country].map((wine, index) => {
                      const parts = wine.split(", ");
                      const name = parts[0];
                      const type = parts[1] || "";
                      const winery = parts[2] || "";
                      const region = parts[3] || "";
                      const wineCountry = parts[4] || "";
                      
                      // Buscar el ID del estilo en styleDetails para navegar
                      const matchingStyle = styleDetails.find(s => 
                        cleanStyleName(s.name).toLowerCase() === type.toLowerCase() ||
                        type.toLowerCase().includes(cleanStyleName(s.name).toLowerCase())
                      );
                      
                      return (
                        <div 
                          key={`${country}-${index}`}
                          className="bg-white border border-red-100 p-4 rounded-lg shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group"
                          onClick={() => matchingStyle && navigate(`/wine-styles/${generateSlug(matchingStyle.name)}`)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                              <Wine className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 mb-1 group-hover:text-red-700 transition-colors">{name}</p>
                              <p className="text-sm text-gray-600">{type}</p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Bodega:</span> {winery}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Región:</span> {region}
                              </p>
                              <p className="text-sm text-gray-700 flex items-center gap-1">
                                <span className="text-base">{getCountryFlag(wine)}</span>
                                <span className="font-medium">{wineCountry}</span>
                              </p>
                              {matchingStyle && (
                                <p className="text-xs text-red-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Ver estilo {cleanStyleName(matchingStyle.name)} →
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
      </div>
      
      <div className="flex flex-col items-center gap-4">
        <Button 
          onClick={onRestart}
          className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
        >
          Reiniciar Test
        </Button>
      </div>
    </div>
  );
};

export default QuizResults;
