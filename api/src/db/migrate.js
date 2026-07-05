const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const logger = require('../config/logger');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Run all SQL migration files in order.
 */
async function migrate() {
  logger.info('Starting database migrations...');

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Get already executed migrations
  const { rows: executed } = await pool.query('SELECT filename FROM _migrations ORDER BY id');
  const executedFiles = new Set(executed.map((r) => r.filename));

  // Get all migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executedFiles.has(file)) {
      logger.info(`  ✓ ${file} (already executed)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info(`  → Running ${file}...`);

    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      logger.info(`  ✓ ${file} completed`);
    } catch (err) {
      logger.error(`  ✗ ${file} failed: ${err.message}`);
      throw err;
    }
  }

  logger.info('All migrations completed successfully.');
}

// Run if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };