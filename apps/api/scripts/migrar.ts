// Aplica las migraciones pendientes a la base de datos de DATABASE_URL (.dev.vars).
// Uso: pnpm --filter api db:migrar
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}

await migrate(drizzle(neon(url)), { migrationsFolder: "./migraciones" });
console.log("✓ Base de datos al día.");
