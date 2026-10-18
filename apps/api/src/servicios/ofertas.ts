import type { Area, Idioma, Modalidad, OfertaDetalle, OfertaListado, ResultadoOfertas, Seniority } from "@techtojob/shared";
import { and, arrayOverlaps, count, countDistinct, desc, eq, inArray, notExists, notInArray, or, lt, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas, type Oferta, type OfertaIdioma } from "../db/esquema";

export type FiltrosOfertas = {
  /** Idiomas que habla quien busca. Solo salen ofertas que piden idiomas de esta lista. */
  idiomas: Idioma[];
  areas?: Area[];
  seniority?: Seniority[];
  modalidades?: Modalidad[];
  /** Ofertas con al menos una de estas tecnologías. */
  tecnologias?: string[];
  limite?: number;
  /** Código de la página siguiente (lo devuelve la llamada anterior). */
  despues?: string | null;
};

export type { OfertaDetalle, OfertaListado, ResultadoOfertas } from "@techtojob/shared";

export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 50;

function codificarCursor(publicadaEn: Date, id: string) {
  return btoa(`${publicadaEn.toISOString()}|${id}`).replace(/=+$/, "");
}

function leerCursor(cursor: string): { publicadaEn: Date; id: string } | null {
  try {
    const [fecha, id] = atob(cursor).split("|");
    const publicadaEn = new Date(fecha);
    return id && !Number.isNaN(publicadaEn.getTime()) ? { publicadaEn, id } : null;
  } catch {
    return null;
  }
}

/** Condiciones comunes: publicada y filtros de área, nivel, modalidad y tecnologías. */
function condicionesBase(f: FiltrosOfertas): SQL[] {
  const c: SQL[] = [eq(ofertas.estado, "publicada")];
  if (f.areas?.length) c.push(inArray(ofertas.area, f.areas));
  if (f.seniority?.length) c.push(inArray(ofertas.seniority, f.seniority));
  if (f.modalidades?.length) c.push(inArray(ofertas.modalidad, f.modalidades));
  if (f.tecnologias?.length) c.push(arrayOverlaps(ofertas.tecnologias, f.tecnologias));
  return c;
}

/** La oferta no pide ningún idioma fuera de los que habla la persona. */
function pideSoloIdiomas(db: Db, idiomas: Idioma[]): SQL {
  return notExists(
    db
      .select({ uno: sql`1` })
      .from(ofertaIdiomas)
      .where(and(eq(ofertaIdiomas.ofertaId, ofertas.id), notInArray(ofertaIdiomas.idioma, idiomas))),
  );
}

/** Pasa una fila de la base de datos a la forma del contrato del API. */
function aListado(
  o: Oferta,
  empresa: OfertaListado["empresa"],
  idiomas: OfertaIdioma[],
): OfertaListado {
  return {
    id: o.id,
    slug: o.slug,
    titulo: o.titulo,
    resumen: o.resumen,
    idioma: o.idioma,
    empresa,
    area: o.area,
    seniority: o.seniority,
    modalidad: o.modalidad,
    tecnologias: o.tecnologias,
    pais: o.pais,
    ciudad: o.ciudad,
    remotoDesde: o.remotoDesde,
    salario:
      o.salarioMin != null || o.salarioMax != null ? { min: o.salarioMin, max: o.salarioMax, moneda: o.moneda } : null,
    idiomasRequeridos: idiomas
      .filter((i) => i.ofertaId === o.id)
      .map((i) => ({ idioma: i.idioma, nivel: i.nivel })),
    publicadaEn: o.publicadaEn!.toISOString(),
  };
}

/** Ofertas publicadas que puede hacer quien busca, de la más nueva a la más antigua. */
export async function listarOfertas(db: Db, filtros: FiltrosOfertas): Promise<ResultadoOfertas> {
  const limite = Math.min(Math.max(filtros.limite ?? LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
  const condiciones = [...condicionesBase(filtros), pideSoloIdiomas(db, filtros.idiomas)];

  const cursor = filtros.despues ? leerCursor(filtros.despues) : null;
  const condicionesPagina = cursor
    ? [
        ...condiciones,
        or(
          lt(ofertas.publicadaEn, cursor.publicadaEn),
          and(eq(ofertas.publicadaEn, cursor.publicadaEn), lt(ofertas.id, cursor.id)),
        )!,
      ]
    : condiciones;

  const [filas, [{ total }]] = await Promise.all([
    db
      .select({ oferta: ofertas, empresa: { nombre: empresas.nombre, slug: empresas.slug, logoUrl: empresas.logoUrl } })
      .from(ofertas)
      .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
      .where(and(...condicionesPagina))
      .orderBy(desc(ofertas.publicadaEn), desc(ofertas.id))
      .limit(limite + 1),
    db.select({ total: count() }).from(ofertas).where(and(...condiciones)),
  ]);

  const hayMas = filas.length > limite;
  const pagina = filas.slice(0, limite);

  const ids = pagina.map((f) => f.oferta.id);
  const idiomas = ids.length
    ? await db.select().from(ofertaIdiomas).where(inArray(ofertaIdiomas.ofertaId, ids))
    : [];

  const ultima = pagina.at(-1)?.oferta;
  return {
    ofertas: pagina.map(({ oferta, empresa }) => aListado(oferta, empresa, idiomas)),
    total: Number(total),
    siguiente: hayMas && ultima?.publicadaEn ? codificarCursor(ultima.publicadaEn, ultima.id) : null,
    ocultasPorIdioma: filtros.despues ? {} : await contarOcultasPorIdioma(db, filtros),
  };
}

/**
 * Una oferta publicada, entera. No filtra por idiomas: quien tenga el enlace la puede
 * ver (la web le avisa si pide un idioma que no ha marcado). null si no existe o no está publicada.
 */
export async function obtenerOferta(db: Db, id: string): Promise<OfertaDetalle | null> {
  const [fila] = await db
    .select({
      oferta: ofertas,
      empresa: { nombre: empresas.nombre, slug: empresas.slug, logoUrl: empresas.logoUrl, web: empresas.web },
    })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(and(eq(ofertas.id, id), eq(ofertas.estado, "publicada")))
    .limit(1);
  if (!fila) return null;

  const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, id));
  return {
    ...aListado(fila.oferta, fila.empresa, idiomas),
    empresa: fila.empresa,
    descripcion: fila.oferta.descripcion,
    urlOriginal: fila.oferta.urlOriginal,
  };
}

/** Cuántas ofertas quedan fuera por cada idioma que la persona no ha marcado. */
async function contarOcultasPorIdioma(db: Db, filtros: FiltrosOfertas) {
  const filas = await db
    .select({ idioma: ofertaIdiomas.idioma, total: countDistinct(ofertas.id) })
    .from(ofertas)
    .innerJoin(ofertaIdiomas, eq(ofertaIdiomas.ofertaId, ofertas.id))
    .where(and(...condicionesBase(filtros), notInArray(ofertaIdiomas.idioma, filtros.idiomas)))
    .groupBy(ofertaIdiomas.idioma);
  return Object.fromEntries(filas.map((f) => [f.idioma, Number(f.total)])) as Partial<Record<Idioma, number>>;
}
