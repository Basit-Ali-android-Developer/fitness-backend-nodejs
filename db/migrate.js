import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql, poolPromise } from './connection.js';

let __filename = '';
let __dirname = '';

try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  }
} catch (e) {
  // Safe fallback
}

async function migrate() {
  console.log('🏁 Starting Database Migrations...');
  let pool;
  try {
    pool = await poolPromise;
  } catch (err) {
    console.error('❌ Failed to connect to the database to run migrations:', err);
    process.exit(1);
  }

  try {
    // 1. Ensure the _Migrations table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='_Migrations' AND xtype='U')
      CREATE TABLE _Migrations (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name VARCHAR(255) NOT NULL UNIQUE,
          RunAt DATETIME DEFAULT GETDATE()
      );
    `);
    console.log('✅ Migrations tracking table verified.');

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 Migrations directory not found. Creating it...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('ℹ️ No migration files found in db/migrations/.');
      return;
    }

    // 3. Execute each migration that hasn't run yet
    for (const file of files) {
      const checkResult = await pool.request()
        .input('name', sql.VarChar, file)
        .query('SELECT COUNT(*) AS count FROM _Migrations WHERE Name = @name');

      const alreadyRun = checkResult.recordset[0].count > 0;
      if (alreadyRun) {
        console.log(`⏩ Skipping ${file} (already executed).`);
        continue;
      }

      console.log(`🏃 Running migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Start transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Execute SQL script
        await new sql.Request(transaction).query(sqlContent);

        // Record migration
        await new sql.Request(transaction)
          .input('name', sql.VarChar, file)
          .query('INSERT INTO _Migrations (Name) VALUES (@name)');

        await transaction.commit();
        console.log(`✅ Migration ${file} executed successfully.`);
      } catch (err) {
        console.error(`❌ Migration ${file} failed. Rolling back transaction.`);
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error('⚠️ Rollback failed:', rollbackErr);
        }
        throw err;
      }
    }

    console.log('🎉 All migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration process encountered an error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
