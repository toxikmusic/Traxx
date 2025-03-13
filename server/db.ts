import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create a PostgreSQL connection
const connectionString = process.env.DATABASE_URL as string;
const sql = postgres(connectionString, { max: 10 });

// Create a drizzle instance with the schema
export const db = drizzle(sql, { schema });

// Export the SQL client for other uses
export { sql };