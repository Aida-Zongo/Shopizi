const { query } = require('../db/pool');
const eventBus = require('../events');
const logger = require('../config/logger');

/**
 * Check and expire subscriptions that have passed their end date.
 */
async function runExpireSubscriptions() {
  // Find expired subscriptions
  const expired = await query(
    `SELECT sub.id, sub.user_id, p.slug AS plan_slug, u.email, u.full_name
     FROM subscriptions sub
     JOIN users u ON u.id = sub.user_id
     JOIN plans p ON p.id = sub.plan_id
     WHERE sub.status IN ('trial','active','past_due')
       AND sub.ends_at < NOW()
       AND (sub.auto_renew = false OR (sub.auto_renew = true AND NOT EXISTS (
         SELECT 1 FROM payments WHERE subscription_id = sub.id AND status = 'completed' AND paid_at > sub.ends_at - INTERVAL '1 day'
       )))`
  );

  for (const sub of expired.rows) {
    try {
      // Downgrade to free plan
      const freePlan = await query("SELECT id FROM plans WHERE slug = 'free'");
      const freePlanId = freePlan.rows[0].id;

      await query(
        `UPDATE subscriptions SET status = 'expired' WHERE id = $1`,
        [sub.id]
      );

      // Create new free subscription
      const now = new Date();
      const endsAt = new Date(now.getFullYear() + 100, 0, 1);
      await query(
        `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
         VALUES ($1, $2, 'active', $3, $4)`,
        [sub.user_id, freePlanId, now, endsAt]
      );

      eventBus.emit('subscription:expired', { userId: sub.user_id, oldPlanSlug: sub.plan_slug });
      logger.info(`Subscription expired for user ${sub.user_id}, downgraded to free`);
    } catch (err) {
      logger.error(`Failed to expire subscription ${sub.id}:`, err);
    }
  }
}

module.exports = { runExpireSubscriptions };
