import {
  COMPROBACIONES,
  esEmailDeLaEmpresa,
  nombreEmpresaComparable,
  slugEmpresa,
  slugOferta,
  validarOferta,
  detectarAts,
  type Comprobacion,
  type DatosOferta,
  type EmpresaStaff,
  type EstadoOferta,
  type OfertaStaff,
} from "@techtojob/shared";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas, recruiters, usuarios, type Oferta } from "../db/esquema";

/**
 * Lo que hace el staff con las ofertas: crear, editar, publicar (con comprobaciones),
 * rechazar, cerrar y alargar. Las ofertas que se crean aquí empiezan "pendientes".
 */

/** Días que una oferta sale en la bolsa desde que se publica (o se alarga). */
export const DIAS_PUBLICADA = 45;
const UN_DIA = 86_400_000;

export class ErrorStaff extends Error {
  constructor(
    public readonly codigo:
      | "no_encontrada"
      | "empresa"
      | "comprobaciones"
      | "motivo"
      | "estado"
      | "nombre"
      | "incompleta"
      | "resumen"
      | "ats",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Código corto para la dirección de la oferta: 8 letras y números. */
export function nuevoId(): string {
  const letras = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

export function aStaff(
  o: Oferta,
  empresa: OfertaStaff["empresa"],
  idiomas: Array<{ ofertaId: string; idioma: OfertaStaff["idioma"]; nivel: OfertaStaff["idiomasRequeridos"][number]["nivel"] }>,
  autor: { id: string | null; nombre: string | null; email: string | null } | null = null,
  recruiter: (Omit<NonNullable<NonNullable<OfertaStaff["autor"]>["recruiter"]>, "emailEmpresa"> & { web: string | null }) | null = null,
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
    remotoMundo: o.remotoMundo,
    remotoPaises: o.remotoPaises,
    salarioMin: o.salarioMin,
    salarioMax: o.salarioMax,
    moneda: o.moneda as OfertaStaff["moneda"],
    autorizada: o.autorizada,
    origen: o.origen,
    autor: autor?.id
      ? {
          id: autor.id,
          nombre: autor.nombre!,
          email: autor.email!,
          recruiter: recruiter?.cargo
            ? { cargo: recruiter.cargo, empresa: recruiter.empresa, linkedin: recruiter.linkedin, agencia: recruiter.agencia, estado: recruiter.estado, emailEmpresa: esEmailDeLaEmpresa(autor.email!, recruiter.web) }
            : null,
        }
      : null,
    fuenteAts: o.fuenteAts,
    descripcionOriginal: o.descripcionOriginal,
    idiomasRequeridos: idiomas.filter((i) => i.ofertaId === o.id).map(({ idioma, nivel }) => ({ idioma, nivel })),
    estado: o.estado,
    motivoRechazo: o.motivoRechazo,
    creadaEn: o.creadaEn.toISOString(),
    publicadaEn: o.publicadaEn?.toISOString() ?? null,
    caducaEn: o.caducaEn?.toISOString() ?? null,
    revisadaEn: o.revisadaEn?.toISOString() ?? null,
  };
}

export const columnasEmpresa = { id: empresas.id, nombre: empresas.nombre, slug: empresas.slug, web: empresas.web };
/** Quién subió la oferta (solo las de origen "usuario"; con leftJoin a usuarios y a recruiters). */
export const columnasAutor = { id: usuarios.id, nombre: usuarios.name, email: usuarios.email };
export const columnasRecruiter = {
  cargo: recruiters.cargo,
  empresa: recruiters.empresaNombre,
  web: recruiters.empresaWeb,
  linkedin: recruiters.linkedin,
  agencia: recruiters.agencia,
  estado: recruiters.estado,
};

export async function obtenerOfertaStaff(db: Db, id: string): Promise<OfertaStaff | null> {
  const [fila] = await db
    .select({ oferta: ofertas, empresa: columnasEmpresa, autor: columnasAutor, recruiter: columnasRecruiter })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .leftJoin(usuarios, eq(usuarios.id, ofertas.autorId))
    .leftJoin(recruiters, eq(recruiters.userId, ofertas.autorId))
    .where(eq(ofertas.id, id))
    .limit(1);
  if (!fila) return null;
  const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, id));
  return aStaff(fila.oferta, fila.empresa, idiomas, fila.autor, fila.recruiter as never);
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
    remotoMundo: d.remotoMundo,
    remotoPaises: d.remotoPaises,
    salarioMin: d.salarioMin,
    salarioMax: d.salarioMax,
    moneda: d.moneda,
    autorizada: d.autorizada,
  };
}

