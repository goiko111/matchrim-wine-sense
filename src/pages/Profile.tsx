import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import { Wine, User, History, Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Sun, Utensils, Leaf, MapPin, Loader2, ArrowRight, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AppNav from '@/components/AppNav';
import MatchrimPassport from '@/components/MatchrimPassport';
import WineCard from '@/components/WineCard';
import {
  generateMatchrimName,
  generateWineStyles,
  generateGrapeRecommendations,
  generateRegionRecommendations
} from '@/utils/profileUtils';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import { buildAuthRedirectPath } from '@/utils/navigation';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { fetchWinesByAttributes, type WinerimWineWithMatch } from '@/services/winerimApi';
import { aggregateGrapes, aggregateRegions } from '@/utils/winerimDataAggregation';
import { STYLE_RANGES, WINE_STYLE_CATALOG, suggestWineStylesForProfile, type PublicWineStyle } from '@/lib/winerimClassifier';

const RegionMap = React.lazy(() => import('@/components/RegionMap'));

const STYLE_DESCRIPTIONS: Record<PublicWineStyle, string> = {
  'Tinto Versátil': 'Tinto equilibrado y adaptable, ideal para moverse por cartas amplias sin perder seguridad.',
  'Tinto de Estructura': 'Tinto con cuerpo, tanino y presencia, pensado para platos intensos y largas sobremesas.',
  'Tinto Goloso': 'Tinto frutal, amable y envolvente, con sensación jugosa y accesible.',
  'Tinto Ligero': 'Tinto fresco, ágil y fácil de beber, perfecto cuando buscas poca pesadez.',
  'Blanco Goloso': 'Blanco con fruta, volumen y una sensación más redonda en boca.',
  'Blanco Vital': 'Blanco vibrante, fresco y directo, con la acidez como protagonista.',
  'Blanco de Carácter': 'Blanco seco con nervio y más profundidad, pensado para quien busca tensión y matiz.',
  'Brut Elegante': 'Espumoso seco, fino y gastronómico, con acidez marcada y burbuja seria.',
  'Burbuja Fresca': 'Espumoso alegre y frutal, fresco pero más amable.',
  'Rosado Ligero': 'Rosado fresco, delicado y frutal, pensado para beber sin complicaciones.',
  'Rosado Gastronómico': 'Rosado con más presencia y versatilidad en mesa.',
  'Dulce Ligero': 'Dulce equilibrado y fresco, con azúcar sin perder agilidad.',
  'Dulce Intenso': 'Dulce potente y envolvente, para postres, quesos o momentos de mucha intensidad.',
  'Oxidativo/Maduro': 'Perfil maduro, complejo u oxidativo, con notas profundas y menos fruta primaria.',
  Experimental: 'Vinos singulares o difíciles de encajar en categorías clásicas.',
  'Vino de Terruño': 'Perfil marcado por origen, estructura y carácter de suelo o elaboración.',
};

type StyleRangeKey = 'P' | 'A' | 'D' | 'T' | 'Af';
const MAX_PROFILE_FACET_CARDS = 6;
const MAX_PROFILE_WINE_CARDS = 3;

const clampProfileValue = (value: unknown, fallback = 3) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(5, numeric));
};

const normalizeProfileForDisplay = <T extends MatchrimProfileLike>(profile: T): T => ({
  ...profile,
  potente: Math.round(clampProfileValue(profile.potente) * 10) / 10,
  acidez: Math.round(clampProfileValue(profile.acidez) * 10) / 10,
  dulce: Math.round(clampProfileValue(profile.dulce) * 10) / 10,
  tanico: Math.round(clampProfileValue(profile.tanico) * 10) / 10,
  afrutado: Math.round(clampProfileValue(profile.afrutado) * 10) / 10,
});

const normalizeProfileForClassifier = (profile: MatchrimProfileLike): MatchrimProfileLike => ({
  potente: Math.round(clampProfileValue(profile.potente)),
  acidez: Math.round(clampProfileValue(profile.acidez)),
  dulce: Math.round(clampProfileValue(profile.dulce)),
  tanico: Math.round(clampProfileValue(profile.tanico)),
  afrutado: Math.round(clampProfileValue(profile.afrutado)),
});

