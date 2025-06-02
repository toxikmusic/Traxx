import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create a PostgreSQL connection
const connectionString = 'postgres://toxik:lJ4-gX6=zP7=jG9+eA9_@traxx-db-1wl46-postgresql.traxx-db-1wl46.svc.cluster.local:5432/traxx-db' as string;
const sql = postgres(connectionString, { max: 10 });

// Create a drizzle instance with the schema
export const db = drizzle(sql, { schema });

// Export the SQL client for other uses
export { sql };
