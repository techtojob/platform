import { enlaceAts, nombreEmpresaComparable, type Ats } from "@techtojob/shared";
import { and, asc, eq, lt, or, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { candidatas, empresas } from "../db/esquema";
import { ErrorAts, filtrar, leerAts } from "./ats";
import type { Pedir } from "./importar";
import { configurarEmpresa, crearEmpresa } from "./ofertas-staff";
import { idiomaDe } from "./sincronizar";

/**
 * Descubrir empresas solas.
 *
 * Los ATS (Greenhouse, Lever, Ashby, Teamtailor, Personio) no publican la lista de sus empresas, así que partimos de una lista
 * de nombres (datos/empresas-candidatas.json, más las que añada el staff desde el panel) y, para
 * cada una, se prueba si tiene página de empleo: boards-api.greenhouse.io/…/{id}, api.lever.co/…/{id}…
 *
 * Si la tiene y hay alguna oferta que nos sirva (técnica, 100 % remota, en español o inglés),
 * se añade la empresa con "leer cada día" activado. Si la tiene pero sin ofertas útiles, se vuelve
 * a probar en 30 días. Si no la tiene en ningún sitio, no se vuelve a probar.
 */

/** Candidatas que se prueban en cada pasada (cada una son hasta 14 peticiones). */
export const CANDIDATAS_POR_DIA = 25;
const REPROBAR_MS = 30 * 86_400_000;

/** "Grafana Labs" → "grafana-labs". */
export const idCandidata = (nombre: string) =>
  nombreEmpresaComparable(nombre)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Lo que se prueba en cada ATS: "grafanalabs" y "grafana-labs" (y los que se den a mano). */
export function identificadores(nombre: string, extra: string[] = []): string[] {
  const id = idCandidata(nombre);
  return [...new Set([...extra.map((e) => e.trim().toLowerCase()).filter(Boolean), id.replace(/-/g, ""), id])].filter(
    (x) => /^[a-z0-9._-]{2,100}$/.test(x),
  );
}

export type EntradaCandidata = string | { nombre: string; ids?: string[] };

/** Añade a la tabla las candidatas que aún no estén. Devuelve cuántas se han añadido. */
export async function sembrarCandidatas(db: Db, lista: EntradaCandidata[]): Promise<number> {
  const filas = lista
    .map((e) => (typeof e === "string" ? { nombre: e } : e))
    .map((e) => ({ nombre: e.nombre.trim(), ids: "ids" in e ? (e.ids ?? []) : [] }))
    .filter((e) => e.nombre.length >= 2 && e.nombre.length <= 80 && idCandidata(e.nombre))
    .map((e) => ({ id: idCandidata(e.nombre), nombre: e.nombre, identificadores: identificadores(e.nombre, e.ids) }));
  const unicas = [...new Map(filas.map((f) => [f.id, f])).values()];
  if (!unicas.length) return 0;
  const nuevas = await db.insert(candidatas).values(unicas).onConflictDoNothing().returning({ id: candidatas.id });
  return nuevas.length;
}

type Region = "eu" | "com";
type Hallazgo = { ats: Ats; id: string; region?: Region; utiles: number };

const INTENTOS: Array<{ ats: Ats; region?: Region }> = [
  { ats: "greenhouse" },
  { ats: "lever" },
  { ats: "lever", region: "eu" },
  { ats: "ashby" },
  { ats: "teamtailor" },
  { ats: "personio" },
  { ats: "personio", region: "com" },
];
/** En estos, cada empresa tiene su propio subdominio: si no se puede conectar, es que no existe. */
const POR_SUBDOMINIO = new Set<Ats>(["teamtailor", "personio"]);

/** Prueba una candidata en todos los ATS. null: no está en ninguno. "error": no se pudo saber (se reintenta otro día). */
export async function probar(ids: string[], pedir: Pedir): Promise<Hallazgo | null | "error"> {
  const intentos = INTENTOS;
  let mejor: Hallazgo | null = null;
  let fallo = false;
  for (const id of ids) {
    for (const { ats, region } of intentos) {
      try {
        const leidas = filtrar(await leerAts({ ats, atsId: id, atsRegion: region }, pedir));
        const utiles = leidas.filter((o) => idiomaDe(o)).length;
        // Tiene página: nos quedamos con la que más ofertas útiles tenga.
        if (!mejor || utiles > mejor.utiles) mejor = { ats, id, ...(region && { region }), utiles };
        if (utiles > 0) return mejor;
      } catch (e) {
        // 404 o una respuesta que no es de una página de empleo: aquí no está. Lo demás (500, red), se reintenta.
        if (!(e instanceof ErrorAts) || (e.estado !== undefined && e.estado !== 404)) fallo = true;
        if (e instanceof ErrorAts && e.estado === undefined && /conectar/.test(e.message) && !POR_SUBDOMINIO.has(ats)) fallo = true;
      }
    }
  }
  return mejor ?? (fallo ? "error" : null);
}

export type ResultadoDescubrir = { probadas: number; encontradas: string[]; sinOfertas: number; noExisten: number; errores: number };

/** Prueba las siguientes candidatas y añade las empresas que tengan ofertas útiles. */
export async function descubrir(db: Db, pedir: Pedir = fetch, ahora = new Date(), maximo = CANDIDATAS_POR_DIA): Promise<ResultadoDescubrir> {
  const resultado: ResultadoDescubrir = { probadas: 0, encontradas: [], sinOfertas: 0, noExisten: 0, errores: 0 };
  const lista = await db
    .select()
    .from(candidatas)
    .where(
      or(
        eq(candidatas.estado, "pendiente"),
        and(eq(candidatas.estado, "sin_ofertas"), lt(candidatas.probadaEn, new Date(ahora.getTime() - REPROBAR_MS))),
      ),
    )
    // Primero las que nunca se han probado; luego las que llevan más tiempo.
    .orderBy(sql`${candidatas.probadaEn} asc nulls first`, asc(candidatas.creadaEn))
    .limit(maximo);
  if (!lista.length) return resultado;

  const todas = await db.select().from(empresas);
  const porNombre = new Map(todas.map((e) => [nombreEmpresaComparable(e.nombre), e]));
  const porAts = new Set(todas.filter((e) => e.ats).map((e) => `${e.ats}:${e.atsId}`));

  for (const c of lista) {
    resultado.probadas++;
    const existente = porNombre.get(nombreEmpresaComparable(c.nombre));
    // Ya la tenemos con página de empleo, o nos pidió que no publiquemos: no hace falta probar.
    if (existente && (existente.ats || existente.bloqueada)) {
      await db.update(candidatas).set({ estado: "encontrada", probadaEn: ahora, empresaId: existente.id }).where(eq(candidatas.id, c.id));
      continue;
    }
    const hallazgo = await probar(c.identificadores, pedir);
    if (hallazgo === "error") {
      resultado.errores++;
      await db.update(candidatas).set({ probadaEn: ahora }).where(eq(candidatas.id, c.id));
      continue;
    }
    if (!hallazgo) {
      resultado.noExisten++;
      await db.update(candidatas).set({ estado: "no_existe", probadaEn: ahora }).where(eq(candidatas.id, c.id));
      continue;
    }
    if (hallazgo.utiles === 0 || porAts.has(`${hallazgo.ats}:${hallazgo.id}`)) {
      resultado.sinOfertas++;
      await db.update(candidatas).set({ estado: "sin_ofertas", probadaEn: ahora }).where(eq(candidatas.id, c.id));
      continue;
    }
    const pagina = enlaceAts(hallazgo.ats, hallazgo.id, hallazgo.region);
    const empresa = existente
      ? await configurarEmpresa(db, existente.id, { paginaEmpleo: pagina })
      : await crearEmpresa(db, { nombre: c.nombre, paginaEmpleo: pagina });
    if (!existente) await db.update(empresas).set({ origen: "descubierta" }).where(eq(empresas.id, empresa.id));
    porAts.add(`${hallazgo.ats}:${hallazgo.id}`);
    await db.update(candidatas).set({ estado: "encontrada", probadaEn: ahora, empresaId: empresa.id }).where(eq(candidatas.id, c.id));
    resultado.encontradas.push(c.nombre);
  }
  return resultado;
}

/** Para el panel: cuántas candidatas hay en cada estado. */
export async function resumenCandidatas(db: Db) {
  const filas = await db.select({ estado: candidatas.estado, n: sql<number>`count(*)` }).from(candidatas).groupBy(candidatas.estado);
  const cuenta = { pendiente: 0, encontrada: 0, sin_ofertas: 0, no_existe: 0 };
  for (const f of filas) cuenta[f.estado] = Number(f.n);
  return cuenta;
}

/** El staff sugiere nombres desde el panel (uno por línea). */
export async function sugerirCandidatas(db: Db, texto: unknown): Promise<number> {
  if (typeof texto !== "string") return 0;
  const nombres = texto
    .split(/\n|,/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 200);
  return sembrarCandidatas(db, nombres);
}

