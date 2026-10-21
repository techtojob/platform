// Quita de la base de datos las empresas, ofertas y perfiles inventados (los de db:datos-prueba)
// y deja lo real: las empresas y ofertas que han entrado solas o que ha metido el staff.
// Solo para la rama `dev` de Neon.
// Uso: pnpm --filter api db:quitar-datos-prueba
import { conectar } from "../src/db/cliente";
import { quitarDatosPrueba } from "../src/db/datos-prueba";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}
if (process.env.PERMITIR_DATOS_PRUEBA !== "si") {
  console.error('Por seguridad, este script borra datos. Hace falta PERMITIR_DATOS_PRUEBA="si" en .dev.vars (solo si apunta a la rama dev).');
  process.exit(1);
}

const r = await quitarDatosPrueba(conectar(url));
console.log(`✓ Quitadas ${r.ofertas} ofertas, ${r.empresas} empresas y ${r.perfiles} perfiles de prueba. Lo real se queda.`);
