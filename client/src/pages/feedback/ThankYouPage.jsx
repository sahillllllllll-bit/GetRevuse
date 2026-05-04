// ════════════════════════════════════════════════════════════════
// pages/feedback/ThankYouPage.jsx
// ════════════════════════════════════════════════════════════════
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Heart } from 'lucide-react';

export function ThankYouPage() {
  const [params] = useSearchParams();
  const type     = params.get('type');
  const isPos    = type === 'positive';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 max-w-sm w-full text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5
          ${isPos ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          {isPos
            ? <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
            : <Heart        size={32} className="text-blue-600 dark:text-blue-400" />
          }
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          {isPos ? 'Thank You! 🎉' : 'We Appreciate Your Honesty'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {isPos
            ? "Thank you so much! You're being redirected to leave your review..."
            : "Thank you for your feedback. We'll be in touch soon to make things right."}
        </p>
        {isPos && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Redirecting...
          </div>
        )}
        <p className="text-xs text-gray-300 dark:text-gray-700 mt-6">Powered by GetRevUse</p>
      </div>
    </div>
  );
}