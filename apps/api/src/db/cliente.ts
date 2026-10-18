import { neon } from "@neondatabase/serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/neon-http";
import * as esquema from "./esquema";

/**
 * Conexión a la base de datos. Los servicios reciben un `Db` y no saben si es
 * Neon (en Cloudflare) o una base en memoria (en las pruebas).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof esquema>;

/** Neon por HTTP: lo recomendado en Cloudflare Workers (sin conexiones abiertas). */
export function conectar(databaseUrl: string): Db {
  return drizzle(neon(databaseUrl), { schema: esquema }) as unknown as Db;
}
