/**
 * Shopizi subscription plans definition.
 * Prices in XOF (Franc CFA - West African CFA franc).
 */

const PLANS = {
  FREE: {
    slug: 'free',
    name: 'Gratuit',
    description: 'Pour démarrer et tester la plateforme',
    priceMonthlyXof: 0,
    priceYearlyXof: 0,
    maxProducts: 15,
    maxImagesPerProduct: 3,
    maxVariantsPerProduct: 0,
    maxCategories: 5,
    storageMb: 50,
    customDomain: false,
    analytics: false,
    customColors: false,
    removeBranding: false,
    prioritySupport: false,
    trialDays: 0,
    sortOrder: 1,
  },

  PRO: {
    slug: 'pro',
    name: 'Pro',
    description: 'Pour les commerçants sérieux qui veulent développer leur activité',
    priceMonthlyXof: 7500,
    priceYearlyXof: 75000, // 2 months free
    maxProducts: 100,
    maxImagesPerProduct: 8,
    maxVariantsPerProduct: 6,
    maxCategories: 20,
    storageMb: 500,
    customDomain: false,
    analytics: true,
    customColors: true,
    removeBranding: false,
    prioritySupport: false,
    trialDays: 14,
    sortOrder: 2,
  },

  BUSINESS: {
    slug: 'business',
    name: 'Business',
    description: 'Pour les entreprises établies avec des besoins avancés',
    priceMonthlyXof: 20000,
    priceYearlyXof: 200000, // 2 months free
    maxProducts: 500,
    maxImagesPerProduct: 20,
    maxVariantsPerProduct: 50,
    maxCategories: 100,
    storageMb: 5000,
    customDomain: true,
    analytics: true,
    customColors: true,
    removeBranding: true,
    prioritySupport: true,
    trialDays: 14,
    sortOrder: 3,
  },
};

/**
 * Get plan by slug
 * @param {string} slug - Plan slug (free, pro, business)
 * @returns {Object|null} Plan definition
 */
function getPlanBySlug(slug) {
  const plans = Object.values(PLANS);
  return plans.find(p => p.slug === slug) || null;
}

/**
 * Check if a feature is available for a given plan
 * @param {string} planSlug - Plan slug
 * @param {string} feature - Feature name (e.g., 'analytics', 'customDomain')
 * @returns {boolean}
 */
function planHasFeature(planSlug, feature) {
  const plan = getPlanBySlug(planSlug);
  if (!plan) return false;
  return plan[feature] === true;
}

/**
 * Get limit for a given plan feature
 * @param {string} planSlug - Plan slug
 * @param {string} limitKey - Limit key (e.g., 'maxProducts', 'storageMb')
 * @returns {number} Limit value or Infinity if not found
 */
function getPlanLimit(planSlug, limitKey) {
  const plan = getPlanBySlug(planSlug);
  if (!plan) return 0;
  return plan[limitKey] !== undefined ? plan[limitKey] : Infinity;
}

module.exports = { PLANS, getPlanBySlug, planHasFeature, getPlanLimit };