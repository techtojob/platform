// Quita la demostración (lo de db:demo). Lo real se queda.
// Uso: pnpm --filter api db:quitar-demo
import { conectar } from "../src/db/cliente";
import { quitarDemo } from "../src/db/datos-demo";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}
if (process.env.PERMITIR_DATOS_PRUEBA !== "si") {
  console.error('Por seguridad, hace falta PERMITIR_DATOS_PRUEBA="si" en .dev.vars (solo si apunta a la rama dev).');
  process.exit(1);
}

const r = await quitarDemo(conectar(url));
console.log(`✓ Demostración quitada: ${r.usuarios} cuentas, ${r.ofertas} ofertas y ${r.empresas} empresas. Lo real se queda.`);
