/**
 * brevoAnalyticsService.js
 * Fetches real email delivery stats from Brevo (Sendinblue) API
 * Includes caching to stay within Brevo's API rate limits
 *
 * Brevo API docs: https://developers.brevo.com/reference
 * Rate limit: 100 requests/minute on free plan
 */

const axios        = require('axios');
const { cache, TTL } = require('./cacheService');
const Customer     = require('../models/Customer');
const Campaign     = require('../models/Campaign');
const CampaignLog  = require('../models/CampaignLog');

// ─── Brevo API client ─────────────────────────────────────────
const brevoApi = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key':      process.env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  timeout: 15000,
});

// ─── Stat types Brevo supports ────────────────────────────────
const BREVO_EVENTS = [
  'requests',
  'delivered',
  'hardBounces',
  'softBounces',
  'clicks',
  'uniqueClicks',
  'opens',
  'uniqueOpens',
  'unsubscriptions',
  'spamReports',
  'blocked',
  'invalid',
];

// ═══════════════════════════════════════════════════════════════
// Get aggregate stats for a campaign from Brevo
// Uses campaign tag stored when sending
// ═══════════════════════════════════════════════════════════════
async function getCampaignBrevoStats(campaignId) {
  const cacheKey = `brevo:campaign:${campaignId}`;

  const { data, fromCache } = await cache.getOrFetch(
    cacheKey,
    async () => {
      try {
        // Brevo transactional email stats — filter by tag = campaignId
        // We tag every email with the campaignId when sending
        const [statsRes, emailsRes] = await Promise.allSettled([
          // Get aggregated stats by tag
          brevoApi.get('/smtp/statistics/aggregatedReport', {
            params: {
              startDate: getStartDate(campaignId),
              endDate:   getTodayDate(),
              tag:       campaignId,
            },
          }),
          // Get individual email events
          brevoApi.get('/smtp/statistics/events', {
            params: {
              limit: 100,
              tag:   campaignId,
            },
          }),
        ]);

        const stats  = statsRes.status  === 'fulfilled' ? statsRes.value.data  : null;
        const events = emailsRes.status === 'fulfilled' ? emailsRes.value.data : null;

        return {
          aggregated: stats  || getEmptyStats(),
          events:     events?.events || [],
          source:     'brevo_api',
          fetchedAt:  new Date().toISOString(),
        };
      } catch (err) {
        console.error(`[Brevo] Stats fetch error for ${campaignId}:`, err.message);
        // Fall back to DB stats on API error
        return await getStatsFromDB(campaignId);
      }
    },
    TTL.BREVO_STATS
  );

  return { ...data, fromCache };
}

