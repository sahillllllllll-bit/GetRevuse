import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

export default function RatingPage() {
  const { slug }          = useParams();
  const [params]          = useSearchParams();
  const navigate          = useNavigate();
  const cid               = params.get('cid');

  const [page,       setPage]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [hovered,    setHovered]    = useState(0);
  const [selected,   setSelected]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API}/api/f/${slug}${cid ? `?cid=${cid}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPage(d.page);
        else setError('This page is no longer available.');
      })
      .catch(() => setError('Could not load this page.'))
      .finally(() => setLoading(false));
  }, [slug, cid, API]);

  const handleRate = async (stars) => {
    if (submitting) return;
    setSelected(stars);
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/f/${slug}/rate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send stars (required) and cid if available
        body: JSON.stringify({
          ...(cid && { cid }),
          stars: Number(stars),
        }),
      });

      const data = await res.json();

      console.log('[RatingPage] Rate response:', data);

      if (!res.ok || (!data.destination && !data.success)) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
        setSelected(0);
        return;
      }

      // ── Positive: go to review link ───────────────────────
      if (data.destination === 'review_link') {
        navigate(`/f/${slug}/thankyou?type=positive&cid=${cid || ''}`);
        if (data.reviewLink) {
          setTimeout(() => {
            window.location.href = data.reviewLink;
          }, 2500);
        }
        return;
      }

      // ── Negative: go to feedback form ─────────────────────
      if (data.destination === 'feedback_form') {
        if (data.feedbackFormEnabled === false) {
          navigate(`/f/${slug}/thankyou?type=negative&cid=${cid || ''}`);
        } else {
          navigate(`/f/${slug}/feedback?cid=${cid || ''}&stars=${stars}`);
        }
        return;
      }

      // ── Fallback: use local threshold from page data ───────
      // Safety net in case API response is unexpected
      const threshold = page?.threshold ?? 4;
      if (Number(stars) >= Number(threshold)) {
        navigate(`/f/${slug}/thankyou?type=positive&cid=${cid || ''}`);
        if (page?.reviewLink) {
          setTimeout(() => { window.location.href = page.reviewLink; }, 2500);
        }
      } else {
        navigate(`/f/${slug}/feedback?cid=${cid || ''}&stars=${stars}`);
      }

    } catch (err) {
      console.error('[RatingPage] Error:', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      setSelected(0);
    }
  };

  if (loading) return <FullPageLoader />;
  if (error && !page) return <ErrorPage message={error} />;

  const primary = page?.primaryColor || '#2563eb';
  const active  = hovered || selected;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Color bar */}
          <div className="h-2" style={{ background: primary }} />

          <div className="px-8 py-8 flex flex-col items-center gap-6">

            {/* Business name */}
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto text-2xl"
                style={{ background: `${primary}18` }}
              >
                ⭐
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {page?.businessName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                How would you rate your experience?
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  disabled={submitting}
                  onClick={() => handleRate(s)}
                  onMouseEnter={() => !submitting && setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 active:scale-95 disabled:cursor-wait"
                >
                  <Star
                    size={44}
                    className={`transition-colors duration-150 ${
                      s <= active
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600 fill-gray-200 dark:fill-gray-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 h-5 text-center">
              {active === 1 && '😞 Very Poor'}
              {active === 2 && '😕 Poor'}
              {active === 3 && '😐 Average'}
              {active === 4 && '😊 Good'}
              {active === 5 && '🤩 Excellent!'}
            </p>

            {/* Threshold hint */}
            {page?.threshold && !submitting && active === 0 && (
              <p className="text-xs text-gray-400 text-center">
                Tap a star to rate your experience
              </p>
            )}

            {/* Submitting */}
            {submitting && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by GetRevUse
        </p>
      </div>
    </div>
  );
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorPage({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="text-center">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Page Not Found</h2>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
      </div>
    </div>
  );
}