async function guardarIdiomas(db: Db, ofertaId: string, d: DatosOferta) {
  await db.delete(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, ofertaId));
  await db.insert(ofertaIdiomas).values(d.idiomasRequeridos.map((i) => ({ ofertaId, idioma: i.idioma, nivel: i.nivel })));
}

/**
 * Si el enlace de la oferta es de un ATS conocido (Greenhouse, Lever, Ashby, Teamtailor, Personio) y la empresa aún no tiene página de empleo,
 * se le pone: así, a partir de mañana, sus demás ofertas entran solas.
 */
async function aprenderPaginaEmpleo(db: Db, empresaId: string, urlOriginal: string) {
  const ats = detectarAts(urlOriginal);
  if (!ats) return;
  await db
    .update(empresas)
    .set({ ats: ats.ats, atsId: ats.id, atsRegion: ats.region ?? null, sincronizar: true })
    .where(and(eq(empresas.id, empresaId), isNull(empresas.ats), eq(empresas.bloqueada, false)));
}

/**
 * Crea una oferta pendiente de revisar. Devuelve su id.
 * `autorId`: la sube alguien desde la web (origen "usuario"). Entonces no se aprende la página de empleo
 * de la empresa (lo haría el staff al publicarla): cualquiera podría poner un enlace que no es suyo.
 */
export async function crearOferta(db: Db, d: DatosOferta, { autorId }: { autorId?: string } = {}): Promise<string> {
  const empresa = await empresaDe(db, d.empresaId);
  if (!autorId) await aprenderPaginaEmpleo(db, empresa.id, d.urlOriginal);
  const id = nuevoId();
  await db.insert(ofertas).values({
    id,
    slug: slugOferta(d.titulo, empresa.slug),
    ...columnasOferta(d),
    origen: autorId ? "usuario" : "manual",
    autorId: autorId ?? null,
    estado: "pendiente",
  });
  await guardarIdiomas(db, id, d);
  return id;
}

export async function editarOferta(db: Db, id: string, d: DatosOferta) {
  const actual = await obtenerOfertaStaff(db, id);
  if (!actual) throw new ErrorStaff("no_encontrada", "Esa oferta no existe.");
  const empresa = await empresaDe(db, d.empresaId);
  await aprenderPaginaEmpleo(db, empresa.id, d.urlOriginal);
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
  // Las automáticas llegan con huecos (p. ej. desde dónde se puede trabajar): hay que rellenarlos antes.
  if (validarOferta(actual).errores) {
    throw new ErrorStaff("incompleta", "Faltan datos de la oferta: edítala y rellena los campos marcados.");
  }
  // Si la subió alguien desde la web, al publicarla (ya revisada) se aprende la página de empleo de la empresa.
  if (actual.origen === "usuario") await aprenderPaginaEmpleo(db, actual.empresaId, actual.urlOriginal);
  // Una automática se puede publicar sin resumen: sale con sus datos (empresa, puesto, tecnologías,
  // desde dónde, idiomas) y el enlace a la web de la empresa. El texto original nunca se publica.
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

type FilaEmpresa = typeof empresas.$inferSelect;

function aEmpresaStaff(e: FilaEmpresa, numOfertas: number): EmpresaStaff {
  return {
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    web: e.web,
    ofertas: numOfertas,
    ats: e.ats,
    atsId: e.atsId,
    atsRegion: e.atsRegion,
    sincronizar: e.sincronizar,
    bloqueada: e.bloqueada,
    ultimaLectura: e.ultimaLectura?.toISOString() ?? null,
    ultimoError: e.ultimoError,
    origen: e.origen,
  };
}

export async function listarEmpresas(db: Db): Promise<EmpresaStaff[]> {
  const filas = await db
    .select({ empresa: empresas, ofertas: sql<number>`count(${ofertas.id})` })
    .from(empresas)
    .leftJoin(ofertas, eq(ofertas.empresaId, empresas.id))
    .groupBy(empresas.id)
    .orderBy(asc(empresas.nombre));
  return filas.map((f) => aEmpresaStaff(f.empresa, Number(f.ofertas)));
}

/** Lee el enlace a la página de empleo: "" o null la quita; si no es de un ATS conocido, error. */
function leerPaginaEmpleo(valor: unknown) {
  if (valor === undefined) return undefined;
  if (valor === null || (typeof valor === "string" && !valor.trim())) return { ats: null, atsId: null, atsRegion: null };
  const ats = typeof valor === "string" ? detectarAts(valor) : null;
  if (!ats) throw new ErrorStaff("ats", "Ese enlace no es de una página de empleo de Greenhouse, Lever, Ashby, Teamtailor, Personio, Workable, Recruitee o SmartRecruiters.");
  return { ats: ats.ats, atsId: ats.id, atsRegion: ats.region ?? null };
}

/**
 * Crea una empresa. Si ya hay una con el mismo nombre (sin contar mayúsculas, acentos ni "S.L."), devuelve esa.
 * `paginaEmpleo` (opcional): el enlace a su página de empleo en Greenhouse, Lever, Ashby, Teamtailor, Personio, Workable, Recruitee o SmartRecruiters; si viene, se leen sus ofertas cada día.
 */
export async function crearEmpresa(
  db: Db,
  entrada: { nombre?: unknown; web?: unknown; paginaEmpleo?: unknown },
): Promise<EmpresaStaff> {
  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 80) throw new ErrorStaff("nombre", "El nombre de la empresa tiene que tener entre 2 y 80 caracteres.");
  const web = typeof entrada.web === "string" && /^https?:\/\//.test(entrada.web.trim()) ? entrada.web.trim() : null;
  const pagina = leerPaginaEmpleo(entrada.paginaEmpleo);

  // "Teide Software, S.L." y "teide software" son la misma: se devuelve la que ya hay.
  const comparable = nombreEmpresaComparable(nombre);
  const existente = (await db.select().from(empresas)).find((e) => nombreEmpresaComparable(e.nombre) === comparable);
  if (existente) {
    // Si no tenía página de empleo y ahora llega una, se le pone.
    if (pagina?.ats && !existente.ats) return configurarEmpresa(db, existente.id, { paginaEmpleo: entrada.paginaEmpleo });
    return aEmpresaStaff(existente, 0);
  }

  const base = slugEmpresa(nombre);
  const usados = new Set(
    (await db.select({ slug: empresas.slug }).from(empresas).where(sql`${empresas.slug} like ${`${base}%`}`)).map((e) => e.slug),
  );
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;

  const [nueva] = await db
    .insert(empresas)
    .values({ id: `emp-${nuevoId()}`, nombre, slug, web, ...pagina, sincronizar: Boolean(pagina?.ats) })
    .returning();
  return aEmpresaStaff(nueva!, 0);
}

