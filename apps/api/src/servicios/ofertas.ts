import { buscarTecnologia, type Area, type EntradaMapa, type Idioma, type Modalidad, type OfertaDetalle, type OfertaListado, type ResultadoOfertas, type Seniority } from "@techtojob/shared";
import { and, arrayContains, arrayOverlaps, count, countDistinct, desc, eq, gt, ilike, inArray, isNotNull, isNull, ne, not, notExists, notInArray, or, lt, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas, recruiters, usuarios, type Oferta, type OfertaIdioma } from "../db/esquema";

export type FiltrosOfertas = {
  /** Idiomas que habla quien busca. Solo salen ofertas que piden idiomas de esta lista. */
  idiomas: Idioma[];
  areas?: Area[];
  seniority?: Seniority[];
  modalidades?: Modalidad[];
  /** Ofertas con al menos una de estas tecnologías. */
  tecnologias?: string[];
  /** Texto libre: busca en título, resumen, empresa y, si es una tecnología, en tecnologías. */
  q?: string;
  /** Solo ofertas con salario publicado. */
  conSalario?: boolean;
  /**
   * País desde el que trabaja quien busca (ISO, "MX"): solo ofertas que puede hacer desde allí
   * (en remoto desde ese país o desde cualquiera, o híbridas y presenciales en ese país).
   */
  desde?: string;
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

/** Que % y _ se busquen como texto en un LIKE, no como comodines. */
function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Búsqueda de texto: título, resumen, nombre de la empresa o, si lo escrito es una tecnología, sus ofertas. */
function buscarTexto(db: Db, q: string): SQL {
  const patron = `%${escaparLike(q)}%`;
  const tecnologia = buscarTecnologia(q);
  return or(
    ilike(ofertas.titulo, patron),
    ilike(ofertas.resumen, patron),
    inArray(ofertas.empresaId, db.select({ id: empresas.id }).from(empresas).where(ilike(empresas.nombre, patron))),
    ...(tecnologia ? [arrayContains(ofertas.tecnologias, [tecnologia.id])] : []),
  )!;
}

type Grupo = "area" | "seniority" | "modalidad" | "desde";

/** Que no haya caducado (sin fecha de caducidad, no caduca). */
function vigente(): SQL {
  return or(isNull(ofertas.caducaEn), gt(ofertas.caducaEn, sql`now()`))!;
}

/**
 * Condiciones comunes: publicada y filtros. `sin` deja fuera un grupo de filtros:
 * sirve para contar cuántas habría con cada valor de ese grupo (facetas).
 */
function condicionesBase(db: Db, f: FiltrosOfertas, sin?: Grupo): SQL[] {
  const c: SQL[] = [eq(ofertas.estado, "publicada"), vigente()];
  if (sin !== "area" && f.areas?.length) c.push(inArray(ofertas.area, f.areas));
  if (sin !== "seniority" && f.seniority?.length) c.push(inArray(ofertas.seniority, f.seniority));
  if (sin !== "modalidad" && f.modalidades?.length) c.push(inArray(ofertas.modalidad, f.modalidades));
  if (f.tecnologias?.length) c.push(arrayOverlaps(ofertas.tecnologias, f.tecnologias));
  if (f.q?.trim()) c.push(buscarTexto(db, f.q.trim()));
  if (f.conSalario) c.push(or(isNotNull(ofertas.salarioMin), isNotNull(ofertas.salarioMax))!);
  if (sin !== "desde" && f.desde) c.push(sePuedeDesde(f.desde));
  return c;
}

/** La oferta se puede hacer desde ese país: en remoto (desde ahí o desde cualquier sitio) o, si no es remota, está en ese país. */
function sePuedeDesde(pais: string): SQL {
  return or(
    and(eq(ofertas.modalidad, "remoto"), or(eq(ofertas.remotoMundo, true), arrayContains(ofertas.remotoPaises, [pais]))),
    and(ne(ofertas.modalidad, "remoto"), eq(ofertas.pais, pais)),
  )!;
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
    remotoMundo: o.remotoMundo,
    remotoPaises: o.remotoPaises,
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
  const condiciones = [...condicionesBase(db, filtros), pideSoloIdiomas(db, filtros.idiomas)];

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
    ...(filtros.despues
      ? { ocultasPorIdioma: {}, ocultasPorPais: 0, facetas: { area: {}, seniority: {}, modalidad: {} } }
      : await contarExtras(db, filtros)),
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
      recruiter: { estado: recruiters.estado, cargo: recruiters.cargo, empresa: recruiters.empresaNombre, nombre: usuarios.name },
    })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    // Si la publicó un recruiter verificado (y lo sigue siendo), sale quién es.
    .leftJoin(recruiters, eq(recruiters.userId, ofertas.autorId))
    .leftJoin(usuarios, eq(usuarios.id, ofertas.autorId))
    .where(and(eq(ofertas.id, id), eq(ofertas.estado, "publicada"), vigente()))
    .limit(1);
  if (!fila) return null;

  const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, id));
  return {
    ...aListado(fila.oferta, fila.empresa, idiomas),
    empresa: fila.empresa,
    descripcion: fila.oferta.descripcion,
    urlOriginal: fila.oferta.urlOriginal,
    autorizada: fila.oferta.autorizada,
    caducaEn: fila.oferta.caducaEn?.toISOString() ?? null,
    recruiter:
      fila.recruiter?.estado === "activo" && fila.recruiter.nombre
        ? { nombre: fila.recruiter.nombre, cargo: fila.recruiter.cargo!, empresa: fila.recruiter.empresa! }
        : null,
  };
}

