import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { QuizResult, calculateCompatibility } from '../data/quizData';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Copy, Wine, Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Sun, Utensils, Leaf, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import RegionMap from './RegionMap';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import {
  generateMatchrimName,
  generateWineStyles,
  generateGrapeRecommendations,
  generateRegionRecommendations
} from '@/utils/profileUtils';
import { cleanWineStyleName } from '@/utils/wineStyleUtils';
import { fetchWinesByAttributes } from '@/services/winerimApi';
import WineCard from './WineCard';
import GrapeCard from './GrapeCard';
import RegionCard from './RegionCard';
import { aggregateGrapes, aggregateRegions, filterWinesByGrape, filterWinesByRegion } from '@/utils/winerimDataAggregation';

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
  isLoggedIn: boolean;
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

const QuizResults: React.FC<QuizResultsProps> = ({ result, description, recommendations, onRestart, isLoggedIn }) => {
  const navigate = useNavigate();
  const [styleDetails, setStyleDetails] = useState<WineStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);
  const [countryOverrides, setCountryOverrides] = useState<Record<string, string>>({});

  // Estado para tracking de selección de uvas/regiones
  const [selectedGrape, setSelectedGrape] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<{ region: string; country: string } | null>(null);

  // Ref para scroll a sección de vinos
  const winesRef = React.useRef<HTMLDivElement>(null);

  // Map de refs para cada vino individual
  const wineRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Función para registrar refs de vinos
  const setWineRef = (id: number, ref: HTMLDivElement | null) => {
    if (ref) {
      wineRefs.current.set(id, ref);
    } else {
      wineRefs.current.delete(id);
    }
  };

  const { data: winerimWines = [], isLoading: isLoadingWinerimWines, error: winerimError } = useQuery({
    queryKey: ['winerim-wines', result.potente, result.acidez, result.dulce, result.tanico, result.afrutado],
    queryFn: () => fetchWinesByAttributes(result),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

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
  const profileName = useMemo(() => generateMatchrimName(result), [result.potente, result.acidez, result.dulce, result.tanico, result.afrutado]);
  const emotionalDescription = useMemo(() => generateEmotionalDescription(result), [result.potente, result.acidez, result.dulce, result.tanico, result.afrutado]);
  const wineStyles = useMemo(() => generateWineStyles(result), [result.potente, result.acidez, result.dulce, result.tanico, result.afrutado]);

  // DEPRECATED: Usar datos de winerim-backend en lugar de generación local
  // const recommendedGrapes = useMemo(() => generateGrapeRecommendations(result), [result.potente, result.acidez, result.dulce, result.tanico, result.afrutado]);
  // const recommendedRegions = useMemo(() => generateRegionRecommendations(result), [result.potente, result.acidez, result.dulce, result.tanico, result.afrutado]);

  // Agregar datos de winerim-backend
  const aggregatedGrapes = useMemo(() => aggregateGrapes(winerimWines), [winerimWines]);
  const aggregatedRegions = useMemo(() => aggregateRegions(winerimWines), [winerimWines]);

  // NO filtrar vinos, solo mostrar todos (el resaltado se hace visualmente)
  const displayedWines = winerimWines;

  // Calcular cuántos vinos coinciden con la selección (para el mensaje)
  const matchingWinesCount = useMemo(() => {
    if (selectedGrape) {
      return filterWinesByGrape(winerimWines, selectedGrape).length;
    }
    if (selectedRegion) {
      return filterWinesByRegion(winerimWines, selectedRegion.region, selectedRegion.country).length;
    }
    return 0;
  }, [winerimWines, selectedGrape, selectedRegion]);

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

  // DEPRECATED: Agrupar regiones por país desde datos locales
  // Ahora usamos aggregatedRegions desde datos de winerim-backend
  /*
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
  */

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
    return cleanWineStyleName(name)
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
        // Fetch all wine styles from database
        const { data, error } = await supabase
          .from('wine_styles')
          .select('*');

        if (error) throw error;

        // Filter styles that match wineStyles array after cleaning names
        const matchedStyles = data?.filter(style =>
          wineStyles.includes(cleanWineStyleName(style.name))
        ) ?? [];

        // Ordenar según el orden de wineStyles
        const ordered = wineStyles
          .map(styleName => matchedStyles.find(s => cleanWineStyleName(s.name) === styleName))
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

    // ESPAÑA - Regiones españolas (ampliado)
    if (lowerWine.includes('rioja') || lowerWine.includes('ribera') || lowerWine.includes('priorat') ||
        lowerWine.includes('rías baixas') || lowerWine.includes('galicia') || lowerWine.includes('penedès') ||
        lowerWine.includes('jerez') || lowerWine.includes('toro') || lowerWine.includes('rueda') ||
        lowerWine.includes('somontano') || lowerWine.includes('bierzo') || lowerWine.includes('jumilla') ||
        lowerWine.includes('montsant') || lowerWine.includes('empordà') || lowerWine.includes('navarra') ||
        lowerWine.includes('cataluña') || lowerWine.includes('valencia') || lowerWine.includes('muga') ||
        lowerWine.includes('madrid') || lowerWine.includes('castilla') || lowerWine.includes('león') ||
        lowerWine.includes('manchuela') || lowerWine.includes('la mancha') || lowerWine.includes('valdepeñas') ||
        lowerWine.includes('yecla') || lowerWine.includes('alicante') || lowerWine.includes('utiel') ||
        lowerWine.includes('requena') || lowerWine.includes('tierra de') || lowerWine.includes('costers del segre') ||
        lowerWine.includes('cava') || lowerWine.includes('tarragona') || lowerWine.includes('almansa') ||
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

  // Mapa de emoji a nombre de país (normalizado en español)
  const emojiToCountryName: Record<string, string> = {
    '🇪🇸': 'España',
    '🇫🇷': 'Francia',
    '🇮🇹': 'Italia',
    '🇩🇪': 'Alemania',
    '🇵🇹': 'Portugal',
    '🇺🇸': 'Estados Unidos',
    '🇨🇱': 'Chile',
    '🇦🇷': 'Argentina',
    '🇦🇺': 'Australia',
    '🇳🇿': 'Nueva Zelanda',
    '🇿🇦': 'Sudáfrica',
    '🇬🇷': 'Grecia',
    '🇬🇪': 'Georgia',
    '🇦🇹': 'Austria',
    '🇭🇺': 'Hungría',
    '🇭🇷': 'Croacia',
    '🇺🇾': 'Uruguay',
    '🇧🇷': 'Brasil',
    '🇨🇦': 'Canadá',
    '🇨🇭': 'Suiza',
    '🇱🇧': 'Líbano',
    '🇮🇱': 'Israel',
    '🇹🇷': 'Turquía',
    '🇷🇴': 'Rumania',
    '🇧🇬': 'Bulgaria',
    '🇸🇮': 'Eslovenia',
    '🇨🇳': 'China',
    '🇯🇵': 'Japón',
    '🇲🇦': 'Marruecos',
    '🇬🇧': 'Reino Unido'
  };

  // Extraer país del string de vino alineado con la detección de bandera
  const getCountryFromWine = (wineString: string): string => {
    // Formato esperado: Name, Type, Winery, Region, Country
    const parts = wineString.split(", ");
    const rawCountry = parts[4]?.trim();

    // Si viene un país explícito y no es desconocido, usarlo (normalizando EEUU)
    if (rawCountry && !/^(desconocido|otros|no especificada)$/i.test(rawCountry)) {
      if (/^ee\.?uu\.?$/i.test(rawCountry)) return 'Estados Unidos';
      return rawCountry;
    }

    // Si no hay país fiable, inferirlo a partir de la misma lógica que la bandera
    const flag = getCountryFlag(wineString);
    const inferred = emojiToCountryName[flag];
    return inferred || 'Otros';
  };

  // Resolver país a partir de región vía Mapbox (solo para desconocidos)
  useEffect(() => {
    const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ29pa28td2luZXJpbSIsImEiOiJjbWdmM3R1anQwNHE5MmtyMW02Nmp1OTFhIn0.0PGiNnLfvOiZNghcsNeK4g';

    const normalizeCountry = (name: string) => {
      const n = name.trim().toLowerCase();
      if (/^ee\.?uu\.?$|usa|united states|estados unidos/.test(n)) return 'Estados Unidos';
      if (/^uk$|united kingdom|reino unido|england|scotland|wales/.test(n)) return 'Reino Unido';
      return name;
    };

    const resolveAll = async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        recommendations.map(async (wine) => {
          const current = getCountryFromWine(wine);
          if (!current || /^(otros|desconocido)$/i.test(current)) {
            const parts = wine.split(', ');
            const region = parts[3] || '';
            if (!region) return;
            try {
              // Añadir "wine region" para mejorar contexto y forzar idioma español
              const searchQuery = `${region} wine region`;
              const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?types=region,place,district,locality&language=es&limit=1&access_token=${MAPBOX_TOKEN}`;
              const res = await fetch(url);
              if (!res.ok) return;
              const data = await res.json();
              const feat = data?.features?.[0];

              // Buscar el país en el contexto (más confiable)
              const ctx = feat?.context || [];
              const countryObj = ctx.find((c: any) =>
                typeof c?.id === 'string' && c.id.startsWith('country.')
              );

              let country = countryObj?.text_es || countryObj?.text || '';

              // Fallback: usar la última parte del place_name si no hay contexto
              if (!country && typeof feat?.place_name_es === 'string') {
                const parts = feat.place_name_es.split(',').map((s: string) => s.trim());
                country = parts[parts.length - 1] || '';
              }

              if (country) {
                console.log(`Región "${region}" → País detectado: "${country}"`);
                updates[wine] = normalizeCountry(country);
              }
            } catch (e) {
              console.warn(`Fallo al resolver país para región "${region}"`, e);
            }
          }
        })
      );
      if (Object.keys(updates).length) {
        setCountryOverrides((prev) => ({ ...prev, ...updates }));
      }
    };

    if (recommendations.length) {
      resolveAll();
    }
  }, [recommendations]);

  // Helper para obtener país final (override -> heurística -> fallback)
  const getResolvedCountry = (wine: string) => countryOverrides[wine] || getCountryFromWine(wine);

  // Agrupar y ordenar vinos por país
  const winesByCountry = recommendations.reduce((acc, wine) => {
    const country = getResolvedCountry(wine);
    if (!acc[country]) acc[country] = [];
    acc[country].push(wine);
    return acc;
  }, {} as Record<string, string[]>);

  const sortedWineCountries = Object.keys(winesByCountry).sort();

  // Funciones para handle click en tarjetas
  const handleGrapeClick = (grapeName: string) => {
    // Si ya está seleccionada, deseleccionar
    if (selectedGrape === grapeName) {
      setSelectedGrape(null);
    } else {
      // Seleccionar la nueva uva y deseleccionar región
      setSelectedGrape(grapeName);
      setSelectedRegion(null);
      // Scroll suave al primer vino que coincide con la uva seleccionada
      setTimeout(() => {
        const firstMatchingWine = winerimWines.find(wine =>
          wine.grapes?.some(g => g.trim() === grapeName)
        );
        if (firstMatchingWine) {
          const element = wineRefs.current.get(firstMatchingWine.id);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback al inicio de la sección si no encuentra vino
          winesRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleRegionClick = (region: string, country: string) => {
    // Si ya está seleccionada, deseleccionar
    if (selectedRegion?.region === region && selectedRegion?.country === country) {
      setSelectedRegion(null);
    } else {
      // Seleccionar la nueva región y deseleccionar uva
      setSelectedRegion({ region, country });
      setSelectedGrape(null);
      // Scroll suave al primer vino que coincide con la región seleccionada
      setTimeout(() => {
        const firstMatchingWine = winerimWines.find(wine =>
          wine.region === region && wine.country === country
        );
        if (firstMatchingWine) {
          const element = wineRefs.current.get(firstMatchingWine.id);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback al inicio de la sección si no encuentra vino
          winesRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {styleDetails.map((style) => {
                const cleanedName = cleanWineStyleName(style.name);
                const config = getCardConfig(cleanedName);
                const IconComponent = config.icon;

                return (
                  <Card
                    key={style.id}
                    className={`${config.bg} ${config.border} border-2 hover:border-red-300 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-red-100/50 group relative`}
                    onClick={() => navigate(`/wine-styles/${generateSlug(style.name)}`)}
                  >
                    <CardContent className="p-6 relative">
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg`}>
                          <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                        </div>

                        <h3 className="font-bold text-lg mb-3 text-gray-900 group-hover:text-red-700 transition-colors">
                          {cleanedName}
                        </h3>

                        <p className="text-sm text-gray-700 leading-relaxed text-justify mb-4">
                          {style.description || 'Descripción no disponible'}
                        </p>

                        <div className="flex items-center justify-center text-red-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span>Ver detalles</span>
                          <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sección de Uvas desde datos de Winerim */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-red-800 flex items-center gap-3 mb-6">
            <span className="text-4xl">🍇</span>
            <span>Uvas en vinos que coinciden contigo</span>
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            Estas son las uvas más comunes en los vinos que coinciden con tu perfil:
          </p>

          {isLoadingWinerimWines ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-gray-600">Buscando uvas...</span>
            </div>
          ) : aggregatedGrapes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No encontramos información de uvas en los vinos disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatedGrapes.map((grape, index) => (
                <GrapeCard
                  key={grape.name}
                  grape={grape.name}
                  count={grape.count}
                  onClick={() => handleGrapeClick(grape.name)}
                  isHighlighted={selectedGrape === grape.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sección de Regiones desde datos de Winerim */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-red-800 flex items-center gap-3 mb-6">
            <span className="text-4xl">🌍</span>
            <span>Regiones de los vinos que te recomendamos</span>
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            Estas son las regiones más comunes en los vinos que coinciden con tu perfil:
          </p>

          {isLoadingWinerimWines ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-gray-600">Buscando regiones...</span>
            </div>
          ) : aggregatedRegions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No encontramos información de regiones en los vinos disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatedRegions.map((region, index) => (
                <RegionCard
                  key={`${region.region}-${region.country}`}
                  region={region.region}
                  country={region.country}
                  count={region.count}
                  avgMatch={region.avgMatchPercentage}
                  onClick={() => handleRegionClick(region.region, region.country)}
                  isHighlighted={selectedRegion?.region === region.region && selectedRegion?.country === region.country}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-red-800 flex items-center">
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

        {/* Winerim Backend Wine Recommendations */}
        <div ref={winesRef} className="border-t border-red-200 pt-6 mb-6">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🍷</span> Vinos de Winerim que coinciden con tu perfil
          </h3>

          {isLoadingWinerimWines ? (
            <div className="text-center py-12 bg-red-50 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
              <p className="text-gray-700">Buscando vinos que coinciden con tu perfil sensorial...</p>
            </div>
          ) : winerimError ? (
            <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 mb-2">Error al cargar vinos de Winerim</p>
              <p className="text-sm text-gray-600">Por favor, inténtalo de nuevo más tarde</p>
            </div>
          ) : winerimWines.length === 0 ? (
            <div className="text-center py-8 bg-red-50 rounded-lg">
              <p className="text-gray-700">
                No se encontraron vinos con estos atributos exactos en nuestra base de datos.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Prueba a explorar otros estilos de vino que podrían gustarte.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                {selectedGrape || selectedRegion ? (
                  <>
                    <span className="font-semibold text-red-700">{matchingWinesCount}</span> vino{matchingWinesCount !== 1 ? 's' : ''}
                    {selectedGrape && <> contiene{matchingWinesCount !== 1 ? 'n' : ''} la uva <span className="font-semibold text-purple-700">{selectedGrape}</span></>}
                    {selectedRegion && <> {matchingWinesCount !== 1 ? 'son' : 'es'} de <span className="font-semibold text-green-700">{selectedRegion.region}, {selectedRegion.country}</span></>}
                    {' '}(resaltado{matchingWinesCount !== 1 ? 's' : ''} abajo)
                  </>
                ) : (
                  <>
                    Encontramos <span className="font-semibold text-red-700">{winerimWines.length}</span> vino{winerimWines.length !== 1 ? 's' : ''} que coinciden exactamente con tus preferencias sensoriales.
                  </>
                )}
              </p>
              <div className="grid grid-cols-1 gap-4">
                {displayedWines.map((wine, index) => (
                  <WineCard
                    key={wine.id}
                    wine={wine}
                    index={index}
                    isHighlighted={
                      (selectedGrape && wine.grapes?.some(g => g.trim() === selectedGrape)) ||
                      (selectedRegion && wine.region === selectedRegion.region && wine.country === selectedRegion.country) ||
                      false
                    }
                    setWineRef={setWineRef}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DEPRECATED: Sección de estilos de vino recomendados desde datos locales */}
        {/* Esta sección fue reemplazada por datos reales de winerim-backend */}
        {/*
        <div className="border-t border-red-200 pt-6 mb-6">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🔎</span> Estilos de vino recomendados
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
                      const rawName = parts[0];
                      const rawType = parts[1] || "";
                      const winery = parts[2] || "";
                      const region = parts[3] || "";
                      const wineCountry = getResolvedCountry(wine);

                      // Limpiar números entre paréntesis del nombre y tipo
                      const name = cleanStyleName(rawName);
                      const type = cleanStyleName(rawType);

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
                              {/* País (ocultar si no está resuelto) *\/}
                              {!/^(otros|desconocido)$/i.test(wineCountry) && (
                                <p className="text-sm text-gray-700 flex items-center gap-1">
                                  <span className="text-base">{getCountryFlag(wineCountry)}</span>
                                  <span className="font-medium">{wineCountry}</span>
                                </p>
                              )}
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
        */}

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

        {!isLoggedIn && (
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-8 rounded-2xl shadow-2xl border-2 border-red-400 mt-8 mb-6 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Wine className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-bold text-3xl mb-3 text-white">
                  🎉 ¡Lleva tu experiencia al siguiente nivel!
                </h3>
                <p className="text-xl text-red-100 font-medium max-w-2xl">
                  Has descubierto tu perfil de vino. Ahora regístrate gratis y accede a todas las ventajas exclusivas de Winerim.
                </p>
              </div>

              {/* Benefits grid */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">🔄</div>
                  <h4 className="font-bold text-white mb-1">Tests Ilimitados</h4>
                  <p className="text-sm text-red-100">Repite el test cuando quieras y ve cómo evoluciona tu paladar</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">💾</div>
                  <h4 className="font-bold text-white mb-1">Guarda tus Resultados</h4>
                  <p className="text-sm text-red-100">Historial completo de todos tus perfiles y recomendaciones</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-bold text-white mb-1">Recomendaciones IA</h4>
                  <p className="text-sm text-red-100">Sugerencias personalizadas basadas en tus preferencias únicas</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">🍽️</div>
                  <h4 className="font-bold text-white mb-1">Maridajes Perfectos</h4>
                  <p className="text-sm text-red-100">Descubre qué vino combina mejor con cada comida</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">📚</div>
                  <h4 className="font-bold text-white mb-1">Base de Datos Premium</h4>
                  <p className="text-sm text-red-100">Miles de vinos catalogados con información detallada</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">⭐</div>
                  <h4 className="font-bold text-white mb-1">Experiencia Premium</h4>
                  <p className="text-sm text-red-100">Sin límites, sin anuncios, solo el mejor contenido</p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-white text-red-700 hover:bg-red-50 font-bold px-10 py-6 text-lg shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  🚀 Registrarme gratis ahora
                </Button>
                <p className="text-sm text-red-100">
                  ✓ Sin tarjeta de crédito  •  ✓ Acceso inmediato  •  ✓ 100% gratuito
                </p>
              </div>
            </div>
          </div>
        )}
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