/**
 * Cambia la página de empleo de una empresa, si se leen sus ofertas cada día (`sincronizar`)
 * y si está en la lista de "no publicar" (`bloqueada`).
 */
export async function configurarEmpresa(
  db: Db,
  id: string,
  entrada: { paginaEmpleo?: unknown; sincronizar?: unknown; bloqueada?: unknown },
): Promise<EmpresaStaff> {
  const [actual] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
  if (!actual) throw new ErrorStaff("empresa", "Esa empresa no existe.");
  const pagina = leerPaginaEmpleo(entrada.paginaEmpleo);
  const cambios: Partial<FilaEmpresa> = { ...pagina, actualizadaEn: new Date() };
  if (pagina) {
    cambios.ultimaLectura = null;
    cambios.ultimoError = null;
    if (pagina.ats && entrada.sincronizar === undefined) cambios.sincronizar = true;
  }
  if (typeof entrada.sincronizar === "boolean") cambios.sincronizar = entrada.sincronizar;
  // Al reactivarla, se empieza de cero con los errores.
  if (cambios.sincronizar && !actual.sincronizar) {
    cambios.erroresSeguidos = 0;
    cambios.ultimoError = null;
  }
  if (typeof entrada.bloqueada === "boolean") cambios.bloqueada = entrada.bloqueada;
  // Sin página de empleo no hay nada que leer.
  if ((pagina ? pagina.ats : actual.ats) === null) cambios.sincronizar = false;
  // Una empresa bloqueada no se lee.
  if (cambios.bloqueada ?? actual.bloqueada) cambios.sincronizar = false;

  const [fila] = await db.update(empresas).set(cambios).where(eq(empresas.id, id)).returning();
  // Si la bloqueamos, sus ofertas automáticas pendientes se descartan.
  if (cambios.bloqueada && !actual.bloqueada) {
    await db
      .update(ofertas)
      .set({ estado: "rechazada", motivoRechazo: "La empresa no quiere que publiquemos sus ofertas." })
      .where(sql`${ofertas.empresaId} = ${id} and ${ofertas.estado} = 'pendiente' and ${ofertas.origen} = 'automatica'`);
  }
  const [{ n }] = await db.select({ n: count() }).from(ofertas).where(eq(ofertas.empresaId, id));
  return aEmpresaStaff(fila!, Number(n));
}