/** Todas las ofertas que se ven en la bolsa, para el mapa del sitio: "<slug>-<id>" y última fecha. */
export async function mapaOfertas(db: Db): Promise<EntradaMapa[]> {
  const filas = await db
    .select({ id: ofertas.id, slug: ofertas.slug, actualizadaEn: ofertas.actualizadaEn })
    .from(ofertas)
    .where(and(eq(ofertas.estado, "publicada"), vigente()))
    .orderBy(desc(ofertas.publicadaEn))
    .limit(5000);
  return filas.map((f) => ({ ruta: `${f.slug}-${f.id}`, actualizadaEn: f.actualizadaEn.toISOString() }));
}

/** Lo que solo hace falta en la primera página: avisos de idiomas y recuentos de cada filtro. */
async function contarExtras(db: Db, filtros: FiltrosOfertas) {
  const [ocultasPorIdioma, ocultasPorPais, area, seniority, modalidad] = await Promise.all([
    contarOcultasPorIdioma(db, filtros),
    contarOcultasPorPais(db, filtros),
    contarPor(db, filtros, "area"),
    contarPor(db, filtros, "seniority"),
    contarPor(db, filtros, "modalidad"),
  ]);
  return {
    ocultasPorIdioma,
    ocultasPorPais,
    facetas: {
      area: area as Partial<Record<Area, number>>,
      seniority: seniority as Partial<Record<Seniority, number>>,
      modalidad: modalidad as Partial<Record<Modalidad, number>>,
    },
  };
}

/** Cuántas ofertas hay con cada valor de un grupo, con los demás filtros puestos. */
async function contarPor(db: Db, filtros: FiltrosOfertas, grupo: Exclude<Grupo, "desde">): Promise<Record<string, number>> {
  const columna = ofertas[grupo];
  const filas = await db
    .select({ valor: columna, total: count() })
    .from(ofertas)
    .where(and(...condicionesBase(db, filtros, grupo), pideSoloIdiomas(db, filtros.idiomas)))
    .groupBy(columna);
  return Object.fromEntries(filas.map((f) => [f.valor, Number(f.total)]));
}

/** Cuántas ofertas quedan fuera porque no se pueden hacer desde el país de quien busca. */
async function contarOcultasPorPais(db: Db, filtros: FiltrosOfertas): Promise<number> {
  if (!filtros.desde) return 0;
  const [{ total }] = await db
    .select({ total: count() })
    .from(ofertas)
    .where(and(...condicionesBase(db, filtros, "desde"), pideSoloIdiomas(db, filtros.idiomas), not(sePuedeDesde(filtros.desde))));
  return Number(total);
}

/** Cuántas ofertas quedan fuera por cada idioma que la persona no ha marcado. */
async function contarOcultasPorIdioma(db: Db, filtros: FiltrosOfertas) {
  const filas = await db
    .select({ idioma: ofertaIdiomas.idioma, total: countDistinct(ofertas.id) })
    .from(ofertas)
    .innerJoin(ofertaIdiomas, eq(ofertaIdiomas.ofertaId, ofertas.id))
    .where(and(...condicionesBase(db, filtros), notInArray(ofertaIdiomas.idioma, filtros.idiomas)))
    .groupBy(ofertaIdiomas.idioma);
  return Object.fromEntries(filas.map((f) => [f.idioma, Number(f.total)])) as Partial<Record<Idioma, number>>;
}
