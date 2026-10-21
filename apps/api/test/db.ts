import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import type { Db } from "../src/db/cliente";
import { cargarDatosPrueba } from "../src/db/datos-prueba";
import * as esquema from "../src/db/esquema";

/**
 * Base de datos Postgres en memoria para las pruebas (PGlite): mismas migraciones
 * que Neon, sin conexión ni claves.
 */
export async function crearDbPrueba(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema: esquema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migraciones", import.meta.url)) });
  await cargarDatosPrueba(db as unknown as Db);
  return db as unknown as Db;
}
