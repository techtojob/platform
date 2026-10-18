// Comprueba la configuración de idiomas (src/i18n/idiomas.json) y los textos
// (messages/<idioma>.json). Se ejecuta en el CI con `pnpm typecheck`.
//
// - Errores (el CI falla): bases repetidas, rutas que no cuadran entre idiomas,
//   idiomas sin archivo de textos…
// - Avisos (el CI pasa): textos que faltan por traducir. Mientras falten, se
//   muestran en inglés.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta) => JSON.parse(readFileSync(join(raiz, ruta), "utf8"));
const enCI = !!process.env.GITHUB_ACTIONS;

const errores = [];
const avisos = [];

const config = leer("src/i18n/idiomas.json");
const codigos = Object.keys(config.idiomas);
const REFERENCIA = "es";

if (!codigos.includes(config.porDefecto)) errores.push(`"porDefecto" (${config.porDefecto}) no está en la lista de idiomas.`);
if (!codigos.includes(REFERENCIA)) errores.push(`Falta el español, que es el idioma de referencia.`);

// Direcciones base: únicas y sin que una empiece por otra (/jobs y /jobs-de chocarían).
const bases = codigos.map((c) => [c, config.idiomas[c].base]);
for (const [c, base] of bases) {
  if (!/^\/[a-z0-9-]+$/.test(base)) errores.push(`${c}: la base "${base}" debe ser tipo "/empleo" (minúsculas, sin barra final).`);
  for (const [otro, otraBase] of bases) {
    if (c < otro && (base === otraBase || base.startsWith(`${otraBase}/`) || otraBase.startsWith(`${base}/`))) {
      errores.push(`${c} y ${otro} chocan: "${base}" y "${otraBase}". Cada idioma necesita su propia base.`);
    }
  }
}

// Rutas: mismas rutas internas en todos los idiomas, mismos parámetros y sin repetir.
const rutasRef = config.idiomas[REFERENCIA]?.rutas ?? {};
const params = (r) => (r.match(/\[[^\]]+\]/g) ?? []).sort().join(",");
for (const c of codigos) {
  const rutas = config.idiomas[c].rutas ?? {};
  for (const interna of Object.keys(rutasRef)) {
    if (!(interna in rutas)) errores.push(`${c}: falta la ruta "${interna}".`);
    else if (params(rutas[interna]) !== params(interna)) errores.push(`${c}: "${rutas[interna]}" no tiene los mismos parámetros que "${interna}".`);
  }
  for (const interna of Object.keys(rutas)) {
    if (!(interna in rutasRef)) errores.push(`${c}: la ruta "${interna}" no existe en español.`);
  }
  const vistas = new Map();
  for (const [interna, traducida] of Object.entries(rutas)) {
    if (vistas.has(traducida)) errores.push(`${c}: "${traducida}" se usa para "${vistas.get(traducida)}" y "${interna}".`);
    vistas.set(traducida, interna);
  }
}

// Textos: cada idioma con su archivo y las mismas claves que el español.
const claves = (obj, prefijo = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`],
  );
const ref = new Set(claves(leer(`messages/${REFERENCIA}.json`)));
for (const c of codigos) {
  const archivo = `messages/${c}.json`;
  if (!existsSync(join(raiz, archivo))) {
    errores.push(`${c}: falta el archivo ${archivo}.`);
    continue;
  }
  const propias = new Set(claves(leer(archivo)));
  const faltan = [...ref].filter((k) => !propias.has(k));
  const sobran = [...propias].filter((k) => !ref.has(k));
  if (faltan.length) avisos.push(`${c}: faltan ${faltan.length} textos por traducir: ${faltan.join(", ")}`);
  if (sobran.length) avisos.push(`${c}: textos que no existen en español (¿borrados o mal escritos?): ${sobran.join(", ")}`);
}

for (const a of avisos) console.log(enCI ? `::warning title=Idiomas::${a}` : `⚠️  ${a}`);
for (const e of errores) console.log(enCI ? `::error title=Idiomas::${e}` : `❌ ${e}`);
if (errores.length) process.exit(1);
console.log(`✓ Idiomas correctos: ${codigos.join(", ")}`);
