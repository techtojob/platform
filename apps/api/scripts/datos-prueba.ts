// Borra y carga los datos de prueba (empresas y ofertas inventadas).
// Solo para la rama `dev` de Neon: nunca contra producción.
// Uso: pnpm --filter api db:datos-prueba
import type { Db } from "../src/db/cliente";
import { conectar } from "../src/db/cliente";
import { cargarDatosPrueba, OFERTAS_PRUEBA } from "../src/db/datos-prueba";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}
if (process.env.PERMITIR_DATOS_PRUEBA !== "si") {
  console.error('Por seguridad, este script borra datos. Añade PERMITIR_DATOS_PRUEBA="si" en .dev.vars, solo si apunta a la rama dev.');
  process.exit(1);
}

await cargarDatosPrueba(conectar(url) as Db);
console.log(`✓ Cargadas ${OFERTAS_PRUEBA.length} ofertas de prueba.`);
