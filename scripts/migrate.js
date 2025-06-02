const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a connection to the database
const pool = new Pool({
  connectionString: postgres://toxik:lJ4-gX6=zP7=jG9+eA9_@traxx-db-1wl46-postgresql.traxx-db-1wl46.svc.cluster.local:5432/traxx-db
});

async function runMigration() {
  console.log('Running database migration...');
  
  try {
    // Read the migration file
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../migrations/initial-migration.sql'),
      'utf8'
    );
    
    // Execute the migration
    await pool.query(migrationSql);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
