const { Pool } = require('pg');

const pool = new Pool({
  user: 'taxiapp_user',
  password: '132312Ml',
  host: 'localhost',
  port: 5432,
  database: 'taxiapp_db'
});

module.exports = pool;