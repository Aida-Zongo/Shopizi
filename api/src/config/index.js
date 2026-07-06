const path = require('path');

// Load .env from the api/ directory root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'shopizi',
    user: (process.env.DB_USER || 'shopizi_user').trim(),
    password: (process.env.DB_PASSWORD || 'shopizi_pass').trim(),
    maxPoolSize: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-change-in-production',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Shopizi',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@shopizi.bf',
  },
  cinetpay: {
    apiKey: process.env.CINETPAY_API_KEY || '',
    siteId: process.env.CINETPAY_SITE_ID || '',
    secret: process.env.CINETPAY_SECRET || '',
    baseUrl: process.env.CINETPAY_BASE_URL || 'https://api-checkout.cinetpay.com/v2',
    // Par défaut, suivre le déploiement réel (Render/Vercel) via BACKEND_URL /
    // FRONTEND_URL plutôt que d'exiger deux variables de plus.
    notifyUrl: process.env.CINETPAY_NOTIFY_URL ||
      (process.env.BACKEND_URL ? process.env.BACKEND_URL + '/api/v1/payments/webhook/cinetpay' : ''),
    returnUrl: process.env.CINETPAY_RETURN_URL ||
      (process.env.FRONTEND_URL ? process.env.FRONTEND_URL + '/payment/success' : ''),
  },
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  generator: {
    siteOutputRoot: process.env.SITE_OUTPUT_ROOT || '/var/www/shops',
    pythonPath: process.env.GENERATOR_PYTHON_PATH || 'python',
    module: process.env.GENERATOR_MODULE || 'generator',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    appUrl: process.env.APP_URL || 'https://app.shopizi.bf',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey:    process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};

module.exports = config;