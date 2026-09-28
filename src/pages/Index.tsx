import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NativeAppHome from '@/components/NativeAppHome';
import { useAuth } from '@/contexts/AuthContext';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import { readMatchrimLocalProfile } from '@/utils/matchrimLocalProfile';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
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

  useEffect(() => {
    let cancelled = false;

    const checkQuizResults = async () => {
      const localProfile = readMatchrimLocalProfile();

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

      const [{ data, error }, { data: userWines, error: userWinesError }] = await Promise.all([
        supabase
          .from('quiz_results')
          .select('potente, acidez, dulce, tanico, afrutado')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_wines')
          .select('name, producer, vintage, rating, sensory_attributes, use_for_profile_training')
          .eq('user_id', user.id),
      ]);

      if (cancelled) return;

      if (error) {
        console.error('Error checking Matchrim code for home:', error);
      }

      if (userWinesError) {
        console.error('Error loading Matchrim learning for home:', userWinesError);
      }

      if (data) {
        const wines = (userWines || []) as HomeUserWine[];
        const trainingWines = wines.filter((wine) => (
          wine.use_for_profile_training !== false && Boolean(wine.rating) && Boolean(wine.sensory_attributes)
        ));
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
        try {
          localStorage.setItem('matchrim_quiz_result', JSON.stringify(data));
        } catch {
          // Local cache is only used to make the next decision screen immediate.
        }
      } else {
        setCodeProfile(localProfile);
        setActiveProfile(localProfile);
        setLearningInfo(null);
        setSavedWines([]);
        setSavedWineOwnerId(user.id);
        setHasQuizResults(Boolean(localProfile));
      }

      setLoadingHomeProfile(false);
    };

    checkQuizResults();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    const expectedOwnerId = user?.id || 'anonymous';
    if (!activeProfile || loadingHomeProfile || savedWineOwnerId !== expectedOwnerId) {
      setRecommendations([]);
      setRecommendationsExhausted(false);
      return;
    }

    const controller = new AbortController();
    setLoadingRecommendations(true);
    setRecommendationsUnavailable(false);
    setRecommendationsExhausted(false);

    fetchWinesByAttributes(activeProfile, { signal: controller.signal })
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
  }, [activeProfile, loadingHomeProfile, savedWineOwnerId, savedWines, user?.id]);

  const homeMatchrimCode = useMemo(
    () => codeProfile ? generateMatchrimCode(codeProfile) : '',
    [codeProfile],
  );

  return (
    <NativeAppHome
      hasQuizResults={hasQuizResults}
      matchrimCode={homeMatchrimCode}
      loadingCode={loadingHomeProfile}
      learningInfo={learningInfo}
      recommendations={recommendations}
      loadingRecommendations={loadingRecommendations}
      recommendationsUnavailable={recommendationsUnavailable}
      recommendationsExhausted={recommendationsExhausted}
    />
  );
};

export default Index;