const getSafeProfileStyles = (profile: MatchrimProfileLike | null): string[] => {
  if (!profile) return [];

  try {
    const classifierProfile = normalizeProfileForClassifier(profile);
    const generatedStyles = generateWineStyles(classifierProfile);
    const suggestedStyles = suggestWineStylesForProfile(classifierProfile, 3);
    return Array.from(new Set([...generatedStyles, ...suggestedStyles])).slice(0, 3);
  } catch (error) {
    console.error('Error generating safe profile styles:', error);
    return [];
  }
};

const normalizeWineIdentityText = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildSavedWineKeys = (wine: {
  name?: string | null;
  producer?: string | null;
  vintage?: string | number | null;
  place_details?: unknown;
}) => {
  const keys = new Set<string>();
  const name = normalizeWineIdentityText(wine.name);
  const producer = normalizeWineIdentityText(wine.producer);
  const vintage = normalizeWineIdentityText(wine.vintage);

  if (name) keys.add(`name:${name}`);
  if (name || producer || vintage) keys.add(`full:${name}|${producer}|${vintage}`);

  const details = wine.place_details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>;
    const winerimId = normalizeWineIdentityText(record.winerim_wine_id as string | number | null);
    if (winerimId) keys.add(`winerim:${winerimId}`);
  }

  return keys;
};

const wineHasAlreadyBeenSaved = (wine: WinerimWineWithMatch, savedWineKeys: Set<string>) => {
  const keys = buildSavedWineKeys({
    name: wine.name,
    producer: wine.winery || wine.subname || null,
    vintage: wine.vintage ?? null,
  });

  keys.add(`winerim:${normalizeWineIdentityText(wine.id)}`);

  return Array.from(keys).some((key) => savedWineKeys.has(key));
};

const STYLE_ATTRIBUTE_UI: Array<{
  key: StyleRangeKey;
  profileKey: keyof Pick<MatchrimProfileLike, 'potente' | 'acidez' | 'dulce' | 'tanico' | 'afrutado'>;
  short: string;
  label: string;
}> = [
  { key: 'P', profileKey: 'potente', short: 'Pot.', label: 'Potencia' },
  { key: 'A', profileKey: 'acidez', short: 'Ac.', label: 'Acidez' },
  { key: 'D', profileKey: 'dulce', short: 'Dul.', label: 'Dulzor' },
  { key: 'T', profileKey: 'tanico', short: 'Tan.', label: 'Tanino' },
  { key: 'Af', profileKey: 'afrutado', short: 'Frut.', label: 'Fruta' },
];

const toDisplayRange = (range: readonly [number, number]): [number, number] => [
  Math.max(1, range[0]),
  Math.max(1, range[1]),
];

const formatRange = (range: readonly [number, number]) => {
  const [min, max] = toDisplayRange(range);
  return min === max ? `${min}` : `${min}-${max}`;
};

