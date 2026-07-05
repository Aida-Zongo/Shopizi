const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config/index');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const passport = require('./config/passport');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const oauthRoutes = require('./routes/oauth.routes');
const shopsRoutes = require('./modules/shops/shops.routes');
const productsRoutes = require('./modules/products/products.routes');
const categoriesRoutes = require('./modules/categories/categories.routes');
const ordersRoutes = require('./modules/orders/orders.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const mediaRoutes = require('./modules/media/media.routes');
const sitesRoutes = require('./modules/sites/sites.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// Nouvelles routes (Feature Pack V2 : Livraison, Chat, Reviews, Ville)
const citiesRoutes = require('./modules/cities/cities.routes');
const reviewsRoutes = require('./modules/reviews/reviews.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const deliveryRoutes = require('./modules/delivery/delivery.routes');
const driversRoutes = require('./modules/drivers/drivers.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const customerRoutes = require('./modules/customer/customer.routes');
const adsRoutes = require('./modules/ads/ads.routes');

/**
 * Create and configure the Express application.
 */
function createApp() {
  const app = express();

  // Check for Gemini API Key (Kèra AI)
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ Kèra fonctionnera en mode dégradé (clé GEMINI_API_KEY absente)');
  }

  // Initialize Redis cache (graceful — won't crash if unavailable)
  try {
    const { getRedisClient } = require('./services/redis.service');
    getRedisClient();
  } catch (err) {
    console.warn('⚠️ Redis non disponible — cache désactivé');
  }

  // Trust proxy for rate limiting behind nginx
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  // extended:true (qs) pour parser les IPN PayDunya en form-urlencoded imbriqué
  // (ex: data[custom_data][transaction_id]).
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Global rate limiting
  app.use(globalLimiter);

  // Passport initialization
  app.use(passport.initialize());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/auth', oauthRoutes);
  app.use('/api/v1/shops', shopsRoutes);
  app.use('/api/v1/products', productsRoutes);
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/subscriptions', subscriptionsRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/media', mediaRoutes);
  app.use('/api/v1/sites', sitesRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Nouvelles routes V2
  app.use('/api/v1/cities', citiesRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/delivery', deliveryRoutes);
  app.use('/api/v1/drivers', driversRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/customer', customerRoutes);
  app.use('/api/v1/ads', adsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      data: null,
      error: { message: `Route introuvable : ${req.method} ${req.originalUrl}`, statusCode: 404 },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
