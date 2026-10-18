import type { Area, Idioma, Modalidad, NivelIdioma, Seniority } from "@techtojob/shared";
import { and, arrayOverlaps, countDistinct, desc, eq, inArray, notExists, notInArray, or, lt, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../db/esquema";

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

export type OfertaListado = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string | null;
  idioma: Idioma;
  empresa: { nombre: string; slug: string; logoUrl: string | null };
  area: Area;
  seniority: Seniority;
  modalidad: Modalidad;
  tecnologias: string[];
  pais: string | null;
  ciudad: string | null;
  remotoDesde: string | null;
  salario: { min: number | null; max: number | null; moneda: string | null } | null;
  idiomasRequeridos: Array<{ idioma: Idioma; nivel: NivelIdioma | null }>;
  publicadaEn: string;
};

export type ResultadoOfertas = {
  ofertas: OfertaListado[];
  /** Para pedir la página siguiente; null si no hay más. */
  siguiente: string | null;
  /**
   * Ofertas que cumplen los filtros pero piden un idioma que la persona no ha marcado,
   * por idioma: { en: 12 }. Para el aviso "Hay 12 ofertas más que piden inglés".
   */
  ocultasPorIdioma: Partial<Record<Idioma, number>>;
};

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

/** Ofertas publicadas que puede hacer quien busca, de la más nueva a la más antigua. */
export async function listarOfertas(db: Db, filtros: FiltrosOfertas): Promise<ResultadoOfertas> {
  const limite = Math.min(Math.max(filtros.limite ?? LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
  const condiciones = [...condicionesBase(filtros), pideSoloIdiomas(db, filtros.idiomas)];

  const cursor = filtros.despues ? leerCursor(filtros.despues) : null;
  if (cursor) {
    condiciones.push(
      or(
        lt(ofertas.publicadaEn, cursor.publicadaEn),
        and(eq(ofertas.publicadaEn, cursor.publicadaEn), lt(ofertas.id, cursor.id)),
      )!,
    );
  }

  const filas = await db
    .select({ oferta: ofertas, empresa: { nombre: empresas.nombre, slug: empresas.slug, logoUrl: empresas.logoUrl } })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(and(...condiciones))
    .orderBy(desc(ofertas.publicadaEn), desc(ofertas.id))
    .limit(limite + 1);

  const hayMas = filas.length > limite;
  const pagina = filas.slice(0, limite);

  const ids = pagina.map((f) => f.oferta.id);
  const idiomas = ids.length
    ? await db.select().from(ofertaIdiomas).where(inArray(ofertaIdiomas.ofertaId, ids))
    : [];

  const ultima = pagina.at(-1)?.oferta;
  return {
    ofertas: pagina.map(({ oferta: o, empresa }) => ({
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
        o.salarioMin != null || o.salarioMax != null
          ? { min: o.salarioMin, max: o.salarioMax, moneda: o.moneda }
          : null,
      idiomasRequeridos: idiomas
        .filter((i) => i.ofertaId === o.id)
        .map((i) => ({ idioma: i.idioma, nivel: i.nivel })),
      publicadaEn: o.publicadaEn!.toISOString(),
    })),
    siguiente: hayMas && ultima?.publicadaEn ? codificarCursor(ultima.publicadaEn, ultima.id) : null,
    ocultasPorIdioma: filtros.despues ? {} : await contarOcultasPorIdioma(db, filtros),
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
