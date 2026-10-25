import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { cellarTrainingRows } from '@/utils/bodegaAffinity';
import { supabase } from '@/integrations/supabase/client';
import NativeAppHome from '@/components/NativeAppHome';
import { useAuth } from '@/contexts/AuthContext';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import { readMatchrimLocalProfile } from '@/utils/matchrimLocalProfile';
import { withNativeHomeRead225 } from '@/utils/nativeHomeRead225';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearningPlatform';
import {
  selectUnseenWineRecommendations,
  type WineIdentityLike,
} from '@/utils/matchrimRecommendations';
import { fetchWinesByAttributes, type WinerimWineWithMatch } from '@/services/winerimApi';

type HomeLearningInfo = {
  samples: number;
  confidence: number;
};

type HomeUserWine = TrainableWine & {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  use_for_profile_training?: boolean | null;
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [codeProfile, setCodeProfile] = useState<MatchrimProfileLike | null>(() => readMatchrimLocalProfile());
  const [activeProfile, setActiveProfile] = useState<MatchrimProfileLike | null>(() => readMatchrimLocalProfile());
  const [hasQuizResults, setHasQuizResults] = useState(() => Boolean(readMatchrimLocalProfile()));
  const [loadingHomeProfile, setLoadingHomeProfile] = useState(() => !readMatchrimLocalProfile());
  const [learningInfo, setLearningInfo] = useState<HomeLearningInfo | null>(null);
  const [savedWines, setSavedWines] = useState<WineIdentityLike[]>([]);
  const [savedWineOwnerId, setSavedWineOwnerId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<WinerimWineWithMatch[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsUnavailable, setRecommendationsUnavailable] = useState(false);
  const [recommendationsExhausted, setRecommendationsExhausted] = useState(false);
  const [nativeHomeReadError, setNativeHomeReadError] = useState<'profile' | 'wines' | null>(null);
  const [nativeHomeRetry, setNativeHomeRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const nativeRead = Capacitor.isNativePlatform() ? new AbortController() : null;

    const checkQuizResults = async () => {
      const native = Capacitor.isNativePlatform();
      const localProfile = native && user ? null : readMatchrimLocalProfile();
      if (native) setNativeHomeReadError(null);

      if (localProfile) {
        setCodeProfile(localProfile);
        setActiveProfile(localProfile);
        setHasQuizResults(true);
        setLoadingHomeProfile(false);
      }

      if (authLoading) {
        setLoadingHomeProfile(!localProfile);
        return;
      }

      if (!user) {
        setCodeProfile(localProfile);
        setActiveProfile(localProfile);
        setHasQuizResults(Boolean(localProfile));
        setLearningInfo(null);
        setSavedWines([]);
        setSavedWineOwnerId('anonymous');
        setLoadingHomeProfile(false);
        return;
      }

      if (!localProfile) setLoadingHomeProfile(true);
      setSavedWines([]);
      setSavedWineOwnerId(null);

      const quizQuery = supabase
          .from('quiz_results')
          .select('potente, acidez, dulce, tanico, afrutado')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
      const winesQuery = supabase
          .from('user_wines')
          .select('id, name, producer, vintage, region, country, place_details, rating, sensory_attributes, use_for_profile_training, created_at, updated_at')
          .eq('user_id', user.id);
      const pending = Promise.all([
        (nativeRead ? quizQuery.abortSignal(nativeRead.signal) : quizQuery).maybeSingle(),
        nativeRead ? winesQuery.abortSignal(nativeRead.signal) : winesQuery,
      ]);
      const [{ data, error }, { data: userWines, error: userWinesError }] = await (
        nativeRead ? withNativeHomeRead225(pending, nativeRead.signal, () => nativeRead.abort()) : pending
      ).catch(failure => {
        if (!nativeRead) throw failure;
        return [{ data: null, error: failure }, { data: null, error: failure }] as Awaited<typeof pending>;
      });

      if (cancelled) return;

      const invalidNativeProfile = native && data && !['potente', 'acidez', 'dulce', 'tanico', 'afrutado'].every(key =>
        typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0 && data[key] <= 5);
      if (native && (error || userWinesError || invalidNativeProfile)) {
        setNativeHomeReadError(error || invalidNativeProfile ? 'profile' : 'wines');
        setCodeProfile(null);
        setActiveProfile(null);
        setHasQuizResults(false);
        setLearningInfo(null);
        setSavedWines([]);
        setSavedWineOwnerId(user.id);
        setLoadingHomeProfile(false);
        return;
      }

      if (error) {
        console.error('Error checking Matchrim code for home:', error);
      }

      if (userWinesError) {
        console.error('Error loading Matchrim learning for home:', userWinesError);
      }

      if (data) {
        const wines = (userWines || []) as HomeUserWine[];
        const trainingWines = cellarTrainingRows(wines.filter((wine) => (
          wine.use_for_profile_training === true && Boolean(wine.rating) && Boolean(wine.sensory_attributes)
        )), Capacitor.isNativePlatform());
        const learned = calculateLearnedMatchrimProfile(data, trainingWines);
        setCodeProfile(data);
        setActiveProfile(learned.samples > 0 ? learned.profile : data);
        setLearningInfo(learned.samples > 0 ? {
          samples: learned.samples,
          confidence: learned.confidence,
        } : null);
        setSavedWines(wines.map((wine) => ({
          name: wine.name,
          producer: wine.producer,
          vintage: wine.vintage,
        })));
        setSavedWineOwnerId(user.id);
        setHasQuizResults(true);
        if (!native) try {
          localStorage.setItem('matchrim_quiz_result', JSON.stringify(data));
        } catch {
          // Local cache is only used to make the next decision screen immediate.
        }
      } else {
        setCodeProfile(localProfile);
        setActiveProfile(localProfile);
        setLearningInfo(null);
        setSavedWines(((userWinesError ? [] : userWines) || []).map((wine) => ({
          name: wine.name, producer: wine.producer, vintage: wine.vintage,
        })));
        setSavedWineOwnerId(user.id);
        setHasQuizResults(Boolean(localProfile));
      }

      setLoadingHomeProfile(false);
    };

    checkQuizResults();
    return () => {
      cancelled = true;
      nativeRead?.abort();
    };
  }, [authLoading, user, nativeHomeRetry]);

  useEffect(() => {
    const expectedOwnerId = user?.id || 'anonymous';
    if (!activeProfile || loadingHomeProfile || savedWineOwnerId !== expectedOwnerId) {
      setRecommendations([]);
      setRecommendationsExhausted(false);
      if (Capacitor.isNativePlatform()) setLoadingRecommendations(false);
      return;
    }

    const controller = new AbortController();
    setLoadingRecommendations(true);
    setRecommendationsUnavailable(false);
    setRecommendationsExhausted(false);

    fetchWinesByAttributes(activeProfile, {
      affinityCalibrationConfidence: learningInfo?.confidence ?? 0,
      signal: controller.signal,
    })
      .then((wines) => {
        if (controller.signal.aborted) return;
        const selection = selectUnseenWineRecommendations(wines, savedWines);
        setRecommendations(selection.recommendations);
        setRecommendationsExhausted(selection.exhausted);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Error loading personalized home recommendations:', error);
        setRecommendations([]);
        setRecommendationsUnavailable(true);
        setRecommendationsExhausted(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRecommendations(false);
      });

    return () => controller.abort();
  }, [activeProfile, learningInfo?.confidence, loadingHomeProfile, savedWineOwnerId, savedWines, user?.id]);

  const homeMatchrimCode = useMemo(
    () => codeProfile ? generateMatchrimCode(codeProfile) : '',
    [codeProfile],
  );

  return (
    <NativeAppHome
      onboardingReady={!authLoading && savedWineOwnerId === (user?.id ?? 'anonymous')}
      hasSavedWines={savedWineOwnerId === user?.id && savedWines.length > 0}
      hasQuizResults={Capacitor.isNativePlatform() && (authLoading || loadingHomeProfile
        || savedWineOwnerId !== (user?.id ?? 'anonymous')) ? false : hasQuizResults}
      matchrimCode={Capacitor.isNativePlatform() && (authLoading || loadingHomeProfile
        || savedWineOwnerId !== (user?.id ?? 'anonymous')) ? '' : homeMatchrimCode}
      loadingCode={Capacitor.isNativePlatform() ? authLoading || loadingHomeProfile
        || savedWineOwnerId !== (user?.id ?? 'anonymous') : loadingHomeProfile}
      learningInfo={Capacitor.isNativePlatform() && (authLoading || loadingHomeProfile
        || savedWineOwnerId !== (user?.id ?? 'anonymous')) ? null : learningInfo}
      nativeHomeReadError={Capacitor.isNativePlatform() ? nativeHomeReadError : null}
      onRetryNativeHome={() => setNativeHomeRetry(value => value + 1)}
      activeProfile={Capacitor.isNativePlatform() && !authLoading && !loadingHomeProfile
        && savedWineOwnerId === (user?.id ?? 'anonymous') ? activeProfile : null}
      recommendations={Capacitor.isNativePlatform() && (authLoading || loadingHomeProfile
        || savedWineOwnerId !== (user?.id ?? 'anonymous')) ? [] : recommendations}
      loadingRecommendations={loadingRecommendations}
      recommendationsUnavailable={recommendationsUnavailable}
      recommendationsExhausted={recommendationsExhausted}
    />
  );
};

export default Index;
