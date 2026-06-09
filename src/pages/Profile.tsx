import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Wine, User, History, Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Sun, Utensils, Leaf, MapPin, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import RegionMap from '@/components/RegionMap';
import AppNav from '@/components/AppNav';
import MatchrimPassport from '@/components/MatchrimPassport';
import {
  generateMatchrimName,
  generateWineStyles,
  generateGrapeRecommendations,
  generateRegionRecommendations
} from '@/utils/profileUtils';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

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

interface ProfileHistoryItem extends MatchrimProfileLike {
  id?: string;
  created_at?: string | null;
}

interface StyleCardConfig {
  bg: string;
  border: string;
  iconBg: string;
  icon: LucideIcon;
  iconColor: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getQuizHistory } = useQuizResults();
  const [quizHistory, setQuizHistory] = useState<ProfileHistoryItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileHistoryItem | null>(null);
  const [styleDetails, setStyleDetails] = useState<WineStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);
  const [trainingWines, setTrainingWines] = useState<TrainableWine[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Only load if we don't already have quiz history
    if (quizHistory.length === 0) {
      const loadQuizHistory = async () => {
        const history = await getQuizHistory();
        setQuizHistory(history as ProfileHistoryItem[]);
        if (history.length > 0) {
          setCurrentProfile(history[0] as ProfileHistoryItem);
        }
      };

      loadQuizHistory();
    }
  }, [user, navigate, getQuizHistory, quizHistory.length]);

  useEffect(() => {
    if (!user || !currentProfile) return;

    const loadTrainingWines = async () => {
      const { data, error } = await supabase
        .from('user_wines')
        .select('rating, sensory_attributes')
        .eq('user_id', user.id)
        .not('rating', 'is', null)
        .not('sensory_attributes', 'is', null);

      if (error) {
        console.error('Error loading training wines:', error);
        setTrainingWines([]);
        return;
      }

      setTrainingWines(data || []);
    };

    loadTrainingWines();
  }, [user, currentProfile]);

  const learnedProfile = useMemo(
    () => currentProfile ? calculateLearnedMatchrimProfile(currentProfile, trainingWines) : null,
    [currentProfile, trainingWines]
  );

  const activeProfile = learnedProfile && learnedProfile.samples > 0
    ? learnedProfile.profile
    : currentProfile;

  // Generate profile data
  const profileName = activeProfile ? generateMatchrimName(activeProfile) : "";
  const wineStyles = useMemo(() =>
    activeProfile ? generateWineStyles(activeProfile) : [],
    [activeProfile]
  );
  const recommendedGrapes = activeProfile ? generateGrapeRecommendations(activeProfile) : [];
  const recommendedRegions = activeProfile ? generateRegionRecommendations(activeProfile) : [];

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

  const chartData = activeProfile ? [
    { attribute: "Potente", value: activeProfile.potente },
    { attribute: "Acidez", value: activeProfile.acidez },
    { attribute: "Dulce", value: activeProfile.dulce },
    { attribute: "Tánico", value: activeProfile.tanico },
    { attribute: "Afrutado", value: activeProfile.afrutado },
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
    const configs: Record<string, StyleCardConfig> = {
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

  const generateSlug = (name: string) => {
    return name
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
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

  const getRegionCoordinates = (region: string): [number, number] => {
    const coordinates: Record<string, [number, number]> = {
      // España - Coordenadas de las zonas vitivinícolas específicas
      'Rioja (España)': [-2.6800, 42.4600], // Haro, corazón de Rioja Alta
      'Ribera del Duero (España)': [-3.9800, 41.6800], // Peñafiel, centro vitivinícola
      'Rías Baixas (España)': [-8.8100, 42.4300], // Cambados, capital del Albariño
      'Priorat (España)': [0.7300, 41.1700], // Gratallops, centro DOQ Priorat
      'Rueda (España)': [-4.9600, 41.4100], // Rueda, centro de la DO
      'Bierzo (España)': [-6.7500, 42.5500], // Villafranca del Bierzo
      'Jerez (España)': [-6.1400, 36.6900], // Jerez de la Frontera, zona vinícola
      'Penedès (España)': [1.7700, 41.3500], // Sant Sadurní d'Anoia, capital del cava
      'Toro (España)': [-5.3900, 41.5200], // Toro, zona de viñedos
      'Somontano (España)': [0.0800, 42.1200], // Barbastro, zona vitivinícola
      'Montsant (España)': [0.8500, 41.2200], // Falset, centro de Montsant
      'Navarra (España)': [-1.8500, 42.4500], // Olite, zona vinícola
      'Valdeorras (España)': [-7.0500, 42.4000], // Viñedos de Valdeorras
      'Ronda (España)': [-5.1400, 36.7500], // Zona vitivinícola de Ronda
      'Jumilla (España)': [-1.3200, 38.4800], // Jumilla, zona DO
      'Yecla (España)': [-1.1100, 38.6200], // Yecla, zona DO
      'Alicante (España)': [-0.6500, 38.5500], // Zona vitivinícola de Alicante
      'Valencia (España)': [-0.7500, 39.3000], // Zona vinícola de Valencia
      'Utiel-Requena (España)': [-1.2000, 39.5700], // Requena, centro vitivinícola
      'Cariñena (España)': [-1.2200, 41.3300], // Cariñena, pueblo vinícola
      'Campo de Borja (España)': [-1.6000, 41.8300], // Borja, zona vinícola
      'Calatayud (España)': [-1.6500, 41.3500], // Calatayud, zona DO
      'Cigales (España)': [-4.7100, 41.7600], // Cigales, zona vinícola
      'Arribes (España)': [-6.6500, 41.1500], // Zona vitivinícola de Arribes
      'Sierra de Málaga (España)': [-4.7000, 36.8500], // Zona vitivinícola serrana
      'Méntrida (España)': [-4.3500, 40.0500], // Méntrida, zona vinícola
      'Vinos de Madrid (España)': [-3.8500, 40.3500], // Zona vitivinícola de Madrid
      'Mallorca (España)': [2.9500, 39.5500], // Binissalem, zona vinícola
      'Canarias (España)': [-16.5500, 28.4500], // Valle de la Orotava, zona vinícola
      'Monterrei (España)': [-7.4400, 41.9500], // Monterrei, zona DO

      // Francia - Zonas vitivinícolas específicas
      'Borgoña (Francia)': [4.8600, 47.0200], // Beaune, capital del vino de Borgoña
      'Burdeos (Francia)': [-0.5700, 44.8900], // Médoc, zona vinícola
      'Valle del Ródano (Francia)': [4.8000, 44.1200], // Châteauneuf-du-Pape
      'Champagne (Francia)': [4.0400, 49.0500], // Épernay, capital del Champagne
      'Valle del Loira (Francia)': [1.0000, 47.4000], // Sancerre, zona vinícola
      'Alsacia (Francia)': [7.2800, 48.1500], // Ruta del vino de Alsacia
      'Languedoc (Francia)': [2.8500, 43.3500], // Zona vitivinícola de Languedoc
      'Provenza (Francia)': [6.1500, 43.4000], // Zona rosados de Provenza

      // Italia - Zonas vitivinícolas específicas
      'Toscana (Italia)': [11.2500, 43.5500], // Chianti, zona vinícola
      'Piemonte (Italia)': [8.0300, 44.6500], // Barolo, zona DOCG
      'Véneto (Italia)': [11.0000, 45.4500], // Valpolicella, zona vinícola
      'Sicilia (Italia)': [14.3500, 37.5000], // Etna, zona vitivinícola
      'Barolo (Italia)': [7.9300, 44.6100], // La Morra, corazón de Barolo
      'Barbaresco (Italia)': [8.0800, 44.7200], // Barbaresco, zona DOCG

      // Portugal - Zonas vitivinícolas específicas
      'Douro (Portugal)': [-7.2000, 41.1500], // Alto Douro Vinhateiro
      'Alentejo (Portugal)': [-7.5000, 38.3500], // Zona vinícola de Alentejo
      'Dão (Portugal)': [-7.9000, 40.5000], // Viseu, zona vitivinícola
      'Vinho Verde (Portugal)': [-8.5000, 41.6500], // Zona del Vinho Verde

      // Alemania - Zonas vitivinícolas específicas
      'Mosel (Alemania)': [7.0500, 49.9500], // Bernkastel, zona vinícola
      'Rheingau (Alemania)': [7.9500, 50.0000], // Rüdesheim, zona vinícola
      'Pfalz (Alemania)': [8.1500, 49.4500], // Zona del Pfalz vinícola

      // Austria - Zonas vitivinícolas específicas
      'Wachau (Austria)': [15.4200, 48.3700], // Wachau, zona vinícola del Danubio

      // Estados Unidos - Zonas vitivinícolas específicas
      'Napa Valley (EE.UU.)': [-122.4200, 38.5000], // Oakville, corazón de Napa
      'Sonoma (EE.UU.)': [-122.8000, 38.4500], // Healdsburg, zona vinícola
      'Willamette Valley (EE.UU.)': [-123.3000, 45.2500], // Dundee, zona Pinot Noir

      // Sudamérica - Zonas vitivinícolas específicas
      'Mendoza (Argentina)': [-69.0000, -33.0500], // Luján de Cuyo, zona vitivinícola
      'Valle de Maipo (Chile)': [-70.7500, -33.6500], // Pirque, zona vinícola
      'Valle de Colchagua (Chile)': [-71.0000, -34.6000], // Santa Cruz, zona vitivinícola
      'Salta (Argentina)': [-65.9800, -25.6500], // Cafayate, zona de altura

      // Oceanía - Zonas vitivinícolas específicas
      'Marlborough (Nueva Zelanda)': [173.8000, -41.5200], // Blenheim, zona Sauvignon Blanc
      'Barossa Valley (Australia)': [139.0500, -34.5500], // Tanunda, corazón de Barossa
      'Yarra Valley (Australia)': [145.4500, -37.6500], // Zona vitivinícola de Yarra

      // Sudáfrica - Zonas vitivinícolas específicas
      'Stellenbosch (Sudáfrica)': [18.8700, -33.9300] // Stellenbosch, zona vinícola
    };
    return coordinates[region] || [0, 0];
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
    <>
      <AppNav />
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
              <MatchrimPassport profile={activeProfile} />

              {learnedProfile && learnedProfile.samples > 0 && (
                <Card className="border-amber-200 bg-amber-50/70">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold text-amber-950">Perfil aprendido activo</h3>
                        <p className="text-sm text-amber-900">
                          Tu código se está afinando con {learnedProfile.samples} vino{learnedProfile.samples !== 1 ? 's' : ''} puntuado{learnedProfile.samples !== 1 ? 's' : ''}.
                          El test sigue siendo la base, pero tus valoraciones ya ajustan el match.
                        </p>
                      </div>
                      <div className="min-w-[220px]">
                        <div className="mb-1 flex justify-between text-xs font-medium text-amber-900">
                          <span>Confianza</span>
                          <span>{learnedProfile.confidence}%</span>
                        </div>
                        <Progress value={learnedProfile.confidence} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Radar Chart */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Tu radar sensorial
                </h3>
                <div className="h-80 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <ChartContainer config={chartConfig} className="w-full max-w-md aspect-square">
                    <RadarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <PolarGrid stroke="#be123c33" />
                      <PolarAngleAxis dataKey="attribute" tick={{ fill: '#be123c', fontSize: 12 }} />
                      <PolarRadiusAxis domain={[1, 5]} stroke="#be123c" tick={{ fontSize: 10 }} />
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
                          onClick={() => navigate(`/wine-styles/${generateSlug(style.name)}`)}>
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
                  <p className="text-gray-700 mb-6 text-lg">
                    Estas regiones vinícolas producen vinos que se alinean con tus preferencias:
                  </p>

                  {sortedCountries.map(({ country, regions }) => (
                    <div key={country} className="mb-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <span className="text-3xl">{getCountryEmoji(country)}</span>
                        <span>{country}</span>
                        <span className="text-sm font-normal text-gray-600">({regions.length} {regions.length === 1 ? 'región' : 'regiones'})</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {regions.map((region, index) => (
                          <div
                            key={index}
                            className="group relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 rounded-2xl border-2 border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
                          >
                            {/* Efecto de brillo */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

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
                  onClick={() => navigate('/matchrim')}
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
    </>
  );
};

export default Profile;
