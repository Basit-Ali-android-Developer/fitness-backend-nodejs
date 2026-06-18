import sql from 'mssql';

const config = {
  user: process.env.DB_USER || 'sa',                 // your SQL login
  password: process.env.DB_PASSWORD || 'sa',   // your SQL password
  server: process.env.DB_SERVER || 'localhost',        // or your server name
  database: process.env.DB_DATABASE || 'FitnessAppDB',   // your DB name
  port: parseInt(process.env.DB_PORT || '1433', 10),                 // SQL Server default port
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false,           
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
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

export { sql, poolPromise };