const StyleRangePreview = ({
  styleName,
  profile,
}: {
  styleName: string;
  profile: MatchrimProfileLike | null;
}) => {
  const ranges = STYLE_RANGES[styleName as PublicWineStyle];

  if (!ranges) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Rango Winerim
        </span>
        <span className="text-xs font-semibold text-stone-500">Escala 1-5</span>
      </div>
      <div className="space-y-2">
        {STYLE_ATTRIBUTE_UI.map((attribute) => {
          const rawRange = ranges[attribute.key];
          const [min, max] = toDisplayRange(rawRange);
          const value = profile ? Number(profile[attribute.profileKey]) : null;
          const valueIsInside = value !== null && Number.isFinite(value) && value >= min && value <= max;
          const left = ((min - 1) / 5) * 100;
          const width = ((max - min + 1) / 5) * 100;

          return (
            <div key={attribute.key} className="grid grid-cols-[3.25rem_1fr_2.5rem] items-center gap-2">
              <span className="text-xs font-semibold text-stone-700">{attribute.short}</span>
              <div className="relative h-2 rounded-full bg-stone-200">
                <span
                  className="absolute top-0 h-2 rounded-full bg-red-800"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                {value !== null && Number.isFinite(value) && (
                  <span
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                      valueIsInside ? 'bg-red-900' : 'bg-amber-500'
                    }`}
                    style={{ left: `calc(${((Math.min(Math.max(value, 1), 5) - 1) / 4) * 100}% - 0.5rem)` }}
                    aria-label={`${attribute.label}: tu valor ${value}`}
                  />
                )}
              </div>
              <span className="text-right text-xs font-bold text-stone-800">{formatRange(rawRange)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const { user, loading: authLoading } = useAuth();
  const { getQuizHistory } = useQuizResults();
  const [quizHistory, setQuizHistory] = useState<ProfileHistoryItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileHistoryItem | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [styleDetails, setStyleDetails] = useState<WineStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);
  const [trainingWines, setTrainingWines] = useState<TrainableWine[]>([]);
  const [savedWineKeys, setSavedWineKeys] = useState<Set<string>>(new Set());
  const [profileWinerimWines, setProfileWinerimWines] = useState<WinerimWineWithMatch[]>([]);
  const [loadingProfileWinerimWines, setLoadingProfileWinerimWines] = useState(false);
  const [profileWinerimError, setProfileWinerimError] = useState<string | null>(null);
  const [profileWinerimRetryKey, setProfileWinerimRetryKey] = useState(0);
  const [expandedRegionMap, setExpandedRegionMap] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(buildAuthRedirectPath('/profile'));
      return;
    }

    let cancelled = false;

    const loadQuizHistory = async () => {
      setIsLoadingProfile(true);
      try {
        const history = await getQuizHistory();
        if (cancelled) return;

        setQuizHistory(history as ProfileHistoryItem[]);
        setCurrentProfile(history.length > 0 ? history[0] as ProfileHistoryItem : null);
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };

    loadQuizHistory();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate, getQuizHistory]);

  useEffect(() => {
    if (!user) {
      setSavedWineKeys(new Set());
      return;
    }

    let cancelled = false;

    const loadSavedWineKeys = async () => {
      const { data, error } = await supabase
        .from('user_wines')
        .select('name, producer, vintage, place_details')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (error) {
        console.error('Error loading saved wine identities:', error);
        setSavedWineKeys(new Set());
        return;
      }

      const keys = new Set<string>();
      (data || []).forEach((wine) => {
        buildSavedWineKeys(wine).forEach((key) => keys.add(key));
      });
      setSavedWineKeys(keys);
    };

    loadSavedWineKeys();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !currentProfile) return;

    const loadTrainingWines = async () => {
      const { data, error } = await supabase
        .from('user_wines')
        .select('rating, sensory_attributes, use_for_profile_training')
        .eq('user_id', user.id)
        .or('use_for_profile_training.is.null,use_for_profile_training.eq.true')
        .not('rating', 'is', null)
        .not('sensory_attributes', 'is', null);

      if (error) {
        console.error('Error loading training wines:', error);
        setTrainingWines([]);
        return;
      }

      setTrainingWines((data || []) as TrainableWine[]);
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
  const activeDisplayProfile = useMemo(
    () => activeProfile ? normalizeProfileForDisplay(activeProfile) : null,
    [activeProfile]
  );
  const activeClassifierProfile = useMemo(
    () => activeProfile ? normalizeProfileForClassifier(activeProfile) : null,
    [activeProfile]
  );
  const currentDisplayProfile = useMemo(
    () => currentProfile ? normalizeProfileForDisplay(currentProfile) : null,
    [currentProfile]
  );
  const passportProfile = useMemo(
    () => currentProfile ? normalizeProfileForClassifier(currentProfile) : null,
    [currentProfile]
  );

  // Generate profile data
  const profileName = passportProfile ? generateMatchrimName(passportProfile) : "";
  const wineStyles = useMemo(
    () => getSafeProfileStyles(activeClassifierProfile),
    [activeClassifierProfile]
  );
  const recommendedGrapes = activeDisplayProfile ? generateGrapeRecommendations(activeDisplayProfile) : [];
  const recommendedRegions = activeDisplayProfile ? generateRegionRecommendations(activeDisplayProfile) : [];
  const winerimGrapeRecommendations = useMemo(
    () => {
      try {
        return aggregateGrapes(profileWinerimWines);
      } catch (error) {
        console.error('Error aggregating Winerim grapes:', error);
        return [];
      }
    },
    [profileWinerimWines]
  );
  const winerimRegionRecommendations = useMemo(
    () => {
      try {
        return aggregateRegions(profileWinerimWines);
      } catch (error) {
        console.error('Error aggregating Winerim regions:', error);
        return [];
      }
    },
    [profileWinerimWines]
  );
  const nextWinerimWines = useMemo(
    () => profileWinerimWines.filter((wine) => {
      try {
        return !wineHasAlreadyBeenSaved(wine, savedWineKeys);
      } catch (error) {
        console.error('Error checking saved Winerim wine:', error, wine);
        return true;
      }
    }),
    [profileWinerimWines, savedWineKeys]
  );

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

        const ordered = wineStyles.map((styleName) => {
          const remoteStyle = data?.find((s) => s.name === styleName);
          if (remoteStyle) return remoteStyle as WineStyle;

          const publicStyle = styleName as PublicWineStyle;
          const catalogItem = WINE_STYLE_CATALOG.find((item) => item.estilo === publicStyle);
          const ranges = STYLE_RANGES[publicStyle];

          return {
            id: `local-${catalogItem?.id ?? styleName}`,
            name: styleName,
            description: STYLE_DESCRIPTIONS[publicStyle] ?? 'Estilo de vino que se adapta a tu perfil sensorial.',
            potente: ranges ? Math.round((ranges.P[0] + ranges.P[1]) / 2) : 0,
            acidez: ranges ? Math.round((ranges.A[0] + ranges.A[1]) / 2) : 0,
            dulce: ranges ? Math.round((ranges.D[0] + ranges.D[1]) / 2) : 0,
            tanico: ranges ? Math.round((ranges.T[0] + ranges.T[1]) / 2) : 0,
            afrutado: ranges ? Math.round((ranges.Af[0] + ranges.Af[1]) / 2) : 0,
          } satisfies WineStyle;
        });

        setStyleDetails(ordered);
      } catch (error) {
        console.error('Error fetching wine styles:', error);
        setStyleDetails(wineStyles.map((styleName) => {
          const publicStyle = styleName as PublicWineStyle;
          const ranges = STYLE_RANGES[publicStyle];

          return {
            id: `local-${styleName}`,
            name: styleName,
            description: STYLE_DESCRIPTIONS[publicStyle] ?? 'Estilo de vino que se adapta a tu perfil sensorial.',
            potente: ranges ? Math.round((ranges.P[0] + ranges.P[1]) / 2) : 0,
            acidez: ranges ? Math.round((ranges.A[0] + ranges.A[1]) / 2) : 0,
            dulce: ranges ? Math.round((ranges.D[0] + ranges.D[1]) / 2) : 0,
            tanico: ranges ? Math.round((ranges.T[0] + ranges.T[1]) / 2) : 0,
            afrutado: ranges ? Math.round((ranges.Af[0] + ranges.Af[1]) / 2) : 0,
          } satisfies WineStyle;
        }));
      } finally {
        setIsLoadingStyles(false);
      }
    };

    fetchStyleDetails();
  }, [currentProfile, wineStyles]);

  useEffect(() => {
    if (!activeClassifierProfile) {
      setProfileWinerimWines([]);
      setProfileWinerimError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingProfileWinerimWines(true);
      setProfileWinerimError(null);

      fetchWinesByAttributes(activeClassifierProfile)
        .then((wines) => {
          if (!cancelled) {
            setProfileWinerimWines(wines);
          }
        })
        .catch((error) => {
          console.error('Error fetching Winerim profile wines:', error);
          if (!cancelled) {
            setProfileWinerimWines([]);
            setProfileWinerimError(
              error instanceof Error
                ? `No se pudieron cargar los vinos Winerim para tu perfil: ${error.message}`
                : 'No se pudieron cargar los vinos Winerim para tu perfil.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingProfileWinerimWines(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeClassifierProfile, profileWinerimRetryKey]);

  const chartData = currentDisplayProfile && activeDisplayProfile ? [
    { attribute: "Potente", baseValue: currentDisplayProfile.potente, activeValue: activeDisplayProfile.potente },
    { attribute: "Acidez", baseValue: currentDisplayProfile.acidez, activeValue: activeDisplayProfile.acidez },
    { attribute: "Dulce", baseValue: currentDisplayProfile.dulce, activeValue: activeDisplayProfile.dulce },
    { attribute: "Tánico", baseValue: currentDisplayProfile.tanico, activeValue: activeDisplayProfile.tanico },
    { attribute: "Afrutado", baseValue: currentDisplayProfile.afrutado, activeValue: activeDisplayProfile.afrutado },
  ] : [];

  const hasLearnedProfile = Boolean(learnedProfile && learnedProfile.samples > 0);
  const hasLearnedAdjustments = hasLearnedProfile && chartData.some((item) => item.baseValue !== item.activeValue);
  const confidenceCopy = learnedProfile
    ? learnedProfile.samples < 3
      ? 'Señal temprana: útil para ajustar, todavía no definitiva.'
      : learnedProfile.samples < 12
        ? 'Personalización en progreso: cada valoración afina el mapa.'
        : 'Personalización fuerte: tu historial ya pesa bastante en las recomendaciones.'
    : '';

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

  if (authLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <div className="h-9 w-44 animate-pulse rounded-md bg-stone-200" />
            <div className="mt-3 h-5 w-full max-w-md animate-pulse rounded-md bg-stone-100" />
          </div>
          <div className="space-y-5">
            <Card className="border-red-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-900">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-950">Cargando tu perfil Matchrim</h1>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Estoy recuperando tu test, aprendizaje y recomendaciones Winerim.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="h-5 w-2/3 animate-pulse rounded-md bg-stone-200" />
                  <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-stone-100" />
                  <div className="mt-3 h-2 w-4/5 animate-pulse rounded-full bg-stone-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {passportProfile && <MatchrimPassport profile={passportProfile} />}

              {learnedProfile && learnedProfile.samples > 0 && (
                <Card className="border-amber-200 bg-amber-50/70">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold text-amber-950">Perfil aprendido activo</h3>
                        <p className="text-sm text-amber-900">
                          Tus recomendaciones se están afinando con {learnedProfile.samples} vino{learnedProfile.samples !== 1 ? 's' : ''} puntuado{learnedProfile.samples !== 1 ? 's' : ''}.
                          Tu código público se mantiene estable; tus valoraciones ajustan el match.
                        </p>
                        <p className="mt-2 text-xs font-medium text-amber-900">
                          {confidenceCopy}
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

              {/* Perfil sensorial */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Tu perfil sensorial
                </h3>
                {hasLearnedProfile && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-stone-300 text-stone-700">
                      Test base
                    </Badge>
                    <Badge className="bg-red-800 hover:bg-red-800">
                      Perfil activo
                    </Badge>
                    {!hasLearnedAdjustments && (
                      <Badge variant="secondary">
                        Sin cambios visibles todavía
                      </Badge>
                    )}
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="space-y-4">
                    {chartData.map((item) => {
                      const activeValue = Math.max(1, Math.min(5, Number(item.activeValue) || 1));
                      const baseValue = Math.max(1, Math.min(5, Number(item.baseValue) || 1));
                      const activeWidth = `${(activeValue / 5) * 100}%`;
                      const baseWidth = `${(baseValue / 5) * 100}%`;

                      return (
                        <div key={item.attribute} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-800">{item.attribute}</span>
                            {hasLearnedProfile && item.baseValue !== item.activeValue && (
                              <span className="text-xs font-medium text-amber-700">ajustado por tus vinos</span>
                            )}
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-stone-100">
                            {hasLearnedProfile && (
                              <span
                                className="absolute inset-y-0 left-0 rounded-full bg-stone-300"
                                style={{ width: baseWidth }}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="absolute inset-y-0 left-0 rounded-full bg-red-900"
                              style={{ width: activeWidth }}
                              aria-label={`${item.attribute}: perfil activo ${activeValue} de 5`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Wine Styles Section */}
              {styleDetails.length > 0 && (
                <div>
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-2xl font-bold text-red-950">
                        <Wine className="h-6 w-6" />
                        Tus estilos Winerim
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
                        Estos estilos son la traducción Winerim de tu perfil activo. El principal es tu zona
                        de comodidad; los cercanos sirven para descubrir vinos nuevos con riesgo controlado.
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit border-red-200 bg-red-50 px-3 py-1 text-red-800">
                      {styleDetails.length} estilo{styleDetails.length !== 1 ? 's' : ''} compatible{styleDetails.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-red-950">
                        <span className="font-bold">Cómo leerlo:</span> las barras muestran el rango Winerim del estilo en escala 1-5.
                        Tu punto encima de la barra indica si el estilo entra en tu territorio.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 border-red-200 bg-white text-red-900 hover:bg-red-50"
                        onClick={() => navigate('/wine-styles')}
                      >
                        Ver catálogo de estilos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {styleDetails.map((style, index) => {
                      const config = getCardConfig(style.name);
                      const IconComponent = config.icon;
                      const cleanedName = style.name as PublicWineStyle;

                      return (
                        <Card key={style.id} className={`${config.bg} ${config.border} border hover:shadow-lg transition-shadow cursor-pointer`}
                          onClick={() => navigate(`/wine-styles/${generateSlug(style.name)}`)}>
                          <CardContent className="p-5">
                            <div className="mb-4 flex items-start gap-4">
                              <div className={`${config.iconBg} rounded-xl p-3 flex-shrink-0 shadow-sm`}>
                                <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-bold text-stone-950">{style.name}</h4>
                                  <Badge
                                    variant={index === 0 ? 'default' : 'outline'}
                                    className={index === 0 ? 'bg-red-800 hover:bg-red-800' : 'border-stone-300 text-stone-600'}
                                  >
                                    {index === 0 ? 'Principal' : 'Cercano'}
                                  </Badge>
                                </div>
                                <p className="text-sm leading-relaxed text-stone-700">
                                  {style.description || 'Estilo de vino que se adapta a tu perfil sensorial.'}
                                </p>
                              </div>
                            </div>
                            <StyleRangePreview styleName={cleanedName} profile={activeDisplayProfile} />
                            {style.name === 'Vino de Terruño' && (
                              <p className="mt-4 rounded-xl border border-stone-200 bg-white/75 p-3 text-sm leading-relaxed text-stone-700">
                                Terruño no significa “más potente” siempre: aquí pesa mucho la estructura,
                                el origen y el tanino alto. Por eso puede aparecer tanto con tintos como con blancos serios.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommended Grapes */}
              {(winerimGrapeRecommendations.length > 0 || recommendedGrapes.length > 0) && (
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                    <Grape className="w-6 h-6" />
                    Uvas recomendadas para ti
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(winerimGrapeRecommendations.length > 0
                      ? winerimGrapeRecommendations.map((grape) => ({
                          name: grape.name,
                          helper: `${grape.count} vino${grape.count !== 1 ? 's' : ''} Winerim compatible${grape.count !== 1 ? 's' : ''} con tu perfil.`,
                        }))
                      : recommendedGrapes.map((grape) => ({
                          name: grape,
                          helper: getGrapeDescription(grape),
                        }))
                    ).slice(0, MAX_PROFILE_FACET_CARDS).map((grape, index) => (
                      <Card key={`${grape.name}-${index}`} className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-200 rounded-full p-2 flex-shrink-0">
                              <Grape className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <h4 className="font-bold text-purple-900 mb-2">{grape.name}</h4>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {grape.helper}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {winerimRegionRecommendations.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    Regiones Winerim que coinciden contigo
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {winerimRegionRecommendations.slice(0, MAX_PROFILE_FACET_CARDS).map((region) => (
                      <Card key={`${region.region}-${region.country}`} className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-amber-200 p-2">
                              <MapPin className="h-5 w-5 text-amber-800" />
                            </div>
                            <div>
                              <h4 className="font-bold text-amber-950">{region.region}</h4>
                              <p className="text-sm text-amber-900">{region.country}</p>
                              <p className="mt-2 text-sm text-gray-700">
                                {region.count} vino{region.count !== 1 ? 's' : ''} compatible{region.count !== 1 ? 's' : ''}; afinidad media {region.avgMatchPercentage}%.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {winerimRegionRecommendations.length > MAX_PROFILE_FACET_CARDS && (
                    <p className="mt-3 text-sm text-stone-500">
                      Mostrando las {MAX_PROFILE_FACET_CARDS} regiones con más señal para tu perfil.
                    </p>
                  )}
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
                            className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-200 text-amber-900">
                                  <MapPin className="w-6 h-6" />
                                </div>
                                <h5 className="font-bold text-lg text-gray-900 flex-1">
                                  {region.split('(')[0].trim()}
                                </h5>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed mb-4">{getRegionDescription(region)}</p>

                              {expandedRegionMap === region ? (
                                <div className="space-y-3">
                                  <React.Suspense
                                    fallback={
                                      <div
                                        className="w-full h-48 rounded-lg border border-amber-200 bg-amber-100/70 animate-pulse"
                                        aria-label="Cargando mapa de la región"
                                      />
                                    }
                                  >
                                    <RegionMap
                                      region={region}
                                      coordinates={getRegionCoordinates(region)}
                                    />
                                  </React.Suspense>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="matchrim-pressable w-full bg-white"
                                    onClick={() => setExpandedRegionMap(null)}
                                  >
                                    Ocultar mapa
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="matchrim-pressable w-full bg-white"
                                  onClick={() => setExpandedRegionMap(region)}
                                >
                                  Ver mapa de la región
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tip Section */}
              <div>
                <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-red-900">
                  <Wine className="h-6 w-6" />
                  Vinos Winerim que deberías probar
                </h3>
                {loadingProfileWinerimWines ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8 text-gray-600">
                      Cargando vinos Winerim...
                    </CardContent>
                  </Card>
                ) : profileWinerimError ? (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-6 text-sm text-amber-900">
                      <p>{profileWinerimError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 bg-white"
                        disabled={loadingProfileWinerimWines}
                        onClick={() => setProfileWinerimRetryKey((value) => value + 1)}
                      >
                        {loadingProfileWinerimWines ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Reintentar carga
                      </Button>
                    </CardContent>
                  </Card>
                ) : nextWinerimWines.length > 0 ? (
                  <>
                    <p className="mb-4 max-w-2xl text-sm leading-6 text-stone-600">
                      Estos salen de Winerim para tu perfil y no aparecen ya en Mis Vinos. Son candidatos para guardar en Quiero Probar.
                    </p>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {nextWinerimWines.slice(0, MAX_PROFILE_WINE_CARDS).map((wine, index) => (
                      <WineCard key={wine.id} wine={wine} index={index} profile={activeDisplayProfile} />
                    ))}
                    </div>
                  </>
                ) : profileWinerimWines.length > 0 ? (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-6 text-sm leading-6 text-green-950">
                      Winerim sí ha devuelto vinos para tu perfil, pero todos los primeros candidatos ya están en Mis Vinos.
                      Escanea una carta o usa Encontrar vino para descubrir opciones nuevas.
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-6 text-sm text-gray-600">
                      Todavia no hay vinos Winerim disponibles para este perfil.
                    </CardContent>
                  </Card>
                )}
              </div>

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
