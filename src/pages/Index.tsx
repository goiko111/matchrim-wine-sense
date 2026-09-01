import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NativeAppHome from '@/components/NativeAppHome';
import { useAuth } from '@/contexts/AuthContext';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import { readMatchrimLocalProfile } from '@/utils/matchrimLocalProfile';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [homeProfile, setHomeProfile] = useState<MatchrimProfileLike | null>(() => readMatchrimLocalProfile());
  const [hasQuizResults, setHasQuizResults] = useState(() => Boolean(readMatchrimLocalProfile()));
  const [loadingHomeProfile, setLoadingHomeProfile] = useState(() => !readMatchrimLocalProfile());

  useEffect(() => {
    let cancelled = false;

    const checkQuizResults = async () => {
      const localProfile = readMatchrimLocalProfile();

      if (localProfile) {
        setHomeProfile(localProfile);
        setHasQuizResults(true);
        setLoadingHomeProfile(false);
      }

      if (authLoading) {
        setLoadingHomeProfile(!localProfile);
        return;
      }

      if (!user) {
        setHomeProfile(localProfile);
        setHasQuizResults(Boolean(localProfile));
        setLoadingHomeProfile(false);
        return;
      }

      if (!localProfile) setLoadingHomeProfile(true);

      const { data, error } = await supabase
        .from('quiz_results')
        .select('potente, acidez, dulce, tanico, afrutado')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error checking Matchrim code for home:', error);
      }

      if (data) {
        setHomeProfile(data);
        setHasQuizResults(true);
        try {
          localStorage.setItem('matchrim_quiz_result', JSON.stringify(data));
        } catch {
          // Local cache is only used to make the next decision screen immediate.
        }
      } else {
        setHomeProfile(localProfile);
        setHasQuizResults(Boolean(localProfile));
      }

      setLoadingHomeProfile(false);
    };

    checkQuizResults();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const homeMatchrimCode = useMemo(
    () => homeProfile ? generateMatchrimCode(homeProfile) : '',
    [homeProfile],
  );

  return (
    <NativeAppHome
      hasQuizResults={hasQuizResults}
      matchrimCode={homeMatchrimCode}
      loadingCode={loadingHomeProfile}
    />
  );
};

export default Index;
