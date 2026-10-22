import {
  enlaceComparable,
  LIMITE_OFERTAS_USUARIO,
  slugOferta,
  type DatosOfertaUsuario,
  type MiOferta,
  type MiOfertaEntera,
  type MisOfertas,
  type OfertaImportada,
} from "@techtojob/shared";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../db/esquema";
import { buscarRepetida, importarOferta, type Pedir } from "./importar";
import { columnasOferta, crearEmpresa, crearOferta, guardarIdiomas, nuevoId } from "./ofertas-staff";
import { enlazarEmpresa, recruiterActivo } from "./recruiters";

/**
 * Ofertas que suben los recruiters desde la web (ver recruiters.ts). Entran pendientes
 * (origen "usuario") y las revisa el staff como las demás. Cada recruiter puede tener LIMITE_OFERTAS_USUARIO
 * a la vez: las pendientes y las publicadas que no han caducado. Las rechazadas, caducadas o retiradas no cuentan.
 * Un recruiter publica solo ofertas de su empresa; si el staff lo marcó como agencia, de cualquiera.
 */

export class ErrorMisOfertas extends Error {
  constructor(
    public readonly codigo: "limite" | "repetida" | "empresa" | "no_encontrada" | "estado" | "no_recruiter",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Motivo que se guarda al retirar una publicada (así se distingue de una cerrada por el staff). */
export const MOTIVO_RETIRADA = "Retirada por quien la subió.";

const enMarcha = (ahora: Date) =>
  or(eq(ofertas.estado, "pendiente"), and(eq(ofertas.estado, "publicada"), or(isNull(ofertas.caducaEn), gt(ofertas.caducaEn, ahora))));

export async function contarEnMarcha(db: Db, userId: string, ahora = new Date()): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(ofertas)
    .where(and(eq(ofertas.autorId, userId), enMarcha(ahora)));
  return Number(n);
}

function estadoParaAutor(o: { estado: string; caducaEn: Date | null; motivoRechazo: string | null }, ahora: Date): MiOferta["estado"] {
  if (o.estado === "publicada") return o.caducaEn && o.caducaEn <= ahora ? "caducada" : "publicada";
  if (o.estado === "cerrada") return o.motivoRechazo === MOTIVO_RETIRADA ? "retirada" : "caducada";
  return o.estado as MiOferta["estado"];
}

export async function listarMisOfertas(db: Db, userId: string, ahora = new Date()): Promise<MisOfertas> {
  const filas = await db
    .select({
      id: ofertas.id,
      slug: ofertas.slug,
      titulo: ofertas.titulo,
      empresa: empresas.nombre,
      estado: ofertas.estado,
      motivoRechazo: ofertas.motivoRechazo,
      creadaEn: ofertas.creadaEn,
      publicadaEn: ofertas.publicadaEn,
      caducaEn: ofertas.caducaEn,
    })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(eq(ofertas.autorId, userId))
    .orderBy(desc(ofertas.creadaEn), desc(ofertas.id));
  const lista: MiOferta[] = filas.map((o) => {
    const estado = estadoParaAutor(o, ahora);
    return {
      id: o.id,
      slug: o.slug,
      titulo: o.titulo,
      empresa: o.empresa,
      estado,
      // El motivo solo se enseña si la rechazó el staff.
      motivoRechazo: estado === "rechazada" ? o.motivoRechazo : null,
      creadaEn: o.creadaEn.toISOString(),
      publicadaEn: o.publicadaEn?.toISOString() ?? null,
      caducaEn: o.caducaEn?.toISOString() ?? null,
    };
  });
  return {
    ofertas: lista,
    limite: LIMITE_OFERTAS_USUARIO,
    enMarcha: lista.filter((o) => o.estado === "pendiente" || o.estado === "publicada").length,
  };
}

/** Solo los recruiters (activos) pueden subir ofertas. */
export async function exigirRecruiter(db: Db, userId: string) {
  const r = await recruiterActivo(db, userId);
  if (!r) throw new ErrorMisOfertas("no_recruiter", "Solo los recruiters pueden publicar ofertas.");
  return r;
}

/** Sube una oferta (ya validada con validarOfertaUsuario). Devuelve su id. */
export async function subirOferta(db: Db, userId: string, d: DatosOfertaUsuario): Promise<string> {
  const recruiter = await exigirRecruiter(db, userId);
  if ((await contarEnMarcha(db, userId)) >= LIMITE_OFERTAS_USUARIO) {
    throw new ErrorMisOfertas("limite", `Puedes tener ${LIMITE_OFERTAS_USUARIO} ofertas a la vez. Retira una o espera a que caduque.`);
  }
  // Si esa oferta ya está en la bolsa (o pendiente de revisar), no se repite.
  const repetida = await buscarRepetida(db, d.urlOriginal);
  if (repetida && repetida.estado !== "rechazada" && repetida.estado !== "cerrada") {
    throw new ErrorMisOfertas("repetida", "Esa oferta ya está en TechToJob.");
  }
  // La empresa: la suya (la de su registro; se enlaza con la bolsa en su primera oferta).
  // Una agencia escribe la de cada oferta. Si ya existe (mismo nombre sin contar "S.L.", mayúsculas ni acentos), esa.
  let empresaId: string;
  if (recruiter.agencia) {
    const empresa = await crearEmpresa(db, { nombre: d.empresa.nombre, web: d.empresa.web });
    if (empresa.bloqueada) throw new ErrorMisOfertas("empresa", "Esa empresa nos ha pedido que no publiquemos sus ofertas.");
    empresaId = empresa.id;
  } else {
    const [enlazada] = recruiter.empresaId
      ? await db.select({ id: empresas.id, bloqueada: empresas.bloqueada }).from(empresas).where(eq(empresas.id, recruiter.empresaId))
      : [];
    const empresa = enlazada ?? (await crearEmpresa(db, { nombre: recruiter.empresaNombre, web: recruiter.empresaWeb }));
    if (empresa.bloqueada) throw new ErrorMisOfertas("empresa", "Esa empresa nos ha pedido que no publiquemos sus ofertas.");
    if (!enlazada) await enlazarEmpresa(db, userId, empresa.id);
    empresaId = empresa.id;
  }
  const { empresa: _e, ...resto } = d;
  // La sube alguien de la empresa que dice tener permiso: cuenta como autorizada (sale su descripción
  // y va a Google for Jobs). El staff lo puede desmarcar al revisarla.
  return crearOferta(db, { ...resto, empresaId, autorizada: true }, { autorId: userId });
}

/**
 * Quitar una oferta propia. Si aún no la había revisado nadie, se borra (y deja hueco).
 * Si ya estaba publicada, deja de salir ("cerrada", con el motivo MOTIVO_RETIRADA).
 */
export async function retirarOferta(db: Db, userId: string, id: string) {
  const [o] = await db
    .select({ estado: ofertas.estado })
    .from(ofertas)
    .where(and(eq(ofertas.id, id), eq(ofertas.autorId, userId)))
    .limit(1);
  if (!o) throw new ErrorMisOfertas("no_encontrada", "Esa oferta no existe.");
  if (o.estado === "pendiente") {
    await db.delete(ofertas).where(eq(ofertas.id, id));
    return;
  }
  if (o.estado !== "publicada") throw new ErrorMisOfertas("estado", "Esa oferta ya no está en marcha.");
  await db.update(ofertas).set({ estado: "cerrada", motivoRechazo: MOTIVO_RETIRADA }).where(eq(ofertas.id, id));
}

/** Una oferta mía entera (para editarla o volver a publicarla). */
export async function obtenerMiOferta(db: Db, userId: string, id: string, ahora = new Date()): Promise<MiOfertaEntera> {
  const [fila] = await db
    .select({ o: ofertas, empresa: { nombre: empresas.nombre, web: empresas.web } })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(and(eq(ofertas.id, id), eq(ofertas.autorId, userId)))
    .limit(1);
  if (!fila) throw new ErrorMisOfertas("no_encontrada", "Esa oferta no existe.");
  const { o } = fila;
  const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, id));
  return {
    id: o.id,
    estado: estadoParaAutor(o, ahora),
    empresa: fila.empresa,
    titulo: o.titulo,
    resumen: o.resumen,
    descripcion: o.descripcion,
    responsabilidades: o.responsabilidades,
    requisitos: o.requisitos,
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
    moneda: o.moneda as MiOfertaEntera["moneda"],
    idiomasRequeridos: idiomas.map(({ idioma, nivel }) => ({ idioma, nivel })),
  };
}

