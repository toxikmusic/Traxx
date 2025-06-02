import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://toxik:lJ4-gX6=zP7=jG9+eA9_@traxx-db-1wl46-postgresql.traxx-db-1wl46.svc.cluster.local:5432/traxx-db",
  },
});
