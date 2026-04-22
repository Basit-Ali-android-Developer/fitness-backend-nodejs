const sql = require('mssql');

const config = {
  user: 'sa',                 // your SQL login
  password: 'sa',   // your SQL password
  server: 'localhost',        // or your server name
  database: 'FitnessAppDB',   // your DB name
  port: 1433,                 // SQL Server default port
  options: {
    encrypt: false,           
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('❌ DB Connection Error:', err);
    process.exit(1); // stops Node if connection fails
  });

module.exports = { sql, poolPromise };