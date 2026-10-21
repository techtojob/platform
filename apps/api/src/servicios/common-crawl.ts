import { detectarAts, type Ats } from "@techtojob/shared";
import type { Pedir } from "./importar";

/**
 * Encontrar miles de empresas con Common Crawl (https://commoncrawl.org), un archivo público y
 * gratuito de la web que se renueva cada mes. Se le pregunta por todas las direcciones guardadas
 * de cada programa de empleo ("jobs.lever.co/…", "….teamtailor.com"…) y de cada una se saca
 * qué empresa es. No se descarga ninguna página: solo el índice (las direcciones).
 */

/** Las direcciones de cada programa de empleo, tal y como se le piden al índice. */
export const PATRONES: Array<{ ats: Ats; url: string }> = [
  { ats: "greenhouse", url: "boards.greenhouse.io/*" },
  { ats: "greenhouse", url: "job-boards.greenhouse.io/*" },
  { ats: "greenhouse", url: "job-boards.eu.greenhouse.io/*" },
  { ats: "lever", url: "jobs.lever.co/*" },
  { ats: "lever", url: "jobs.eu.lever.co/*" },
  { ats: "ashby", url: "jobs.ashbyhq.com/*" },
  { ats: "teamtailor", url: "*.teamtailor.com" },
  { ats: "personio", url: "*.jobs.personio.de" },
  { ats: "personio", url: "*.jobs.personio.com" },
  { ats: "workable", url: "apply.workable.com/*" },
  { ats: "recruitee", url: "*.recruitee.com" },
  { ats: "smartrecruiters", url: "jobs.smartrecruiters.com/*" },
];

const INDICES = "https://index.commoncrawl.org/collinfo.json";
const AGENTE = "TechToJob/1.0 (+https://techtojob.com/empleo)";
/** Como mucho, cuántas páginas del índice se leen por patrón (cada una, miles de direcciones). */
export const MAXIMO_PAGINAS = 40;

export type PaginaEncontrada = { ats: Ats; id: string; region?: string | null };

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Common Crawl va muy cargado: si responde 503 o 429, se espera y se reintenta (hasta 4 veces). */
async function pedirConReintentos(url: string, pedir: Pedir, esperaBase = 5_000): Promise<string> {
  let ultimo = "";
  for (let intento = 0; intento < 4; intento++) {
    try {
      const r = await pedir(url, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(120_000) });
      // 404: no hay nada guardado con ese patrón en este índice.
      if (r.status === 404) return "";
      if (r.ok) return await r.text();
      ultimo = `HTTP ${r.status}`;
      if (r.status !== 503 && r.status !== 429 && r.status < 500) break;
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
    }
    await espera(esperaBase * 2 ** intento);
  }
  throw new Error(`Common Crawl no responde (${ultimo}).`);
}

/** El índice más reciente: "https://index.commoncrawl.org/CC-MAIN-2026-40-index". */
export async function indiceMasReciente(pedir: Pedir): Promise<{ id: string; api: string }> {
  const lista = JSON.parse(await pedirConReintentos(INDICES, pedir)) as Array<{ id?: string; "cdx-api"?: string }>;
  const primero = lista.find((x) => x.id && x["cdx-api"]);
  if (!primero) throw new Error("Common Crawl no ha devuelto ningún índice.");
  return { id: primero.id!, api: primero["cdx-api"]! };
}

/** De cada línea del índice (JSON con "url"), la página de empleo de la empresa. */
export function paginasDeLineas(texto: string): PaginaEncontrada[] {
  const r: PaginaEncontrada[] = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim()) continue;
    let url: unknown;
    try {
      url = (JSON.parse(linea) as { url?: unknown }).url;
    } catch {
      continue;
    }
    if (typeof url !== "string") continue;
    const ats = detectarAts(url);
    if (ats) r.push({ ats: ats.ats, id: ats.id, ...(ats.region && { region: ats.region }) });
  }
  return r;
}

const clave = (p: PaginaEncontrada) => `${p.ats}:${p.ats === "smartrecruiters" ? p.id : p.id.toLowerCase()}:${p.region ?? ""}`;

/**
 * Todas las páginas de empleo que hay en el índice más reciente, sin repetir.
 * `progreso` va diciendo qué se lee (para el registro de GitHub Actions).
 */
export async function buscarEnCommonCrawl(
  pedir: Pedir = fetch,
  { maximoPaginas = MAXIMO_PAGINAS, esperaBase = 5_000, progreso = (_: string) => {} } = {},
): Promise<{ indice: string; paginas: PaginaEncontrada[]; errores: string[] }> {
  const indice = await indiceMasReciente(pedir);
  const vistas = new Map<string, PaginaEncontrada>();
  const errores: string[] = [];
  for (const patron of PATRONES) {
    const base = `${indice.api}?url=${encodeURIComponent(patron.url)}&output=json&fl=url`;
    try {
      const cuantas = JSON.parse((await pedirConReintentos(`${base}&showNumPages=true`, pedir, esperaBase)) || '{"pages":0}') as { pages?: number };
      const paginas = Math.min(cuantas.pages ?? 0, maximoPaginas);
      const antes = vistas.size;
      for (let n = 0; n < paginas; n++) {
        for (const p of paginasDeLineas(await pedirConReintentos(`${base}&page=${n}`, pedir, esperaBase))) {
          if (p.ats === patron.ats) vistas.set(clave(p), p);
        }
        // Un respiro entre páginas: es un servicio gratuito y compartido.
        await espera(esperaBase / 5);
      }
      progreso(`${patron.url}: ${paginas} páginas del índice, ${vistas.size - antes} empresas nuevas`);
    } catch (e) {
      errores.push(`${patron.url}: ${e instanceof Error ? e.message : String(e)}`);
      progreso(`✗ ${patron.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { indice: indice.id, paginas: [...vistas.values()], errores };
}
