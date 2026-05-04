import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useCredits() {
  const [credits,     setCredits]     = useState(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [recentLog,   setRecentLog]   = useState([]);
  const [plan,        setPlan]        = useState('free');
  const [loading,     setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/api/user/credits');
      setCredits(data.credits);
      setCreditsUsed(data.creditsUsed);
      setRecentLog(data.recentLog || []);
      setPlan(data.plan);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  return { credits, creditsUsed, recentLog, plan, loading, refresh: fetch };
}