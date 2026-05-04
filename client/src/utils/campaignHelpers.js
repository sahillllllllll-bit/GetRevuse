// ─── Review Platforms ────────────────────────────────────────────────────────
export const REVIEW_PLATFORMS = [
  { value: "google",       label: "Google Reviews",     flag: "🇺🇸", placeholder: "https://g.page/r/CxxxxXXXX/review" },
  { value: "yelp",         label: "Yelp",               flag: "🇺🇸", placeholder: "https://www.yelp.com/biz/your-business" },
  { value: "trustpilot",   label: "Trustpilot",         flag: "🇪🇺", placeholder: "https://www.trustpilot.com/review/yourdomain.com" },
  { value: "tripadvisor",  label: "TripAdvisor",        flag: "🌍",  placeholder: "https://www.tripadvisor.com/Restaurant_Review-..." },
  { value: "facebook",     label: "Facebook Reviews",   flag: "🌍",  placeholder: "https://www.facebook.com/yourpage/reviews" },
  { value: "g2",           label: "G2",                 flag: "🇺🇸", placeholder: "https://www.g2.com/products/your-product/reviews" },
  { value: "capterra",     label: "Capterra",           flag: "🇺🇸", placeholder: "https://www.capterra.com/p/your-product/reviews" },
  { value: "booking",      label: "Booking.com",        flag: "🇪🇺", placeholder: "https://www.booking.com/hotel/xx/your-hotel.html" },
  { value: "glassdoor",    label: "Glassdoor",          flag: "🌍",  placeholder: "https://www.glassdoor.com/Reviews/your-company.htm" },
  { value: "amazon",       label: "Amazon Reviews",     flag: "🌍",  placeholder: "https://www.amazon.com/dp/PRODUCTID" },
  { value: "houzz",        label: "Houzz",              flag: "🇺🇸", placeholder: "https://www.houzz.com/professionals/your-profile" },
  { value: "healthgrades", label: "Healthgrades",       flag: "🇺🇸", placeholder: "https://www.healthgrades.com/physician/..." },
  { value: "custom",       label: "Custom / Other",     flag: "🔗",  placeholder: "https://your-review-page.com" },
];

// ─── Messaging Channels ──────────────────────────────────────────────────────
export const CHANNELS = [
  { value: "email", label: "Email Only",  icon: "✉️",  desc: "Best open rates, rich content", color: "blue"   },
  { value: "sms",   label: "SMS Only",    icon: "💬",  desc: "Instant, high read rate",        color: "green"  },
  { value: "both",  label: "Email + SMS", icon: "⚡",  desc: "Maximum reach",                  color: "purple" },
];

// ─── Default Email Templates ──────────────────────────────────────────────────
export const DEFAULT_EMAIL_TEMPLATES = [
  {
    id: "friendly",
    name: "Friendly & Warm",
    subject: "How was your experience with {{business_name}}?",
    body: `Hi {{customer_name}},

Thank you for choosing {{business_name}}! We hope your experience was wonderful.

We'd love to hear your thoughts — your feedback helps us grow and serve you better.

If you enjoyed your visit, would you mind taking 30 seconds to leave us a review? It means the world to us! 🌟

[Leave a Review ⭐]

If something wasn't perfect, please let us know directly — we'd love to make it right.

Warm regards,
The {{business_name}} Team`,
  },
  {
    id: "professional",
    name: "Professional",
    subject: "Share your feedback — {{business_name}}",
    body: `Dear {{customer_name}},

Thank you for your recent visit to {{business_name}}.

Your opinion matters to us. We'd appreciate if you could take a moment to share your experience.

[Submit Your Review]

For any concerns, please reply to this email directly.

Best regards,
{{business_name}}`,
  },
  {
    id: "casual",
    name: "Casual & Fun",
    subject: "Hey {{customer_name}}, how'd we do? 🙌",
    body: `Hey {{customer_name}}!

Thanks for stopping by {{business_name}} — hope it was awesome! 🎉

Quick favor: Could you drop us a review? Takes less than a minute and helps us out a ton.

[Yes, I'll leave a review! ⭐]

Not fully happy? Hit reply — we'll sort it out!

Cheers,
{{business_name}} 🚀`,
  },
];

