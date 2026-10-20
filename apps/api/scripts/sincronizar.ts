// Lee las páginas de empleo (Greenhouse, Lever, Ashby) de las empresas con "sincronizar"
// activado y pone al día sus ofertas automáticas. Las nuevas quedan pendientes para el staff.
//
// Uso: pnpm --filter api ofertas:sincronizar   → rama dev (DATABASE_URL de .dev.vars)
// En producción lo lanza cada día .github/workflows/ofertas.yml (DATABASE_URL de los secretos de GitHub).
import { conectar } from "../src/db/cliente";
import { sincronizarTodas } from "../src/servicios/sincronizar";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const resultados = await sincronizarTodas(conectar(url));
let errores = 0;
for (const r of resultados) {
  if (r.error) {
    errores++;
    console.log(`✗ ${r.empresa}: ${r.error}`);
  } else {
    console.log(`✓ ${r.empresa}: ${r.nuevas} nuevas, ${r.vistas} siguen, ${r.cerradas} cerradas`);
  }
}
const nuevas = resultados.reduce((n, r) => n + r.nuevas, 0);
console.log(`\n${resultados.length} empresas leídas · ${nuevas} ofertas nuevas pendientes de revisar · ${errores} con error`);
// Los errores de una empresa no paran a las demás ni hacen fallar el proceso:
// se ven en el panel de staff (Empresas). Solo falla si fallan todas.
if (resultados.length && errores === resultados.length) process.exit(1);