/** La empresa de una oferta de este recruiter: la suya (o, si es agencia, la que escribe). */
async function empresaDelRecruiter(db: Db, userId: string, recruiter: Awaited<ReturnType<typeof exigirRecruiter>>, d: DatosOfertaUsuario) {
  if (recruiter.agencia) {
    const empresa = await crearEmpresa(db, { nombre: d.empresa.nombre, web: d.empresa.web });
    if (empresa.bloqueada) throw new ErrorMisOfertas("empresa", "Esa empresa nos ha pedido que no publiquemos sus ofertas.");
    return empresa.id;
  }
  const [enlazada] = recruiter.empresaId
    ? await db.select({ id: empresas.id, bloqueada: empresas.bloqueada }).from(empresas).where(eq(empresas.id, recruiter.empresaId))
    : [];
  const empresa = enlazada ?? (await crearEmpresa(db, { nombre: recruiter.empresaNombre, web: recruiter.empresaWeb }));
  if (empresa.bloqueada) throw new ErrorMisOfertas("empresa", "Esa empresa nos ha pedido que no publiquemos sus ofertas.");
  if (!enlazada) await enlazarEmpresa(db, userId, empresa.id);
  return empresa.id;
}

/**
 * Editar una oferta mía que está en marcha.
 * - Pendiente: se cambia y sigue pendiente.
 * - Publicada: sigue publicada con los cambios, y el staff la vuelve a mirar (atajo "Editadas").
 *   Si cambia el enlace, vuelve a revisión (pendiente): el enlace es a donde se manda a la gente.
 * Devuelve el estado en que queda.
 */
