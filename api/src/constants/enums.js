/**
 * Shared enumeration values used across the application.
 */

const SHOP_CATEGORIES = ['shop', 'restaurant', 'pharmacy', 'artisan', 'service', 'other'];

const USER_ROLES = ['merchant', 'admin'];

const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'expired', 'cancelled'];

const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];

const PAYMENT_METHODS = ['orange_money', 'moov_money', 'cinetpay'];

const ORDER_STATUSES = ['new', 'confirmed', 'processing', 'ready', 'delivered', 'completed', 'cancelled'];

const ORDER_SOURCES = ['whatsapp', 'website_form', 'manual'];

const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock', 'on_order', 'discontinued'];

const DELIVERY_METHODS = ['pickup', 'delivery'];

const GENERATION_TRIGGERS = ['manual', 'shop_update', 'product_update', 'subscription_change', 'image_update'];

const SITE_GEN_STATUSES = ['queued', 'running', 'success', 'failed'];

const EMAIL_STATUSES = ['queued', 'sending', 'sent', 'failed', 'bounced'];

const MEDIA_ENTITY_TYPES = ['shop_logo', 'shop_banner', 'product_image', 'category_image'];

/**
 * Valid state transitions for orders
 */
const ORDER_TRANSITIONS = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Valid state transitions for subscriptions
 */
const SUBSCRIPTION_TRANSITIONS = {
  trial: ['active', 'expired', 'cancelled'],
  active: ['past_due', 'expired', 'cancelled'],
  past_due: ['active', 'expired', 'cancelled'],
  expired: ['active'], // Can reactivate by paying
  cancelled: ['active'], // Can resume if within current period
};

module.exports = {
  SHOP_CATEGORIES,
  USER_ROLES,
  SUBSCRIPTION_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  ORDER_STATUSES,
  ORDER_SOURCES,
  STOCK_STATUSES,
  DELIVERY_METHODS,
  GENERATION_TRIGGERS,
  SITE_GEN_STATUSES,
  EMAIL_STATUSES,
  MEDIA_ENTITY_TYPES,
  ORDER_TRANSITIONS,
  SUBSCRIPTION_TRANSITIONS,
};