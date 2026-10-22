import {
  DIAS_PARA_CONTAR_MEGUSTA,
  LIMITES_PROYECTO,
  mesDe,
  portadaGithub,
  PROYECTOS_POR_PAGINA,
  slugProyecto,
  type DatosProyecto,
  type FiltrosProyectos,
  type ProyectoListado,
  type ReporteProyecto,
  type ResultadoProyectos,
} from "@techtojob/shared";
import { and, arrayOverlaps, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { estadoDiscord, megustaProyectos, perfiles, proyectos, reportes, usuarios } from "../db/esquema";
import { fotosDe } from "./fotos";
import { nuevoId } from "./ofertas-staff";
import type { Visitante } from "./talento";
import { fotoElegida } from "@techtojob/shared";

/**
 * Proyectos de la comunidad y sus me gusta.
 * - Subir: hace falta perfil de talento y estar verificado (Discord vinculado y en el servidor).
 * - Me gusta: con sesión, uno por persona, nunca al propio. Los de cuentas con menos de
 *   DIAS_PARA_CONTAR_MEGUSTA días no cuentan (ni en el número ni en los rankings), contra trampas.
 * - Se ven si el perfil de su autor se ve (público, o "solo registrados" con sesión) y no está oculto por el staff.
 */

export class ErrorProyecto extends Error {
  constructor(
    public readonly codigo: "no_existe" | "sin_perfil" | "sin_verificar" | "propio" | "fijados" | "demasiados" | "este_mes" | "motivo",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Me gusta que cuentan: de cuentas con unos días (y, si se da, dentro de [desde, hasta)). */
// La tabla va escrita entera: en las consultas de una sola tabla, drizzle no la pone y la columna
// se confundiría con la de dentro de la subconsulta.
function megustaQueCuentanProyecto(desde?: SQL, hasta?: SQL) {
  return sql<number>`(
    select count(*) from ${megustaProyectos} m join ${usuarios} u on u.id = m.usuario_id
    where m.proyecto_id = "proyectos"."id"
      and u.creado_en <= now() - make_interval(days => ${DIAS_PARA_CONTAR_MEGUSTA})
      ${desde ? sql`and m.creado_en >= ${desde}` : sql``}
      ${hasta ? sql`and m.creado_en < ${hasta}` : sql``}
  )`;
}

/** Inicio del mes "2026-10" en España. */
export const inicioMes = (mes: string) => sql`(${`${mes}-01`}::timestamp at time zone 'Europe/Madrid')`;

/** Perfiles que puede ver quien mira (como en Talento). */
export const perfilVisible = (visitante: Visitante): SQL =>
  visitante ? inArray(perfiles.visibilidad, ["publico", "registrados"]) : eq(perfiles.visibilidad, "publico");

export const verificado = (userId: string) =>
  sql<boolean>`exists (select 1 from ${estadoDiscord} where ${estadoDiscord.userId} = ${userId} and ${estadoDiscord.enServidor} = true)`;

const columnas = {
  p: proyectos,
  autor: { alias: perfiles.alias, nombre: perfiles.nombre, foto: perfiles.foto, disponibilidad: perfiles.disponibilidad },
  megusta: megustaQueCuentanProyecto(),
};

type Fila = { p: typeof proyectos.$inferSelect; autor: { alias: string; nombre: string; foto: "google" | "github" | "ninguna"; disponibilidad: ProyectoListado["autor"]["disponibilidad"] }; megusta: number; periodo?: number };

async function aListado(db: Db, filas: Fila[], visitante: Visitante): Promise<ProyectoListado[]> {
  if (!filas.length) return [];
  const ids = filas.map((f) => f.p.id);
  const [fotos, mios] = await Promise.all([
    fotosDe(db, [...new Set(filas.map((f) => f.p.userId))]),
    visitante
      ? db.select({ id: megustaProyectos.proyectoId }).from(megustaProyectos).where(and(eq(megustaProyectos.userId, visitante.id), inArray(megustaProyectos.proyectoId, ids)))
      : Promise.resolve([]),
  ]);
  const gustados = new Set(mios.map((m) => m.id));
  return filas.map(({ p, autor, megusta, periodo }) => ({
    id: p.id,
    slug: slugProyecto(p.titulo),
    titulo: p.titulo,
    descripcion: p.descripcion,
    area: p.area,
    tecnologias: p.tecnologias,
    repo: p.repo,
    demo: p.demo,
    video: p.video,
    estado: p.estado,
    portada: portadaGithub(p.repo),
    autor: { alias: autor.alias, nombre: autor.nombre, imagen: fotoElegida(autor.foto, fotos.get(p.userId)!), disponibilidad: autor.disponibilidad },
    megusta: Number(megusta),
    ...(periodo !== undefined && { megustaPeriodo: Number(periodo) }),
    meGusta: gustados.has(p.id),
    fijado: p.fijado,
    oculto: p.oculto,
    esMio: visitante?.id === p.userId,
    creadoEn: p.creadaEn.toISOString(),
  }));
}

export async function listarProyectos(db: Db, f: FiltrosProyectos, visitante: Visitante, ahora = new Date()): Promise<ResultadoProyectos> {
  const mes = f.mes ?? mesDe(ahora);
  const c: SQL[] = [eq(proyectos.oculto, false), perfilVisible(visitante)];
  if (f.areas.length) c.push(inArray(proyectos.area, f.areas));
  if (f.tecnologias.length) c.push(arrayOverlaps(proyectos.tecnologias, f.tecnologias));
  if (f.q) {
    const patron = `%${f.q.replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    c.push(or(ilike(proyectos.titulo, patron), ilike(proyectos.descripcion, patron), ilike(perfiles.nombre, patron))!);
  }
  const periodo =
    f.orden === "mes" ? megustaQueCuentanProyecto(inicioMes(mes), sql`${inicioMes(mes)} + interval '1 month'`) : f.orden === "tendencia" ? megustaQueCuentanProyecto(sql`now() - interval '7 days'`) : null;
  const orden =
    f.orden === "nuevos"
      ? [desc(proyectos.creadaEn), desc(proyectos.id)]
      : [desc(periodo ?? columnas.megusta), desc(columnas.megusta), desc(proyectos.creadaEn), desc(proyectos.id)];
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({ ...columnas, ...(periodo && { periodo }) })
      .from(proyectos)
      .innerJoin(perfiles, eq(perfiles.userId, proyectos.userId))
      .where(and(...c))
      .orderBy(...orden)
      .limit(PROYECTOS_POR_PAGINA + 1)
      .offset((f.pagina - 1) * PROYECTOS_POR_PAGINA),
    db.select({ total: count() }).from(proyectos).innerJoin(perfiles, eq(perfiles.userId, proyectos.userId)).where(and(...c)),
  ]);
  return {
    proyectos: await aListado(db, filas.slice(0, PROYECTOS_POR_PAGINA) as Fila[], visitante),
    total: Number(total),
    pagina: f.pagina,
    hayMas: filas.length > PROYECTOS_POR_PAGINA,
    mes,
  };
}

async function fila(db: Db, id: string): Promise<Fila | null> {
  const [f] = await db.select(columnas).from(proyectos).innerJoin(perfiles, eq(perfiles.userId, proyectos.userId)).where(eq(proyectos.id, id)).limit(1);
  return (f as Fila | undefined) ?? null;
}

/** Un proyecto, si quien mira puede verlo (su autor y el staff, siempre). */
export async function obtenerProyecto(db: Db, id: string, visitante: Visitante): Promise<ProyectoListado> {
  const f = await fila(db, id);
  const [perfil] = f ? await db.select({ visibilidad: perfiles.visibilidad }).from(perfiles).where(eq(perfiles.userId, f.p.userId)) : [];
  const esMio = !!f && visitante?.id === f.p.userId;
  const puede =
    f && (esMio || visitante?.esStaff || (!f.p.oculto && (perfil?.visibilidad === "publico" || (perfil?.visibilidad === "registrados" && !!visitante))));
  if (!f || !puede) throw new ErrorProyecto("no_existe", "Este proyecto no existe.");
  return (await aListado(db, [f], visitante))[0]!;
}

/** Los de una persona (para su perfil): primero los fijados, luego los más nuevos. */
export async function proyectosDe(db: Db, userId: string, visitante: Visitante): Promise<ProyectoListado[]> {
  const esMio = visitante?.id === userId;
  const filas = await db
    .select(columnas)
    .from(proyectos)
    .innerJoin(perfiles, eq(perfiles.userId, proyectos.userId))
    .where(and(eq(proyectos.userId, userId), esMio ? undefined : eq(proyectos.oculto, false)))
    .orderBy(desc(proyectos.fijado), desc(proyectos.creadaEn));
  return aListado(db, filas as Fila[], visitante);
}

/** Me gusta que han recibido los proyectos de cada persona (para su perfil y su tarjeta en Talento). */
export async function megustaDe(db: Db, userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const filas = await db
    .select({ userId: proyectos.userId, n: sql<number>`coalesce(sum(${columnas.megusta}), 0)` })
    .from(proyectos)
    .where(and(inArray(proyectos.userId, userIds), eq(proyectos.oculto, false)))
    .groupBy(proyectos.userId);
  return new Map(filas.map((f) => [f.userId, Number(f.n)]));
}

export async function puedeSubir(db: Db, userId: string) {
  const [perfil] = await db.select({ id: perfiles.userId }).from(perfiles).where(eq(perfiles.userId, userId)).limit(1);
  if (!perfil) throw new ErrorProyecto("sin_perfil", "Para subir proyectos, crea antes tu perfil de talento.");
  const [{ ok }] = await db.select({ ok: verificado(userId) }).from(usuarios).where(eq(usuarios.id, userId));
  if (!ok) throw new ErrorProyecto("sin_verificar", "Para subir proyectos tienes que estar verificado (Discord vinculado y en el servidor).");
}

export async function crearProyecto(db: Db, userId: string, d: DatosProyecto): Promise<string> {
  await puedeSubir(db, userId);
  const [{ n }] = await db.select({ n: count() }).from(proyectos).where(eq(proyectos.userId, userId));
  if (Number(n) >= LIMITES_PROYECTO.porPersona) throw new ErrorProyecto("demasiados", `Como mucho ${LIMITES_PROYECTO.porPersona} proyectos.`);
  // Uno al mes: así cada uno sube el mejor y los rankings son justos.
  const mes = mesDe(new Date());
  const [{ esteMes }] = await db
    .select({ esteMes: count() })
    .from(proyectos)
    .where(and(eq(proyectos.userId, userId), sql`${proyectos.creadaEn} >= ${inicioMes(mes)}`));
  if (Number(esteMes) >= LIMITES_PROYECTO.porMes) throw new ErrorProyecto("este_mes", "Ya has subido tu proyecto de este mes. El día 1 podrás subir otro.");
  const id = nuevoId();
  await db.insert(proyectos).values({ id, userId, ...d });
  return id;
}

async function propio(db: Db, userId: string, id: string) {
  const [p] = await db.select().from(proyectos).where(and(eq(proyectos.id, id), eq(proyectos.userId, userId))).limit(1);
  if (!p) throw new ErrorProyecto("no_existe", "Este proyecto no existe.");
  return p;
}

export async function editarProyecto(db: Db, userId: string, id: string, d: DatosProyecto) {
  await propio(db, userId, id);
  await puedeSubir(db, userId);
  await db.update(proyectos).set(d).where(eq(proyectos.id, id));
}

export async function borrarProyecto(db: Db, userId: string, id: string) {
  await propio(db, userId, id);
  await db.delete(proyectos).where(eq(proyectos.id, id));
}

/** Fijar (o no) en su perfil. Como mucho LIMITES_PROYECTO.fijados. */
export async function fijarProyecto(db: Db, userId: string, id: string, fijado: unknown) {
  const p = await propio(db, userId, id);
  if (fijado === true && !p.fijado) {
    const [{ n }] = await db.select({ n: count() }).from(proyectos).where(and(eq(proyectos.userId, userId), eq(proyectos.fijado, true)));
    if (Number(n) >= LIMITES_PROYECTO.fijados) throw new ErrorProyecto("fijados", `Puedes fijar como mucho ${LIMITES_PROYECTO.fijados}.`);
  }
  await db.update(proyectos).set({ fijado: fijado === true }).where(eq(proyectos.id, id));
}

/** Dar o quitar me gusta. Devuelve cómo queda. */
export async function megusta(db: Db, id: string, visitante: NonNullable<Visitante>, dar: boolean) {
  const p = await obtenerProyecto(db, id, visitante);
  if (p.esMio) throw new ErrorProyecto("propio", "No puedes dar me gusta a tu propio proyecto.");
  if (dar) await db.insert(megustaProyectos).values({ proyectoId: id, userId: visitante.id }).onConflictDoNothing();
  else await db.delete(megustaProyectos).where(and(eq(megustaProyectos.proyectoId, id), eq(megustaProyectos.userId, visitante.id)));
  const ahora = await obtenerProyecto(db, id, visitante);
  return { megusta: ahora.megusta, meGusta: ahora.meGusta };
}

/* ── Reportes ── */

export async function reportarProyecto(db: Db, id: string, visitante: NonNullable<Visitante>, motivo: unknown) {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 5 || texto.length > 500) throw new ErrorProyecto("motivo", "Cuéntanos qué pasa (de 5 a 500 caracteres).");
  const p = await obtenerProyecto(db, id, visitante);
  if (p.esMio) throw new ErrorProyecto("propio", "No puedes reportar tu propio proyecto.");
  await db.insert(reportes).values({ id: crypto.randomUUID(), proyectoId: id, reportadoPor: visitante.id, motivo: texto }).onConflictDoNothing();
}

export async function listarReportesProyectos(db: Db): Promise<ReporteProyecto[]> {
  const filas = await db
    .select({ r: reportes, p: { id: proyectos.id, titulo: proyectos.titulo, oculto: proyectos.oculto }, autor: { alias: perfiles.alias, nombre: perfiles.nombre } })
    .from(reportes)
    .innerJoin(proyectos, eq(proyectos.id, reportes.proyectoId))
    .innerJoin(perfiles, eq(perfiles.userId, proyectos.userId))
    .where(eq(reportes.estado, "pendiente"))
    .orderBy(asc(reportes.creadoEn));
  return filas.map(({ r, p, autor }) => ({
    id: r.id,
    proyecto: { ...p, slug: slugProyecto(p.titulo), autor },
    motivo: r.motivo,
    creadoEn: r.creadoEn.toISOString(),
  }));
}

export async function contarReportesProyectos(db: Db): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(reportes).innerJoin(proyectos, eq(proyectos.id, reportes.proyectoId)).where(eq(reportes.estado, "pendiente"));
  return Number(n);
}

/** "descartar" (está bien) u "ocultar" el proyecto (solo lo ve su autor; se dan por revisados sus reportes). */
export async function resolverReporteProyecto(db: Db, id: string, accion: "descartar" | "ocultar") {
  const [r] = await db.select().from(reportes).where(eq(reportes.id, id)).limit(1);
  if (!r?.proyectoId) throw new ErrorProyecto("no_existe", "Ese reporte no existe.");
  if (accion === "ocultar") {
    await db.update(proyectos).set({ oculto: true }).where(eq(proyectos.id, r.proyectoId));
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.proyectoId, r.proyectoId));
  } else {
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.id, id));
  }
}
