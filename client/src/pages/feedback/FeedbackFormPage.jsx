import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Star, Send, AlertCircle } from 'lucide-react';

// ✅ MOVE FIELD OUTSIDE TO PREVENT RE-CREATION ON EVERY RENDER
const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

export default function FeedbackFormPage() {
  const { slug }    = useParams();
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const cid         = params.get('cid');
  const stars       = parseInt(params.get('stars') || '0', 10);
  const API         = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [page,       setPage]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});
  const [fields,     setFields]     = useState({ name: '', email: '', phone: '', message: '', order: '' });

  useEffect(() => {
    fetch(`${API}/api/f/${slug}${cid ? `?cid=${cid}` : ''}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPage(d.page); })
      .finally(() => setLoading(false));
  }, [slug, cid, API]);

  // ✅ MOVE CALLBACKS BEFORE EARLY RETURN TO FIX HOOK ORDER
  const handleFieldChange = useCallback((fieldName, value) => {
    setFields(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const inputCls = useCallback((err) =>
    `w-full px-3.5 py-2.5 rounded-xl text-sm border bg-gray-50 dark:bg-gray-800
     text-gray-800 dark:text-gray-200 placeholder-gray-400
     focus:outline-none focus:ring-2 focus:border-transparent transition
     ${err ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'}`,
    []
  );

  const validate = () => {
    const e = {};
    if (!fields.name.trim())    e.name    = 'Your name is required';
    if (!fields.message.trim()) e.message = 'Please share your feedback';
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
      e.email = 'Invalid email address';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/api/f/${slug}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cid, starRating: stars, fields }),
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/f/${slug}/thankyou?type=negative`);
      } else {
        setErrors({ _form: data.message || 'Something went wrong' });
      }
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const primary    = page?.primaryColor || '#2563eb';
  const activeFields = page?.feedbackFields || ['name', 'email', 'message'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Color bar */}
          <div className="h-2" style={{ background: primary }} />

          <div className="px-6 sm:px-8 py-8 flex flex-col gap-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{page?.businessName}</h1>

              {/* Stars display */}
              <div className="flex items-center justify-center gap-1 mt-3">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={18}
                    className={s <= stars
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700'}
                  />
                ))}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed px-2">
                {page?.feedbackNote}
              </p>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">
              {activeFields.includes('name') && (
                <Field label="Your Name" required error={errors.name}>
                  <input value={fields.name} onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="John Doe" className={inputCls(errors.name)} />
                </Field>
              )}

              {activeFields.includes('email') && (
                <Field label="Email Address" error={errors.email}>
                  <input type="email" value={fields.email} onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="john@email.com" className={inputCls(errors.email)} />
                </Field>
              )}

              {activeFields.includes('phone') && (
                <Field label="Phone Number">
                  <input type="tel" value={fields.phone} onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="+1 234 567 8900" className={inputCls(false)} />
                </Field>
              )}

              {activeFields.includes('order') && (
                <Field label="Order / Reference #">
                  <input value={fields.order} onChange={(e) => handleFieldChange('order', e.target.value)}
                    placeholder="ORD-12345" className={inputCls(false)} />
                </Field>
              )}

              {activeFields.includes('message') && (
                <Field label="Your Feedback" required error={errors.message}>
                  <textarea value={fields.message} onChange={(e) => handleFieldChange('message', e.target.value)}
                    rows={4} placeholder="Tell us what happened and how we can improve..."
                    className={`${inputCls(errors.message)} resize-none`} />
                </Field>
              )}
            </div>

            {errors._form && (
              <p className="text-sm text-red-500 text-center">{errors._form}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                text-white font-bold text-sm transition disabled:opacity-60"
              style={{ background: primary }}
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                : <><Send size={16} /> Submit Feedback</>
              }
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Powered by GetRevUse</p>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}