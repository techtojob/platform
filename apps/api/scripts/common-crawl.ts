// Busca en Common Crawl (archivo público de la web) todas las páginas de empleo de Greenhouse, Lever,
// Ashby, Teamtailor, Personio, Workable, Recruitee y SmartRecruiters, y las añade como candidatas.
// Después, la tarea de cada día las va probando (300 al día) y añade las que tengan ofertas que nos sirvan.
//
// Uso: pnpm --filter api ofertas:common-crawl   → rama dev (DATABASE_URL de .dev.vars). Tarda un rato.
// En producción lo lanza una vez al mes .github/workflows/common-crawl.yml.
import { conectar } from "../src/db/cliente";
import { buscarEnCommonCrawl } from "../src/servicios/common-crawl";
import { sembrarPaginasConocidas } from "../src/servicios/descubrir";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const inicio = Date.now();
const r = await buscarEnCommonCrawl(fetch, { progreso: (texto) => console.log(texto) });
const nuevas = await sembrarPaginasConocidas(conectar(url), r.paginas);
const minutos = Math.round((Date.now() - inicio) / 60_000);
console.log(`\nÍndice ${r.indice}: ${r.paginas.length} páginas de empleo encontradas · ${nuevas} candidatas nuevas · ${minutos} min`);
if (r.errores.length) console.log(`Con error (se reintentará el mes que viene):\n  ${r.errores.join("\n  ")}`);
// Solo falla si no ha salido nada de nada.
if (!r.paginas.length) process.exit(1);
