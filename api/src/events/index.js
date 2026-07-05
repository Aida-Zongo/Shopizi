const EventEmitter = require('events');

/**
 * Central event bus for cross-module communication.
 *
 * Events emitted:
 *   - 'user:registered'          { userId, email, fullName }
 *   - 'shop:created'             { shopId, userId, subdomain }
 *   - 'shop:updated'             { shopId, userId, changedFields }
 *   - 'shop:published'           { shopId }
 *   - 'product:created'          { shopId, productId }
 *   - 'product:updated'          { shopId, productId }
 *   - 'product:deleted'          { shopId, productId }
 *   - 'product:image:added'      { shopId, productId }
 *   - 'payment:completed'        { userId, payment, subscription }
 *   - 'payment:failed'           { userId, payment, reason }
 *   - 'subscription:activated'   { userId, planSlug }
 *   - 'subscription:expired'     { userId, oldPlanSlug }
 *   - 'subscription:expiring'    { userId, planSlug, daysLeft }
 *   - 'subscription:cancelled'   { userId }
 *   - 'order:created'            { shopId, orderId }
 *   - 'order:status_changed'     { shopId, orderId, oldStatus, newStatus }
 *   - 'site:generate'            { shopId, trigger }
 */
const eventBus = new EventEmitter();

// Increase max listeners to avoid warnings
eventBus.setMaxListeners(50);

module.exports = eventBus;