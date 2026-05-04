import { useState, useCallback, useRef } from 'react';
import api from '../utils/api';

export function useSendCampaign() {
  const [launching,  setLaunching]  = useState(false);
  const [progress,   setProgress]   = useState(null);   // { percent, counts, status }
  const [error,      setError]      = useState(null);
  const [result,     setResult]     = useState(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollStatus = useCallback((campaignId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/send/campaign/${campaignId}/status`);
        setProgress({
          percent: data.progress,
          counts:  data.counts,
          status:  data.status,
        });
        // Stop polling when done
        if (['completed', 'cancelled', 'paused'].includes(data.status)) {
          stopPolling();
        }
      } catch (_) {
        stopPolling();
      }
    }, 2500);
  }, []);

  const launch = useCallback(async (campaignId) => {
    setLaunching(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const { data } = await api.post(`/api/send/campaign/${campaignId}`);
      setResult(data);
      // Start polling for progress
      pollStatus(campaignId);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to launch campaign';
      const code = err.response?.data?.code;
      setError({ message: msg, code, details: err.response?.data });
      throw err;
    } finally {
      setLaunching(false);
    }
  }, [pollStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setLaunching(false);
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  return { launch, launching, progress, error, result, reset };
}