// ─── Default SMS Templates ────────────────────────────────────────────────────
export const DEFAULT_SMS_TEMPLATES = [
  {
    id: "sms_short",
    name: "Short & Sweet",
    body: "Hi {{customer_name}}! Thanks for visiting {{business_name}} 😊 Would you mind leaving us a quick review? {{review_link}} — Reply STOP to opt out.",
  },
  {
    id: "sms_direct",
    name: "Direct Ask",
    body: "{{customer_name}}, your feedback matters! Share your {{business_name}} experience here: {{review_link}} Takes 30 sec. Reply STOP to unsubscribe.",
  },
  {
    id: "sms_emoji",
    name: "Emoji Friendly",
    body: "⭐ Hey {{customer_name}}! How was {{business_name}}? Leave a quick review 👉 {{review_link}} (Reply STOP to opt out)",
  },
];

// ─── Template Variables ───────────────────────────────────────────────────────
export const TEMPLATE_VARS = [
  { token: "{{customer_name}}",  desc: "Customer's full name" },
  { token: "{{business_name}}",  desc: "Your business name" },
  { token: "{{review_link}}",    desc: "Direct review URL" },
  { token: "{{feedback_link}}",  desc: "Internal feedback form URL" },
];

// ─── Schedule Options ─────────────────────────────────────────────────────────
export const SCHEDULE_OPTIONS = [
  { value: "now",      label: "Send Immediately",  icon: "⚡" },
  { value: "1h",       label: "In 1 Hour",         icon: "⏰" },
  { value: "3h",       label: "In 3 Hours",        icon: "⏰" },
  { value: "tomorrow", label: "Tomorrow Morning",   icon: "🌅" },
  { value: "custom",   label: "Pick Date & Time",  icon: "📅" },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────
export function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2)
    return { data: [], errors: ["CSV must have at least a header row and one data row"] };

  const headers  = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s"]/g, ""));
  const nameCol  = headers.findIndex((h) => /name/.test(h));
  const emailCol = headers.findIndex((h) => /email|mail/.test(h));
  const phoneCol = headers.findIndex((h) => /phone|mobile|contact|sms|number/.test(h));

  const data   = [];
  const errors = [];

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row  = {
      name:  nameCol  >= 0 ? cols[nameCol]  || "" : "",
      email: emailCol >= 0 ? cols[emailCol] || "" : "",
      phone: phoneCol >= 0 ? cols[phoneCol] || "" : "",
    };
    const rowErrors = validateRow(row, i + 2);
    if (rowErrors.length) errors.push(...rowErrors);
    else data.push(row);
  });

  return { data, errors };
}

// ─── Manual Row Parser ────────────────────────────────────────────────────────
export function parseManualRows(rows) {
  const data   = [];
  const errors = [];
  rows.forEach((row, i) => {
    if (!row.name && !row.email && !row.phone) return;
    const rowErrors = validateRow(row, i + 1);
    if (rowErrors.length) errors.push(...rowErrors);
    else data.push(row);
  });
  return { data, errors };
}

function validateRow(row, lineNum) {
  const errs = [];
  if (!row.name) errs.push(`Row ${lineNum}: Name is required`);
  if (!row.email && !row.phone)
    errs.push(`Row ${lineNum}: At least email or phone is required`);
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
    errs.push(`Row ${lineNum}: Invalid email "${row.email}"`);
  return errs;
}

// ─── Misc Helpers ─────────────────────────────────────────────────────────────
export function countSMSChars(text) {
  return text.replace(/\{\{[^}]+\}\}/g, "XXXXXXXXXX").length;
}

export function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}