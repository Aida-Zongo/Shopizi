const cron = require('node-cron');
const { runRenewalReminders } = require('./renewalReminder.job');
const { runExpireSubscriptions } = require('./expireSubscriptions.job');
const { runCleanupAbandonedOrders } = require('./cleanupAbandonedOrders.job');
const logger = require('../config/logger');

/**
 * Initialize all scheduled background jobs.
 */
function initScheduler() {
  logger.info('Initializing scheduled jobs...');

  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Job] Running renewal reminders...');
    try { await runRenewalReminders(); } catch (err) { logger.error('[Job] Renewal reminder failed:', err); }
  });

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('[Job] Running subscription expiration check...');
    try { await runExpireSubscriptions(); } catch (err) { logger.error('[Job] Expiration check failed:', err); }
  });

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[Job] Running abandoned orders cleanup...');
    try { await runCleanupAbandonedOrders(); } catch (err) { logger.error('[Job] Abandoned orders cleanup failed:', err); }
  });

  logger.info('Scheduled jobs initialized.');
}

module.exports = { initScheduler };
