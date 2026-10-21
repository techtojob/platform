// Borra TODAS las ofertas (automáticas, del staff y de recruiters) para volver a llenarlas con
// ofertas:sincronizar y los filtros de ahora. Las empresas se quedan (así se vuelven a leer).
// Solo para la rama `dev` de Neon: hace falta PERMITIR_DATOS_PRUEBA="si" en .dev.vars.
// Uso: pnpm --filter api ofertas:borrar-todas
import { sql } from "drizzle-orm";
import { conectar } from "../src/db/cliente";
import { empresas, ofertas } from "../src/db/esquema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}
if (process.env.PERMITIR_DATOS_PRUEBA !== "si") {
  console.error('Por seguridad, este script borra datos. Hace falta PERMITIR_DATOS_PRUEBA="si" en .dev.vars (solo si apunta a la rama dev).');
  process.exit(1);
}

const db = conectar(url);
// Sus idiomas y sus reportes se borran solos (en cascada).
const borradas = await db.delete(ofertas).returning({ id: ofertas.id });
// Para que mañana (y hoy) se vuelvan a leer todas, como si fueran nuevas.
await db.update(empresas).set({ ultimaLectura: null, ultimoError: null, erroresSeguidos: 0, ultimaOfertaUtil: sql`now()` });
console.log(`✓ Borradas ${borradas.length} ofertas. Las empresas se quedan; ahora: pnpm --filter api ofertas:sincronizar`);
