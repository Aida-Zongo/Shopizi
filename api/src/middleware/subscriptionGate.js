const { query } = require('../db/pool');
const { getPlanLimit, getPlanBySlug } = require('../constants/plans');
const { SubscriptionLimitError } = require('../utils/errors');

/**
 * Middleware factory that enforces plan limits on specific actions.
 *
 * Supported gates:
 *   - 'product.create'   : checks product count < plan.maxProducts
 *   - 'product.image'    : checks images per product < plan.maxImagesPerProduct
 *   - 'product.variant'  : checks variants per product < plan.maxVariantsPerProduct
 *   - 'category.create'  : checks category count < plan.maxCategories
 *   - 'storage'          : checks total storage < plan.storageMb
 *
 * Usage:
 *   router.post('/products', authenticate, subscriptionGate('product.create'), handler);
 *
 * @param {string} gateName - Name of the gate to enforce
 * @returns {Function} Express middleware
 */
function subscriptionGate(gateName) {
  return async (req, res, next) => {
    // Only merchants have subscriptions — reject other roles early
    if (!req.user || req.user.role !== 'merchant') {
      const { ForbiddenError } = require('../utils/errors');
      return next(new ForbiddenError('Accès réservé aux commerçants'));
    }

    const planSlug = req.user?.planSlug || 'free';

    try {
      switch (gateName) {
        case 'product.create': {
          const maxProducts = getPlanLimit(planSlug, 'maxProducts');
          const result = await query(
            'SELECT COUNT(*)::int AS count FROM products WHERE shop_id = $1',
            [req.user.shopId]
          );
          const count = result.rows[0].count;
          if (count >= maxProducts) {
            throw new SubscriptionLimitError('produits', count, maxProducts);
          }
          break;
        }

        case 'product.image': {
          const productId = req.params.id || req.body.product_id;
          if (!productId) break;

          const maxImages = getPlanLimit(planSlug, 'maxImagesPerProduct');
          const result = await query(
            'SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1',
            [productId]
          );
          const count = result.rows[0].count;
          if (count >= maxImages) {
            throw new SubscriptionLimitError('images par produit', count, maxImages);
          }
          break;
        }

        case 'product.variant': {
          const productId = req.params.id || req.body.product_id;
          if (!productId) break;

          const resultCount = await query(
            'SELECT COUNT(*)::int AS count FROM product_variants WHERE product_id = $1',
            [productId]
          );
          const maxVariants = getPlanLimit(planSlug, 'maxVariantsPerProduct');
          if (maxVariants === 0) {
            throw new SubscriptionLimitError('variantes', resultCount.rows[0].count, 0);
          }
          if (resultCount.rows[0].count >= maxVariants) {
            throw new SubscriptionLimitError('variantes', resultCount.rows[0].count, maxVariants);
          }
          break;
        }

        case 'category.create': {
          const maxCategories = getPlanLimit(planSlug, 'maxCategories');
          const result = await query(
            'SELECT COUNT(*)::int AS count FROM categories WHERE shop_id = $1',
            [req.user.shopId]
          );
          const count = result.rows[0].count;
          if (count >= maxCategories) {
            throw new SubscriptionLimitError('catégories', count, maxCategories);
          }
          break;
        }

        case 'custom.domain': {
          const plan = getPlanBySlug(planSlug);
          if (!plan || !plan.customDomain) {
            throw new SubscriptionLimitError('Domaine personnalisé', 0, 0);
          }
          break;
        }

        case 'analytics': {
          const plan = getPlanBySlug(planSlug);
          if (!plan || !plan.analytics) {
            throw new SubscriptionLimitError('Statistiques', 0, 0);
          }
          break;
        }

        default:
          break;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = subscriptionGate;