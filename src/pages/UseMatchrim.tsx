import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppNav from '@/components/AppNav';
import Header from '@/components/Header';
import MatchrimPassport from '@/components/MatchrimPassport';
import WineCard from '@/components/WineCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  buildWinerimCartaUrl,
  generateMatchrimCode,
  type MatchrimProfileLike,
} from '@/utils/matchrimPassport';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { fetchWinesByAttributes, type WinerimWineWithMatch } from '@/services/winerimApi';
import { AlertCircle, BookmarkPlus, CheckCircle, ExternalLink, Loader2, MapPin, ScanLine, Sparkles, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { trackAppEvent } from '@/lib/analytics';

const WineMenuScanner = lazy(() => import('@/components/wine-import/WineMenuScanner'));

const parseProfileVector = (vector: string | null): MatchrimProfileLike | null => {
  if (!vector || !/^\d{5}$/.test(vector)) return null;
  const [potente, acidez, dulce, tanico, afrutado] = vector.split('').map(Number);
  return { potente, acidez, dulce, tanico, afrutado };
};

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

const ScannerFallback = () => (
  <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-white/70">
    <Loader2 className="mr-2 h-5 w-5 animate-spin text-red-800" />
    Preparando scanner...
  </div>
);

type LearnedProfileInfo = {
  confidence: number;
  samples: number;
};

type WinerimSortMode = 'match' | 'price-asc' | 'price-desc' | 'name';

const getWinerimWinePrice = (wine: WinerimWineWithMatch) => {
  const price = wine.prices?.[0]?.price;
  return typeof price === 'number' && Number.isFinite(price) ? price : null;
};

const formatWinerimFacet = (value?: string | null) => value?.trim() || 'Sin clasificar';

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getWinerimFitReason = (wine: WinerimWineWithMatch) => {
  const grapes = wine.grapes?.slice(0, 3).join(', ');
  const price = getWinerimWinePrice(wine);
  const details = [
    grapes ? `uvas: ${grapes}` : null,
    wine.region ? `región: ${wine.region}` : null,
    price ? `precio: ${price.toFixed(2)}€` : null,
  ].filter(Boolean);

  if (details.length === 0) {
    return `Tiene un ${wine.matchPercentage}% de afinidad con tu perfil Matchrim.`;
  }

  return `Tiene un ${wine.matchPercentage}% de afinidad con tu perfil Matchrim (${details.join(' · ')}).`;
};

const UseMatchrim = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'scanner' ? 'scanner' : 'winerim';
  const [profile, setProfile] = useState<MatchrimProfileLike | null>(null);
  const [codeProfile, setCodeProfile] = useState<MatchrimProfileLike | null>(null);
  const [learnedProfileInfo, setLearnedProfileInfo] = useState<LearnedProfileInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantCode, setRestaurantCode] = useState(searchParams.get('restaurant') || searchParams.get('r') || '');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [restaurantSessionId, setRestaurantSessionId] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [loadingWinerimWines, setLoadingWinerimWines] = useState(false);
  const [winerimWines, setWinerimWines] = useState<WinerimWineWithMatch[]>([]);
  const [winerimError, setWinerimError] = useState<string | null>(null);
  const [savingWineId, setSavingWineId] = useState<string | number | null>(null);
  const [savedWinerimWineKeys, setSavedWinerimWineKeys] = useState<Set<string>>(new Set());
  const [winerimTypeFilter, setWinerimTypeFilter] = useState('all');
  const [winerimSectionFilter, setWinerimSectionFilter] = useState('all');
  const [winerimMaxPrice, setWinerimMaxPrice] = useState('');
  const [winerimSortMode, setWinerimSortMode] = useState<WinerimSortMode>('match');

  const currentUseMatchrimPath = useMemo(() => {
    const queryString = searchParams.toString();
    return `/usar-matchrim${queryString ? `?${queryString}` : ''}`;
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      setLearnedProfileInfo(null);

      const sharedProfile = parseProfileVector(searchParams.get('v'));
      if (sharedProfile) {
        setProfile(sharedProfile);
        setCodeProfile(sharedProfile);
        setLoadingProfile(false);
        return;
      }

      if (user) {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('potente, acidez, dulce, tanico, afrutado')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading Matchrim profile:', error);
        }

        if (!data) {
          setProfile(null);
          setCodeProfile(null);
          setLoadingProfile(false);
          return;
        }

        setCodeProfile(data);

        const { data: trainingWines, error: trainingError } = await supabase
          .from('user_wines')
          .select('rating, sensory_attributes')
          .eq('user_id', user.id)
          .eq('use_for_profile_training', true)
          .not('rating', 'is', null)
          .not('sensory_attributes', 'is', null);

        if (trainingError) {
          console.error('Error loading Matchrim training wines:', trainingError);
          setProfile(data);
          setLearnedProfileInfo(null);
          setLoadingProfile(false);
          return;
        }

        const learned = calculateLearnedMatchrimProfile(data, (trainingWines || []) as TrainableWine[]);
        if (learned.samples > 0) {
          setProfile(learned.profile);
          setLearnedProfileInfo({
            confidence: learned.confidence,
            samples: learned.samples,
          });
        } else {
          setProfile(data);
          setLearnedProfileInfo(null);
        }

        setLoadingProfile(false);
        return;
      }

      const savedResult = localStorage.getItem('matchrim_quiz_result');
      const localProfile = savedResult ? JSON.parse(savedResult) : null;
      setProfile(localProfile);
      setCodeProfile(localProfile);
      setLoadingProfile(false);
    };

    loadProfile();
  }, [user, searchParams]);

  useEffect(() => {
    setActiveTab(searchParams.get('mode') === 'scanner' ? 'scanner' : 'winerim');
  }, [searchParams]);

  const handleActiveTabChange = (value: string) => {
    setActiveTab(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === 'scanner') {
      nextParams.set('mode', 'scanner');
    } else {
      nextParams.delete('mode');
    }

    navigate({
      pathname: '/usar-matchrim',
      search: nextParams.toString() ? `?${nextParams.toString()}` : '',
    }, { replace: true });
  };

  const matchrimCode = useMemo(
    () => codeProfile ? (searchParams.get('code') || generateMatchrimCode(codeProfile)) : '',
    [codeProfile, searchParams]
  );

  const winerimTypeOptions = useMemo(
    () => Array.from(new Set(winerimWines.map((wine) => formatWinerimFacet(wine.type)))).sort(),
    [winerimWines]
  );

  const winerimSectionOptions = useMemo(
    () => Array.from(new Set(winerimWines.map((wine) => formatWinerimFacet(wine.section)))).sort(),
    [winerimWines]
  );

  const visibleWinerimWines = useMemo(() => {
    const maxPrice = parseNullableNumber(winerimMaxPrice);

    return [...winerimWines]
      .filter((wine) => winerimTypeFilter === 'all' || formatWinerimFacet(wine.type) === winerimTypeFilter)
      .filter((wine) => winerimSectionFilter === 'all' || formatWinerimFacet(wine.section) === winerimSectionFilter)
      .filter((wine) => {
        const price = getWinerimWinePrice(wine);
        return maxPrice === null || price === null || price <= maxPrice;
      })
      .sort((a, b) => {
        if (winerimSortMode === 'price-asc') {
          return (getWinerimWinePrice(a) ?? Number.POSITIVE_INFINITY) - (getWinerimWinePrice(b) ?? Number.POSITIVE_INFINITY);
        }
        if (winerimSortMode === 'price-desc') {
          return (getWinerimWinePrice(b) ?? Number.NEGATIVE_INFINITY) - (getWinerimWinePrice(a) ?? Number.NEGATIVE_INFINITY);
        }
        if (winerimSortMode === 'name') {
          return a.name.localeCompare(b.name, 'es');
        }

        return b.matchPercentage - a.matchPercentage;
      });
  }, [winerimMaxPrice, winerimSectionFilter, winerimSortMode, winerimTypeFilter, winerimWines]);

  const createRestaurantSession = async (isWinerimRestaurant: boolean, requireRestaurantName = true) => {
    if (!profile) return null;

    if (!user) {
      if (requireRestaurantName) {
        toast.error('Inicia sesión para escanear cartas y guardar el restaurante');
        navigate(buildAuthRedirectPath(currentUseMatchrimPath));
      }
      return null;
    }

    if (requireRestaurantName && !restaurantName.trim()) {
      toast.error('Indica el restaurante donde estás');
      return null;
    }

    setSavingSession(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_matchrim_sessions')
        .insert({
          user_id: user.id,
          restaurant_name: restaurantName.trim() || restaurantCode.trim() || 'Restaurante Winerim',
          restaurant_address: restaurantAddress.trim() || null,
          restaurant_place_id: restaurantCode.trim() || null,
          is_winerim_restaurant: isWinerimRestaurant,
          matchrim_code: matchrimCode,
          matchrim_profile: { ...profile } as Json,
        })
        .select('id')
        .single();

      if (error) throw error;

      setRestaurantSessionId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating restaurant Matchrim session:', error);
      toast.error('No se pudo guardar el restaurante');
      return null;
    } finally {
      setSavingSession(false);
    }
  };

  const loadWinerimCarta = async () => {
    if (!profile) return;
    setLoadingWinerimWines(true);
    setWinerimError(null);
    setWinerimWines([]);
    setSavedWinerimWineKeys(new Set());
    setWinerimTypeFilter('all');
    setWinerimSectionFilter('all');
    setWinerimMaxPrice('');
    setWinerimSortMode('match');

    try {
      await createRestaurantSession(true, false);
      const wines = await fetchWinesByAttributes(profile, {
        restaurantUuid: restaurantCode,
        matchrimCode,
      });
      setWinerimWines(wines);

      if (wines.length === 0) {
        toast.info('La API de Winerim no devolvió vinos para este perfil');
      } else {
        toast.success(`${wines.length} vinos filtrados desde Winerim`);
        trackAppEvent('winerim_wines_loaded', { count: wines.length });
      }
    } catch (error) {
      console.error('Error loading Winerim wines:', error);
      trackAppEvent('winerim_wines_failed', { error: String(error) });
      setWinerimError(getErrorMessage(error, 'No se pudo cargar la carta Winerim'));
      toast.error('No se pudo cargar la carta Winerim');
    } finally {
      setLoadingWinerimWines(false);
    }
  };

  const openWinerimCarta = () => {
    if (!profile) return;
    window.open(buildWinerimCartaUrl(profile, matchrimCode, restaurantCode), '_blank', 'noopener,noreferrer');
  };

  const prepareScanner = async () => {
    const sessionId = await createRestaurantSession(false);
    if (!sessionId) return;
    setScannerReady(true);
    toast.success('Restaurante guardado. Ya puedes escanear la carta.');
  };

  const saveWinerimWineToMyWines = async (wine: WinerimWineWithMatch) => {
    if (!user) {
      toast.error('Inicia sesión para guardar vinos');
      navigate(buildAuthRedirectPath(currentUseMatchrimPath));
      return;
    }

    const wineKey = String(wine.id);
    if (savedWinerimWineKeys.has(wineKey)) return;

    setSavingWineId(wine.id);
    try {
      const sensoryAttributes = wine.tastingAttributes
        ? {
            potencia: wine.tastingAttributes.power,
            acidez: wine.tastingAttributes.acidity,
            dulzura: wine.tastingAttributes.sweetness,
            taninos: wine.tastingAttributes.tannin,
            afrutado: wine.tastingAttributes.fruity,
          }
        : null;
      const placeDetails = {
        source: 'winerim_api',
        winerim_wine_id: wine.id,
        restaurant_code: restaurantCode || null,
        restaurant_session_id: restaurantSessionId || null,
        matchrim_code: matchrimCode,
      } as Json;

      const firstPrice = wine.prices?.[0]?.price;
      const { error } = await supabase
        .from('user_wines')
        .insert({
          user_id: user.id,
          name: wine.name,
          producer: wine.winery || null,
          vintage: wine.vintage && !Number.isNaN(Number(wine.vintage)) ? Number(wine.vintage) : null,
          region: wine.region || null,
          country: wine.country || null,
          grape_varieties: wine.grapes || null,
          tasting_notes: wine.subname || null,
          status: 'wishlist',
          matchrim_affinity: wine.matchPercentage || null,
          sensory_attributes: sensoryAttributes as Json,
          use_for_profile_training: false,
          consumption_place: restaurantName.trim() || restaurantCode.trim() || null,
          consumption_place_type: 'restaurant',
          price: typeof firstPrice === 'number' ? firstPrice : null,
          place_details: placeDetails,
        });

      if (error) throw error;
      setSavedWinerimWineKeys((currentKeys) => new Set(currentKeys).add(wineKey));
      toast.success(`${wine.name} guardado en Quiero Probar`);
    } catch (error) {
      console.error('Error saving Winerim wine:', error);
      toast.error('No se pudo guardar el vino');
    } finally {
      setSavingWineId(null);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-stone-950">
        {user ? <AppNav /> : <Header />}
        <div className="flex items-center justify-center py-24 text-white">
          <Loader2 className="mr-3 h-8 w-8 animate-spin" />
          Cargando tu código Matchrim...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-stone-950">
        {user ? <AppNav /> : <Header />}
        <main className="mx-auto max-w-3xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Necesitas tu Matchrim primero</CardTitle>
              <CardDescription>
                Haz el test para obtener tu código y poder filtrar cartas Winerim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate(`/matchrim?returnTo=${encodeURIComponent(currentUseMatchrimPath)}`)}
                className="bg-red-800 hover:bg-red-900"
              >
                Crear mi código Matchrim
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-stone-950">
      {user ? <AppNav /> : <Header />}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-white">
          <Badge className="mb-4 bg-white/15 text-white hover:bg-white/15">
            Código Winerim
          </Badge>
          <h1 className="text-4xl font-bold">Usa tu Matchrim en un restaurante</h1>
          <p className="mt-3 max-w-3xl text-white/80">
            Si el restaurante tiene Winerim, tu código filtra la carta. Si no lo tiene, escanea la carta y guardaremos
            la señal para que ese restaurante pueda ver que sus clientes quieren Winerim.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <MatchrimPassport
              profile={codeProfile || profile}
              codeOverride={matchrimCode}
              compact
              showUseAction={false}
              showRestaurantAction={false}
            />

            {learnedProfileInfo && (
              <Alert className="border-green-200 bg-green-50">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Perfil afinado con tus vinos</AlertTitle>
                <AlertDescription>
                  Tu código se mantiene estable. Las recomendaciones ya incorporan {learnedProfileInfo.samples} vino{learnedProfileInfo.samples !== 1 ? 's' : ''} puntuado{learnedProfileInfo.samples !== 1 ? 's' : ''}.
                  Confianza del ajuste: {learnedProfileInfo.confidence}%.
                </AlertDescription>
              </Alert>
            )}

            {!user && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Para escanear cartas necesitas iniciar sesión</AlertTitle>
                <AlertDescription>
                  Puedes compartir tu código, pero el análisis de cartas y el historial de restaurantes se guardan en tu cuenta.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Restaurante donde estás
              </CardTitle>
              <CardDescription>
                Esta información convierte cada uso en una señal comercial para Winerim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name">
                    Restaurante{activeTab === 'scanner' ? ' *' : ''}
                  </Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(event) => setRestaurantName(event.target.value)}
                    placeholder="Nombre del restaurante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurant-address">Dirección o ciudad</Label>
                  <Input
                    id="restaurant-address"
                    value={restaurantAddress}
                    onChange={(event) => setRestaurantAddress(event.target.value)}
                    placeholder="Madrid, Valencia..."
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={handleActiveTabChange} className="space-y-5">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="winerim" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Tiene Winerim
                  </TabsTrigger>
                  <TabsTrigger value="scanner" className="gap-2">
                    <ScanLine className="h-4 w-4" />
                    No tiene Winerim
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="winerim" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-code">Código o slug de restaurante Winerim</Label>
                    <Input
                      id="restaurant-code"
                      value={restaurantCode}
                      onChange={(event) => setRestaurantCode(event.target.value)}
                      placeholder="Opcional, si viene en el QR o carta"
                    />
                  </div>
                  <Button
                    onClick={loadWinerimCarta}
                    disabled={loadingWinerimWines}
                    className="w-full gap-2 bg-red-800 hover:bg-red-900"
                  >
                    {loadingWinerimWines ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Filtrar carta desde API Winerim
                  </Button>

                  <Button
                    onClick={openWinerimCarta}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir carta en Winerim
                  </Button>

                  {winerimError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No se pudo cargar Winerim</AlertTitle>
                      <AlertDescription>{winerimError}</AlertDescription>
                    </Alert>
                  )}

                  {winerimWines.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <h3 className="font-semibold text-green-950">
                          Carta filtrada para {matchrimCode}
                        </h3>
                        <p className="mt-1 text-sm text-green-900">
                          Winerim ha devuelto {winerimWines.length} vino{winerimWines.length !== 1 ? 's' : ''}. Estás viendo {visibleWinerimWines.length} con los filtros actuales.
                        </p>
                      </div>

                      <Card>
                        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="winerim-sort">Orden</Label>
                            <Select value={winerimSortMode} onValueChange={(value) => setWinerimSortMode(value as WinerimSortMode)}>
                              <SelectTrigger id="winerim-sort">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="match">Mejor match</SelectItem>
                                <SelectItem value="price-asc">Precio menor</SelectItem>
                                <SelectItem value="price-desc">Precio mayor</SelectItem>
                                <SelectItem value="name">Nombre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="winerim-type">Tipo</Label>
                            <Select value={winerimTypeFilter} onValueChange={setWinerimTypeFilter}>
                              <SelectTrigger id="winerim-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {winerimTypeOptions.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="winerim-section">Servicio</Label>
                            <Select value={winerimSectionFilter} onValueChange={setWinerimSectionFilter}>
                              <SelectTrigger id="winerim-section">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {winerimSectionOptions.map((section) => (
                                  <SelectItem key={section} value={section}>{section}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="winerim-max-price">Precio máximo</Label>
                            <Input
                              id="winerim-max-price"
                              value={winerimMaxPrice}
                              onChange={(event) => setWinerimMaxPrice(event.target.value)}
                              inputMode="decimal"
                              placeholder="Sin límite"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {visibleWinerimWines.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center text-sm text-muted-foreground">
                            Ningún vino encaja con esos filtros. Sube el precio máximo o cambia tipo/servicio.
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                        {visibleWinerimWines.map((wine, index) => {
                          const wineKey = String(wine.id);
                          const isSaved = savedWinerimWineKeys.has(wineKey);

                          return (
                            <div key={`${wine.id}-${index}`} className="space-y-2">
                              <WineCard
                                wine={wine}
                                index={index}
                              />
                              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-950">
                                <div className="flex gap-2">
                                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-red-800" />
                                  <p>{getWinerimFitReason(wine)}</p>
                                </div>
                              </div>
                              <Button
                                onClick={() => saveWinerimWineToMyWines(wine)}
                                disabled={savingWineId === wine.id || isSaved}
                                variant="outline"
                                className="w-full gap-2 bg-white"
                              >
                                {isSaved ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : savingWineId === wine.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <BookmarkPlus className="h-4 w-4" />
                                )}
                                {isSaved ? 'Guardado en Quiero Probar' : 'Guardar en Quiero Probar'}
                              </Button>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scanner" className="space-y-4">
                  {!scannerReady ? (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <Wine className="mx-auto mb-3 h-10 w-10 text-red-800" />
                      <h3 className="font-semibold">Escanea la carta de este restaurante</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Te mostraremos los vinos que más encajan con {matchrimCode} y guardaremos la demanda para Winerim.
                      </p>
                      <Button
                        onClick={prepareScanner}
                        disabled={savingSession}
                        className="mt-4 gap-2 bg-red-800 hover:bg-red-900"
                      >
                        {savingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                        {user ? 'Guardar restaurante y escanear' : 'Iniciar sesión para escanear'}
                      </Button>
                    </div>
                  ) : (
                    <Suspense fallback={<ScannerFallback />}>
                      <WineMenuScanner
                        restaurantName={restaurantName}
                        matchrimCode={matchrimCode}
                        restaurantSessionId={restaurantSessionId}
                      />
                    </Suspense>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UseMatchrim;
