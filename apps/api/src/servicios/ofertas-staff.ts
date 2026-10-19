import {
  COMPROBACIONES,
  slugEmpresa,
  slugOferta,
  type Comprobacion,
  type DatosOferta,
  type EmpresaStaff,
  type EstadoOferta,
  type OfertaStaff,
} from "@techtojob/shared";
import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas, type Oferta } from "../db/esquema";

/**
 * Lo que hace el staff con las ofertas: crear, editar, publicar (con comprobaciones),
 * rechazar, cerrar y alargar. Las ofertas que se crean aquí empiezan "pendientes".
 */

/** Días que una oferta sale en la bolsa desde que se publica (o se alarga). */
export const DIAS_PUBLICADA = 45;
const UN_DIA = 86_400_000;

export class ErrorStaff extends Error {
  constructor(
    public readonly codigo: "no_encontrada" | "empresa" | "comprobaciones" | "motivo" | "estado" | "nombre",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Código corto para la dirección de la oferta: 8 letras y números. */
function nuevoId(): string {
  const letras = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

function aStaff(
  o: Oferta,
  empresa: OfertaStaff["empresa"],
  idiomas: Array<{ ofertaId: string; idioma: OfertaStaff["idioma"]; nivel: OfertaStaff["idiomasRequeridos"][number]["nivel"] }>,
): OfertaStaff {
  return {
    id: o.id,
    slug: o.slug,
    empresaId: o.empresaId,
    empresa,
    titulo: o.titulo,
    resumen: o.resumen,
    descripcion: o.descripcion,
    idioma: o.idioma,
    urlOriginal: o.urlOriginal,
    area: o.area,
    seniority: o.seniority,
    modalidad: o.modalidad,
    tecnologias: o.tecnologias,
    pais: o.pais,
    ciudad: o.ciudad,
    remotoDesde: o.remotoDesde as OfertaStaff["remotoDesde"],
    salarioMin: o.salarioMin,
    salarioMax: o.salarioMax,
    moneda: o.moneda as OfertaStaff["moneda"],
    idiomasRequeridos: idiomas.filter((i) => i.ofertaId === o.id).map(({ idioma, nivel }) => ({ idioma, nivel })),
    estado: o.estado,
    motivoRechazo: o.motivoRechazo,
    creadaEn: o.creadaEn.toISOString(),
    publicadaEn: o.publicadaEn?.toISOString() ?? null,
    caducaEn: o.caducaEn?.toISOString() ?? null,
    revisadaEn: o.revisadaEn?.toISOString() ?? null,
  };
}

const columnasEmpresa = { id: empresas.id, nombre: empresas.nombre, slug: empresas.slug, web: empresas.web };

/** Ofertas de un estado. Las pendientes, de la más antigua a la más nueva (primero lo que más lleva esperando). */
export async function listarOfertasStaff(db: Db, estado: EstadoOferta): Promise<OfertaStaff[]> {
  const filas = await db
    .select({ oferta: ofertas, empresa: columnasEmpresa })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(eq(ofertas.estado, estado))
    .orderBy(estado === "pendiente" ? asc(ofertas.creadaEn) : desc(ofertas.actualizadaEn))
    .limit(200);
  const ids = filas.map((f) => f.oferta.id);
  const idiomas = ids.length ? await db.select().from(ofertaIdiomas).where(inArray(ofertaIdiomas.ofertaId, ids)) : [];
  return filas.map((f) => aStaff(f.oferta, f.empresa, idiomas));
}

/** Cuántas ofertas hay en cada estado (para las pestañas del panel). */
export async function contarPorEstado(db: Db): Promise<Partial<Record<EstadoOferta, number>>> {
  const filas = await db.select({ estado: ofertas.estado, total: count() }).from(ofertas).groupBy(ofertas.estado);
  return Object.fromEntries(filas.map((f) => [f.estado, Number(f.total)]));
}

export async function obtenerOfertaStaff(db: Db, id: string): Promise<OfertaStaff | null> {
  const [fila] = await db
    .select({ oferta: ofertas, empresa: columnasEmpresa })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(eq(ofertas.id, id))
    .limit(1);
  if (!fila) return null;
  const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, id));
  return aStaff(fila.oferta, fila.empresa, idiomas);
}

async function empresaDe(db: Db, empresaId: string) {
  const [empresa] = await db.select(columnasEmpresa).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  if (!empresa) throw new ErrorStaff("empresa", "Esa empresa no existe.");
  return empresa;
}

function columnasOferta(d: DatosOferta) {
  return {
    empresaId: d.empresaId,
    titulo: d.titulo,
    resumen: d.resumen,
    descripcion: d.descripcion,
    idioma: d.idioma,
    urlOriginal: d.urlOriginal,
    area: d.area,
    seniority: d.seniority,
    modalidad: d.modalidad,
    tecnologias: d.tecnologias,
    pais: d.pais,
    ciudad: d.ciudad,
    remotoDesde: d.remotoDesde,
    salarioMin: d.salarioMin,
    salarioMax: d.salarioMax,
    moneda: d.moneda,
  };
}

async function guardarIdiomas(db: Db, ofertaId: string, d: DatosOferta) {
  await db.delete(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, ofertaId));
  await db.insert(ofertaIdiomas).values(d.idiomasRequeridos.map((i) => ({ ofertaId, idioma: i.idioma, nivel: i.nivel })));
}

