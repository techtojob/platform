// Llena la base de datos con una demostración: personas con perfil, recruiters, ofertas en todos los estados,
// proyectos, portfolios, me gusta, "Tu portfolio a juicio" y reportes. Todo inventado y marcado con "demo".
// NO borra nada real: si ya había una demostración, la cambia por la nueva.
// Solo para la rama `dev` de Neon. Para quitarla: pnpm --filter api db:quitar-demo
// Uso: pnpm --filter api db:demo
import { conectar } from "../src/db/cliente";
import { cargarDemo } from "../src/db/datos-demo";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Cópiala en apps/api/.dev.vars (mira .dev.vars.example).");
  process.exit(1);
}
if (process.env.PERMITIR_DATOS_PRUEBA !== "si") {
  console.error('Por seguridad, hace falta PERMITIR_DATOS_PRUEBA="si" en .dev.vars (solo si apunta a la rama dev).');
  process.exit(1);
}

const r = await cargarDemo(conectar(url));
console.log(
  `✓ Demostración cargada: ${r.personas} personas, ${r.recruiters} recruiters, ${r.ofertas} ofertas, ${r.proyectos} proyectos, ${r.portfolios} portfolios y ${r.megusta} me gusta.`,
);
