const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 55001,
  database: 'shopizi',
  user: 'shopizi_user',
  password: 'shopizi_pass',
  family: 4
});
pool.query('SELECT 1')
  .then(() => { console.log('CONNEXION OK !'); pool.end(); })
  .catch(e => { console.error('ECHEC:', e.message); pool.end(); });