/** Crea una oferta pendiente de revisar. Devuelve su id. */
export async function crearOferta(db: Db, d: DatosOferta): Promise<string> {
  const empresa = await empresaDe(db, d.empresaId);
  const id = nuevoId();
  await db.insert(ofertas).values({
    id,
    slug: slugOferta(d.titulo, empresa.slug),
    ...columnasOferta(d),
    origen: "manual",
    estado: "pendiente",
  });
  await guardarIdiomas(db, id, d);
  return id;
}

export async function editarOferta(db: Db, id: string, d: DatosOferta) {
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  const empresa = await empresaDe(db, d.empresaId);
  await db
    .update(ofertas)
    .set({ ...columnasOferta(d), slug: slugOferta(d.titulo, empresa.slug) })
    .where(eq(ofertas.id, id));
  await guardarIdiomas(db, id, d);
}

/** Publica (o vuelve a publicar) una oferta. Hay que marcar todas las comprobaciones. */
export async function publicarOferta(db: Db, id: string, staffId: string, marcadas: unknown) {
  const ok = Array.isArray(marcadas) && COMPROBACIONES.every((c) => (marcadas as Comprobacion[]).includes(c));
  if (!ok) throw new ErrorStaff("comprobaciones", "Marca todas las comprobaciones antes de publicar.");
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  const ahora = new Date();
  await db
    .update(ofertas)
    .set({
      estado: "publicada",
      motivoRechazo: null,
      // Si ya se había publicado antes, conserva su fecha (no "salta" al principio del listado).
      publicadaEn: actual.publicadaEn ? new Date(actual.publicadaEn) : ahora,
      revisadaPor: staffId,
      revisadaEn: ahora,
      caducaEn: new Date(ahora.getTime() + DIAS_PUBLICADA * UN_DIA),
    })
    .where(eq(ofertas.id, id));
}

export async function rechazarOferta(db: Db, id: string, staffId: string, motivo: unknown) {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 3 || texto.length > 300) throw new ErrorStaff("motivo", "Escribe por qué se rechaza (3–300 caracteres).");
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  await db
    .update(ofertas)
    .set({ estado: "rechazada", motivoRechazo: texto, revisadaPor: staffId, revisadaEn: new Date() })
    .where(eq(ofertas.id, id));
}

/** Deja de salir en la bolsa (la empresa ya no busca, o el enlace ya no funciona). */
export async function cerrarOferta(db: Db, id: string, staffId: string) {
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  await db
    .update(ofertas)
    .set({ estado: "cerrada", revisadaPor: staffId, revisadaEn: new Date() })
    .where(eq(ofertas.id, id));
}

/** 45 días más desde hoy (o desde que caducaba, si aún no había caducado). */
export async function alargarOferta(db: Db, id: string) {
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  if (actual.estado !== "publicada") throw new ErrorStaff("estado", "Solo se pueden alargar ofertas publicadas.");
  const desde = Math.max(Date.now(), actual.caducaEn ? new Date(actual.caducaEn).getTime() : 0);
  await db
    .update(ofertas)
    .set({ caducaEn: new Date(desde + DIAS_PUBLICADA * UN_DIA) })
    .where(eq(ofertas.id, id));
}

export async function listarEmpresas(db: Db): Promise<EmpresaStaff[]> {
  const filas = await db
    .select({ ...columnasEmpresa, ofertas: sql<number>`count(${ofertas.id})` })
    .from(empresas)
    .leftJoin(ofertas, eq(ofertas.empresaId, empresas.id))
    .groupBy(empresas.id)
    .orderBy(asc(empresas.nombre));
  return filas.map((f) => ({ ...f, ofertas: Number(f.ofertas) }));
}

/** Crea una empresa. Si ya hay una con el mismo nombre (sin contar mayúsculas), devuelve esa. */
export async function crearEmpresa(db: Db, entrada: { nombre?: unknown; web?: unknown }): Promise<EmpresaStaff> {
  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 80) throw new ErrorStaff("nombre", "El nombre de la empresa tiene que tener entre 2 y 80 caracteres.");
  const web = typeof entrada.web === "string" && /^https?:\/\//.test(entrada.web.trim()) ? entrada.web.trim() : null;

  const [existente] = await db.select(columnasEmpresa).from(empresas).where(sql`lower(${empresas.nombre}) = lower(${nombre})`).limit(1);
  if (existente) return { ...existente, ofertas: 0 };

  const base = slugEmpresa(nombre);
  const usados = new Set(
    (await db.select({ slug: empresas.slug }).from(empresas).where(sql`${empresas.slug} like ${`${base}%`}`)).map((e) => e.slug),
  );
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;

  const nueva = { id: `emp-${nuevoId()}`, nombre, slug, web };
  await db.insert(empresas).values(nueva);
  return { ...nueva, ofertas: 0 };
}

