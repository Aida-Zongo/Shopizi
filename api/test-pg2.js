const { Client } = require('pg');
const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'shopizi',
  user: 'shopizi_user',
  password: 'shopizi_pass',
  connectionTimeoutMillis: 10000
});
client.connect()
  .then(() => client.query('SELECT NOW()'))
  .then(res => { console.log(' SUCCESS:', res.rows[0]); client.end(); })
  .catch(e => { console.error(' ERROR:', e.message); client.end(); });