export async function editarMiOferta(db: Db, userId: string, id: string, d: DatosOfertaUsuario, ahora = new Date()) {
  const recruiter = await exigirRecruiter(db, userId);
  const [actual] = await db.select().from(ofertas).where(and(eq(ofertas.id, id), eq(ofertas.autorId, userId))).limit(1);
  if (!actual) throw new ErrorMisOfertas("no_encontrada", "Esa oferta no existe.");
  const estado = estadoParaAutor(actual, ahora);
  if (estado !== "pendiente" && estado !== "publicada") throw new ErrorMisOfertas("estado", "Esa oferta ya no está en marcha: vuelve a publicarla.");
  const cambiaEnlace = enlaceComparable(actual.urlOriginal) !== enlaceComparable(d.urlOriginal);
  if (cambiaEnlace) {
    const repetida = await buscarRepetida(db, d.urlOriginal, id);
    if (repetida && repetida.estado !== "rechazada" && repetida.estado !== "cerrada") {
      throw new ErrorMisOfertas("repetida", "Esa oferta ya está en TechToJob.");
    }
  }
  const empresaId = recruiter.agencia ? await empresaDelRecruiter(db, userId, recruiter, d) : actual.empresaId;
  const [empresa] = await db.select({ slug: empresas.slug }).from(empresas).where(eq(empresas.id, empresaId));
  const { empresa: _e, ...resto } = d;
  const vuelveARevision = estado === "publicada" && cambiaEnlace;
  await db
    .update(ofertas)
    .set({
      ...columnasOferta({ ...resto, empresaId, autorizada: actual.autorizada }),
      slug: slugOferta(d.titulo, empresa!.slug),
      ...(vuelveARevision ? { estado: "pendiente" as const, editadaEn: null } : estado === "publicada" ? { editadaEn: ahora } : {}),
    })
    .where(eq(ofertas.id, id));
  await guardarIdiomas(db, id, d);
  return vuelveARevision ? "pendiente" : estado;
}

/**
 * Volver a publicar una oferta mía que ya no está en marcha (caducada, retirada o no publicada):
 * se crea una copia pendiente de revisar (cuenta para el límite). Devuelve el id de la copia.
 */
export async function volverAPublicar(db: Db, userId: string, id: string, ahora = new Date()): Promise<string> {
  const recruiter = await exigirRecruiter(db, userId);
  const vieja = await obtenerMiOferta(db, userId, id, ahora);
  if (vieja.estado === "pendiente" || vieja.estado === "publicada") throw new ErrorMisOfertas("estado", "Esa oferta sigue en marcha.");
  if ((await contarEnMarcha(db, userId, ahora)) >= LIMITE_OFERTAS_USUARIO) {
    throw new ErrorMisOfertas("limite", `Puedes tener ${LIMITE_OFERTAS_USUARIO} ofertas a la vez. Retira una o espera a que caduque.`);
  }
  const [actual] = await db.select().from(ofertas).where(eq(ofertas.id, id));
  const d: DatosOfertaUsuario = { ...vieja, empresa: vieja.empresa };
  // La empresa: la de ahora del recruiter (si cambió de trabajo, la nueva); una agencia, la de la oferta.
  const empresaId = recruiter.agencia ? actual!.empresaId : await empresaDelRecruiter(db, userId, recruiter, d);
  const [empresa] = await db.select({ slug: empresas.slug }).from(empresas).where(eq(empresas.id, empresaId));
  const { empresa: _e, id: _i, estado: _s, ...resto } = vieja;
  const nueva = nuevoId();
  await db.insert(ofertas).values({
    id: nueva,
    slug: slugOferta(vieja.titulo, empresa!.slug),
    ...columnasOferta({ ...resto, empresaId, autorizada: actual!.autorizada }),
    origen: "usuario",
    autorId: userId,
    estado: "pendiente",
  });
  await guardarIdiomas(db, nueva, vieja);
  return nueva;
}

/**
 * "Rellenar desde el enlace" para un recruiter. Como el del staff, pero sin datos internos:
 * de la repetida solo se dice si ya está en la bolsa (no su id ni si está pendiente o rechazada).
 * Si no es agencia, la empresa no se toca (es siempre la suya).
 */
export async function importarParaUsuario(db: Db, userId: string, url: string, pedir?: Pedir): Promise<OfertaImportada> {
  const recruiter = await exigirRecruiter(db, userId);
  const r = await importarOferta(db, url, pedir);
  if (!recruiter.agencia) delete r.empresa;
  const repetida = r.repetida && (r.repetida.estado === "publicada" || r.repetida.estado === "pendiente") ? r.repetida : null;
  return {
    ...r,
    repetida: repetida ? { id: "", titulo: repetida.titulo, empresa: repetida.empresa, estado: "publicada" } : null,
    ...(r.empresa && { empresa: { id: null, nombre: r.empresa.nombre, web: r.empresa.web } }),
  };
}
