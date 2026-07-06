const http = require('http');
const createApp = require('./app');
const config = require('./config/index');
const logger = require('./config/logger');
const { pool } = require('./db/pool');
const { migrate } = require('./db/migrate');
const { initSocket } = require('./realtime/socket');

/**
 * Bootstrap the API server.
 */
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');

    // Auto-run migrations on startup (development + production).
    // Idempotent: already-applied migrations are skipped without failing boot.
    try {
      await migrate();
      logger.info('Migrations applied (or already up to date)');
    } catch (err) {
      logger.warn('Migration skipped (may already be applied):', err.message);
    }

    // Initialize event listeners and scheduled jobs
    require('./events/listeners');
    const { initScheduler } = require('./jobs/scheduler');
    initScheduler();

    // Create Express app
    const app = createApp();

    // Wrap in an HTTP server so Socket.io can attach to the same port
    const server = http.createServer(app);
    initSocket(server);

    // Start server — Render injects PORT (e.g. 10000); fall back to 3000 locally.
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, config.server.host, () => {
      logger.info(`Shopizi API running on http://${config.server.host}:${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API docs: http://localhost:${PORT}/health`);
      
      if (!process.env.GEMINI_API_KEY) {
        logger.warn('⚠️ GEMINI_API_KEY est manquante. Kèra (Assistant IA) fonctionnera en mode dégradé.');
      }
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        logger.info('Server shut down complete.');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();