// ═══════════════════════════════════════════════════════════════
// Get per-email stats for individual customers in a campaign
// Fetches from Brevo by email address
// ═══════════════════════════════════════════════════════════════
async function getCustomerEmailStats(campaignId, page = 1, limit = 20) {
  const cacheKey = `brevo:customers:${campaignId}:${page}`;

  const { data, fromCache } = await cache.getOrFetch(
    cacheKey,
    async () => {
      // Get customers from DB
      const skip      = (page - 1) * limit;
      const customers = await Customer.find({ campaignId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Customer.countDocuments({ campaignId, isDeleted: false });

      // For each customer fetch their Brevo message history
      const enriched = await Promise.all(
        customers.map(async (customer) => {
          if (!customer.email || customer.status === 'pending') {
            return { ...customer, brevoStats: null };
          }

          const brevoStats = await getEmailStatsForAddress(
            customer.email,
            campaignId
          );

          return { ...customer, brevoStats };
        })
      );

      return {
        customers: enriched,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    TTL.CUSTOMER_LIST
  );

  return { ...data, fromCache };
}

// ═══════════════════════════════════════════════════════════════
// Get Brevo stats for a single email address + campaign tag
// ═══════════════════════════════════════════════════════════════
async function getEmailStatsForAddress(email, campaignId) {
  const cacheKey = `brevo:email:${email}:${campaignId}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await brevoApi.get('/smtp/statistics/events', {
      params: {
        email,
        tag:   campaignId,
        limit: 20,
      },
    });

    const events = res.data?.events || [];

    // Build stat summary from events
    const stats = {
      delivered:      events.some((e) => e.event === 'delivered'),
      opened:         events.some((e) => e.event === 'opened'),
      clicked:        events.some((e) => e.event === 'clicks'),
      bounced:        events.some((e) => ['hardBounces', 'softBounces'].includes(e.event)),
      bounceType:     events.find((e) => e.event === 'hardBounces') ? 'hard'
                    : events.find((e) => e.event === 'softBounces') ? 'soft'
                    : null,
      unsubscribed:   events.some((e) => e.event === 'unsubscribed'),
      spamReported:   events.some((e) => e.event === 'spam'),
      lastEventAt:    events[0]?.date || null,
      events:         events.slice(0, 5), // last 5 events
    };

    cache.set(cacheKey, stats, TTL.BREVO_STATS);
    return stats;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Get dashboard overview — all campaigns summary
// ═══════════════════════════════════════════════════════════════
async function getDashboardOverview(userId) {
  const cacheKey = `brevo:dashboard:${userId}`;

  const { data, fromCache } = await cache.getOrFetch(
    cacheKey,
    async () => {
      // Get all campaigns for user
      const campaigns = await Campaign.find({
        userId,
        isDeleted: false,
        status: { $nin: ['draft'] },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (campaigns.length === 0) {
        return {
          totalSent:         0,
          totalDelivered:    0,
          totalOpened:       0,
          totalClicked:      0,
          totalBounced:      0,
          totalUnsubscribed: 0,
          avgOpenRate:       0,
          avgClickRate:      0,
          avgDeliveryRate:   0,
          campaigns:         [],
        };
      }

      // Try Brevo global stats first
      try {
        const res = await brevoApi.get('/smtp/statistics/aggregatedReport', {
          params: {
            startDate: getDateDaysAgo(90),
            endDate:   getTodayDate(),
          },
        });

        const s = res.data;
        const delivered = s.delivered || 0;

        return {
          totalSent:         s.requests          || 0,
          totalDelivered:    delivered,
          totalOpened:       s.uniqueOpens        || 0,
          totalClicked:      s.uniqueClicks       || 0,
          totalBounced:      (s.hardBounces || 0) + (s.softBounces || 0),
          totalUnsubscribed: s.unsubscriptions    || 0,
          totalSpam:         s.spamReports        || 0,
          avgOpenRate:       delivered > 0 ? Math.round(((s.uniqueOpens || 0) / delivered) * 100)  : 0,
          avgClickRate:      delivered > 0 ? Math.round(((s.uniqueClicks || 0) / delivered) * 100) : 0,
          avgDeliveryRate:   s.requests > 0 ? Math.round((delivered / s.requests) * 100)           : 0,
          campaigns:         campaigns.slice(0, 5),
          source:            'brevo_api',
        };
      } catch {
        // Fall back to DB aggregation
        return await getDashboardFromDB(userId, campaigns);
      }
    },
    TTL.DASHBOARD_STATS
  );

  return { ...data, fromCache };
}

// ═══════════════════════════════════════════════════════════════
// Get daily sending stats for chart (last N days)
// ═══════════════════════════════════════════════════════════════
async function getDailyBrevoStats(userId, days = 30) {
  const cacheKey = `brevo:daily:${userId}:${days}`;

  const { data, fromCache } = await cache.getOrFetch(
    cacheKey,
    async () => {
      try {
        const res = await brevoApi.get('/smtp/statistics/events', {
          params: {
            startDate: getDateDaysAgo(days),
            endDate:   getTodayDate(),
            limit:     500,
          },
        });

        const events = res.data?.events || [];

        // Group by date
        const byDate = {};
        events.forEach((ev) => {
          const date = ev.date?.slice(0, 10);
          if (!date) return;
          if (!byDate[date]) {
            byDate[date] = {
              date,
              sent:         0,
              delivered:    0,
              opened:       0,
              clicked:      0,
              bounced:      0,
              unsubscribed: 0,
            };
          }
          const d = byDate[date];
          if (ev.event === 'requests')           d.sent++;
          if (ev.event === 'delivered')          d.delivered++;
          if (ev.event === 'opened')             d.opened++;
          if (ev.event === 'clicks')             d.clicked++;
          if (['hardBounces', 'softBounces'].includes(ev.event)) d.bounced++;
          if (ev.event === 'unsubscribed')       d.unsubscribed++;
        });

        // Fill missing dates with zeros
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = getDateDaysAgo(i);
          result.push(byDate[date] || {
            date,
            sent: 0, delivered: 0, opened: 0,
            clicked: 0, bounced: 0, unsubscribed: 0,
          });
        }

        return result;
      } catch {
        return await getDailyStatsFromDB(userId, days);
      }
    },
    TTL.BREVO_STATS
  );

  return { data, fromCache };
}

// ═══════════════════════════════════════════════════════════════
// Get today's Brevo quota usage
// ═══════════════════════════════════════════════════════════════
async function getTodayQuota() {
  const cacheKey = 'brevo:quota:today';

  const { data, fromCache } = await cache.getOrFetch(
    cacheKey,
    async () => {
      try {
        const res = await brevoApi.get('/account');
        const plan = res.data?.plan || [];

        // Find email plan credits
        const emailPlan = plan.find((p) =>
          p.type === 'payAsYouGo' || p.type === 'unlimited' || p.feature === 'emails'
        );

        return {
          dailyLimit:   parseInt(process.env.BREVO_DAILY_LIMIT || '300', 10),
          creditsLeft:  emailPlan?.credits || null,
          planType:     emailPlan?.type    || 'free',
        };
      } catch {
        return {
          dailyLimit:  parseInt(process.env.BREVO_DAILY_LIMIT || '300', 10),
          creditsLeft: null,
          planType:    'free',
        };
      }
    },
    60  // 60 second cache for quota
  );

  return { ...data, fromCache };
}

// ─── DB Fallbacks ─────────────────────────────────────────────

async function getStatsFromDB(campaignId) {
  const stats = await Customer.getStatsForCampaign(campaignId);
  const logs  = await CampaignLog.getEventSummary(campaignId);

  return {
    aggregated: {
      requests:        stats.total      || 0,
      delivered:       stats.delivered  || 0,
      uniqueOpens:     stats.opened     || 0,
      uniqueClicks:    stats.clicked    || 0,
      hardBounces:     stats.bounced    || 0,
      softBounces:     0,
      unsubscriptions: 0,
      spamReports:     0,
    },
    events:  [],
    source:  'database',
    fetchedAt: new Date().toISOString(),
  };
}

async function getDashboardFromDB(userId, campaigns) {
  const result = await Customer.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id:           null,
        totalSent:     { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] } },
        totalDelivered:{ $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        totalOpened:   { $sum: { $cond: ['$emailOpened', 1, 0] } },
        totalClicked:  { $sum: { $cond: ['$linkClicked', 1, 0] } },
        totalBounced:  { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
      },
    },
  ]);

  const s = result[0] || {};
  const delivered = s.totalDelivered || 0;

  return {
    totalSent:         s.totalSent      || 0,
    totalDelivered:    delivered,
    totalOpened:       s.totalOpened    || 0,
    totalClicked:      s.totalClicked   || 0,
    totalBounced:      s.totalBounced   || 0,
    totalUnsubscribed: 0,
    avgOpenRate:       delivered > 0 ? Math.round(((s.totalOpened || 0) / delivered) * 100) : 0,
    avgClickRate:      delivered > 0 ? Math.round(((s.totalClicked || 0) / delivered) * 100) : 0,
    avgDeliveryRate:   s.totalSent > 0 ? Math.round((delivered / s.totalSent) * 100) : 0,
    campaigns:         campaigns.slice(0, 5),
    source:            'database',
  };
}

async function getDailyStatsFromDB(userId, days) {
  const result = await CampaignLog.getDailyStats(null, days);
  return result;
}

// ─── Date helpers ──────────────────────────────────────────────
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function getStartDate(campaignId) {
  // Default: last 90 days
  return getDateDaysAgo(90);
}

function getEmptyStats() {
  return {
    requests: 0, delivered: 0, uniqueOpens: 0,
    uniqueClicks: 0, hardBounces: 0, softBounces: 0,
    unsubscriptions: 0, spamReports: 0,
  };
}

// ─── Invalidate cache for a campaign ─────────────────────────
function invalidateCampaignCache(campaignId) {
  cache.delByPrefix(`brevo:campaign:${campaignId}`);
  cache.delByPrefix(`brevo:customers:${campaignId}`);
  console.log(`[Cache] Invalidated cache for campaign ${campaignId}`);
}

module.exports = {
  getCampaignBrevoStats,
  getCustomerEmailStats,
  getEmailStatsForAddress,
  getDashboardOverview,
  getDailyBrevoStats,
  getTodayQuota,
  invalidateCampaignCache,
};