import { defineConfig } from "drizzle-kit";

// Migraciones de la base de datos. `db:generar` no necesita conexión;
// `db:migrar` usa DATABASE_URL (en local, desde .dev.vars).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/esquema.ts",
  out: "./migraciones",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  casing: "snake_case",
});
