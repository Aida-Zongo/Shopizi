const { Pool } = require('pg');
const config = require('../config/index');

// En production (Render, etc.) la base est fournie via DATABASE_URL (connection
// string) et impose SSL. En local on garde les champs séparés si DATABASE_URL
// est absente. On préfère DATABASE_URL dès qu'elle est présente.
const poolConfig = config.database.url
  ? {
      connectionString: config.database.url,
      ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    };

const pool = new Pool({
  ...poolConfig,
  max: config.database.maxPoolSize,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
});

// Test connection on startup
pool.on('connect', () => {
  // Connection established
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

/**
 * Execute a single query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.env === 'development' && duration > 100) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return result;
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Pool client
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };