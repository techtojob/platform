// Tras `opennextjs-cloudflare build`: mueve los archivos de Next (/_next/…) debajo del prefijo
// de la bolsa (/empleo-recursos/_next/…), que es donde los pide el HTML (assetPrefix en next.config.ts).
// Así no chocan con los /_next/… de la landing, que vive en el mismo dominio.
import { existsSync, mkdirSync, renameSync } from "node:fs";

const PREFIJO = "empleo-recursos";
const origen = ".open-next/assets/_next";
const destino = `.open-next/assets/${PREFIJO}/_next`;

if (!existsSync(origen)) {
  console.error(`No existe ${origen}: ¿se ha ejecutado opennextjs-cloudflare build?`);
  process.exit(1);
}
mkdirSync(`.open-next/assets/${PREFIJO}`, { recursive: true });
renameSync(origen, destino);
console.log(`✓ Recursos movidos a /${PREFIJO}/_next`);
