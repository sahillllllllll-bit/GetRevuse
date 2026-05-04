const { nanoid } = require('nanoid');
const FeedbackPage = require('../models/FeedbackPage');

/**
 * Convert a string to a URL-safe slug
 * e.g. "Sunshine Café & Bakery!" → "sunshine-cafe-bakery"
 */
function toSlugBase(text) {
  return text
    .toLowerCase()
    .normalize('NFD')                        // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')         // strip accent marks
    .replace(/[^a-z0-9\s-]/g, '')           // remove special chars
    .trim()
    .replace(/[\s-]+/g, '-')                 // spaces → hyphens
    .replace(/^-+|-+$/g, '')                 // trim leading/trailing hyphens
    .slice(0, 35);                           // max 35 chars for base
}

/**
 * Generate a unique slug for a feedback page.
 * Format: "<business-name-slug>-<6-char-nanoid>"
 * e.g. "sunshine-cafe-ab12cd"
 *
 * Retries up to 5 times if collision detected (extremely unlikely with nanoid).
 *
 * @param {string} businessName
 * @returns {Promise<string>} unique slug
 */
async function generateUniqueSlug(businessName) {
  const base = toSlugBase(businessName) || 'business';

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${nanoid(6)}`;

    // Check for collision
    const existing = await FeedbackPage.findOne({ slug }).lean();
    if (!existing) return slug;

    // If collision (astronomically rare), loop and try again
    console.warn(`[slugService] Slug collision on attempt ${attempt + 1}: ${slug}`);
  }

  // Final fallback: full nanoid
  return `page-${nanoid(12)}`;
}

/**
 * Check if a slug is available (not taken)
 * @param {string} slug
 * @returns {Promise<boolean>}
 */
async function isSlugAvailable(slug) {
  const existing = await FeedbackPage.findOne({ slug }).lean();
  return !existing;
}

/**
 * Regenerate slug for an existing feedback page
 * (useful if business name changes)
 *
 * @param {string} feedbackPageId  - MongoDB _id
 * @param {string} newBusinessName
 * @returns {Promise<string>} new slug
 */
async function regenerateSlug(feedbackPageId, newBusinessName) {
  const slug = await generateUniqueSlug(newBusinessName);
  await FeedbackPage.findByIdAndUpdate(feedbackPageId, { slug });
  return slug;
}

module.exports = {
  toSlugBase,
  generateUniqueSlug,
  isSlugAvailable,
  regenerateSlug,
};