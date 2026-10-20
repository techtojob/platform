// Ofertas automáticas, lo que se hace cada mañana:
//   1. Descubrir empresas: se prueban unas cuantas candidatas (datos/empresas-candidatas.json y las que
//      sugiera el staff) para ver si tienen página de empleo en Greenhouse, Lever o Ashby.
//   2. Leer las páginas de empleo de las empresas con "leer cada día" activado y crear las ofertas
//      nuevas (pendientes para el staff), como mucho 20 en español y 20 en inglés.
//
// Uso: pnpm --filter api ofertas:sincronizar   → rama dev (DATABASE_URL de .dev.vars)
// En producción lo lanza cada día .github/workflows/ofertas.yml (DATABASE_URL de los secretos de GitHub).
import { readFileSync } from "node:fs";
import { conectar } from "../src/db/cliente";
import { descubrir, sembrarCandidatas, type EntradaCandidata } from "../src/servicios/descubrir";
import { sincronizarTodas } from "../src/servicios/sincronizar";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const db = conectar(url);

// 1. Descubrir
const lista = JSON.parse(readFileSync(new URL("../datos/empresas-candidatas.json", import.meta.url), "utf8")) as EntradaCandidata[];
const sembradas = await sembrarCandidatas(db, lista);
const d = await descubrir(db);
console.log(
  `Descubrir: ${sembradas} candidatas nuevas en la lista · ${d.probadas} probadas · ${d.encontradas.length} empresas añadidas` +
    (d.encontradas.length ? ` (${d.encontradas.join(", ")})` : "") +
    ` · ${d.sinOfertas} sin ofertas útiles · ${d.noExisten} sin página · ${d.errores} con error\n`,
);

// 2. Leer
const resultados = await sincronizarTodas(db);
let errores = 0;
for (const r of resultados) {
  if (r.error) {
    errores++;
    console.log(`✗ ${r.empresa}: ${r.error}`);
  } else {
    const espera = r.enEspera ? `, ${r.enEspera} esperan cupo` : "";
    console.log(`✓ ${r.empresa}: ${r.nuevas} nuevas${espera}, ${r.vistas} siguen, ${r.cerradas} cerradas`);
  }
}
const nuevas = resultados.reduce((n, r) => n + r.nuevas, 0);
console.log(`\n${resultados.length} empresas leídas · ${nuevas} ofertas nuevas pendientes de revisar · ${errores} con error`);
// Los errores de una empresa no paran a las demás ni hacen fallar el proceso: se ven en el panel (Empresas).
// Solo falla si fallan todas.
if (resultados.length > 1 && errores === resultados.length) process.exit(1);
