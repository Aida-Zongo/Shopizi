const { query } = require('../db/pool');
const { sendEmail } = require('../services/email/email.service');
const logger = require('../config/logger');
const config = require('../config/index');

/**
 * Send reminder emails to users whose subscription expires in 3 days.
 */
async function runRenewalReminders() {
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const startOfDay = new Date(soon.getFullYear(), soon.getMonth(), soon.getDate());
  const endOfDay = new Date(soon.getFullYear(), soon.getMonth(), soon.getDate() + 1);

  const result = await query(
    `SELECT sub.id, sub.user_id, sub.ends_at, u.email, u.full_name, p.name AS plan_name, p.slug AS plan_slug
     FROM subscriptions sub
     JOIN users u ON u.id = sub.user_id
     JOIN plans p ON p.id = sub.plan_id
     WHERE sub.status IN ('trial','active','past_due')
       AND sub.ends_at >= $1 AND sub.ends_at < $2
       AND sub.auto_renew = true
       AND (sub.renewal_reminder_sent_at IS NULL OR sub.renewal_reminder_sent_at < NOW() - INTERVAL '24 hours')`,
    [startOfDay, endOfDay]
  );

  for (const sub of result.rows) {
    try {
      await sendEmail({
        toEmail: sub.email,
        toName: sub.full_name,
        templateSlug: 'renewal_reminder', vary: 'user',
        variables: {
          userId: sub.user_id,
          planName: sub.plan_name,
          daysLeft: 3,
          renewUrl: `${config.frontend.url}/subscription/renew`,
          endsAt: sub.ends_at.toLocaleDateString('fr-FR'),
        },
      });
      await query("UPDATE subscriptions SET renewal_reminder_sent_at = NOW() WHERE id = $1", [sub.id]);
      logger.info(`Renewal reminder sent to ${sub.email}`);
    } catch (err) {
      logger.error(`Failed to send reminder to ${sub.email}:`, err);
    }
  }
}

module.exports = { runRenewalReminders };
