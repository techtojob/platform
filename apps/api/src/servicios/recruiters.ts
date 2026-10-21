import {
  ESTADOS_RECRUITER,
  esEmailDeLaEmpresa,
  LIMITES_RECRUITER,
  nombreEmpresaComparable,
  type EstadoRecruiter,
  type ListaRecruiters,
  type MiRecruiter,
  type RecruiterStaff,
  type SolicitudRecruiter,
} from "@techtojob/shared";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertas, recruiters, usuarios } from "../db/esquema";

/**
 * Recruiters: solo ellos (y el staff) publican ofertas desde la web.
 * Cualquiera se registra al momento (no lo aprueba nadie): lo que revisa el staff es cada oferta.
 * Si alguien abusa, el staff lo bloquea (y sus ofertas pendientes se descartan).
 * Ver packages/shared/src/recruiters.ts.
 */

export class ErrorRecruiter extends Error {
  constructor(
    public readonly codigo: "no_encontrado" | "estado" | "motivo",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Motivo con el que se descartan sus ofertas pendientes al bloquearlo. */
export const MOTIVO_BLOQUEADO = "La cuenta de recruiter está bloqueada.";

type Fila = typeof recruiters.$inferSelect;

function aMiRecruiter(r: Fila, email: string): MiRecruiter {
  return {
    estado: r.estado,
    cargo: r.cargo,
    empresa: r.empresaNombre,
    web: r.empresaWeb,
    linkedin: r.linkedin,
    mensaje: r.mensaje,
    motivo: r.estado === "bloqueado" ? r.motivo : null,
    agencia: r.agencia,
    empresaId: r.empresaId,
    emailEmpresa: esEmailDeLaEmpresa(email, r.empresaWeb),
    creadoEn: r.creadaEn.toISOString(),
  };
}

export async function filaRecruiter(db: Db, userId: string): Promise<Fila | null> {
  const [r] = await db.select().from(recruiters).where(eq(recruiters.userId, userId)).limit(1);
  return r ?? null;
}

export async function miRecruiter(db: Db, usuario: { id: string; email: string }): Promise<MiRecruiter | null> {
  const r = await filaRecruiter(db, usuario.id);
  return r ? aMiRecruiter(r, usuario.email) : null;
}

/** Para "Mi cuenta": estado y empresa (el nombre de la bolsa si ya está enlazada). */
export async function resumenRecruiter(db: Db, userId: string) {
  const [r] = await db
    .select({ estado: recruiters.estado, agencia: recruiters.agencia, escrita: recruiters.empresaNombre, deLaBolsa: empresas.nombre })
    .from(recruiters)
    .leftJoin(empresas, eq(empresas.id, recruiters.empresaId))
    .where(eq(recruiters.userId, userId))
    .limit(1);
  return r ? { estado: r.estado, agencia: r.agencia, empresa: r.deLaBolsa ?? r.escrita } : null;
}

/** Un recruiter que puede publicar ahora mismo (activo), o null. */
export async function recruiterActivo(db: Db, userId: string): Promise<Fila | null> {
  const r = await filaRecruiter(db, userId);
  return r?.estado === "activo" ? r : null;
}

/**
 * Registrarse como recruiter (al momento) o cambiar sus datos. Si cambia de empresa,
 * se deja de enlazar con la anterior: la nueva se enlaza con su próxima oferta.
 * Si está bloqueado, no puede (409).
 */
export async function registrarRecruiter(db: Db, usuario: { id: string; email: string }, d: SolicitudRecruiter): Promise<MiRecruiter> {
  const actual = await filaRecruiter(db, usuario.id);
  if (actual?.estado === "bloqueado") throw new ErrorRecruiter("estado", "Tu cuenta de recruiter está bloqueada.");
  const mismaEmpresa = actual && nombreEmpresaComparable(actual.empresaNombre) === nombreEmpresaComparable(d.empresa);
  const valores = {
    cargo: d.cargo,
    empresaNombre: d.empresa,
    empresaWeb: d.web,
    linkedin: d.linkedin,
    mensaje: d.mensaje,
    ...(!mismaEmpresa && { empresaId: null }),
  };
  const [fila] = actual
    ? await db.update(recruiters).set(valores).where(eq(recruiters.userId, usuario.id)).returning()
    : await db.insert(recruiters).values({ userId: usuario.id, estado: "activo", ...valores }).returning();
  return aMiRecruiter(fila!, usuario.email);
}

/** Enlaza al recruiter con la empresa de la bolsa (con su primera oferta). */
export async function enlazarEmpresa(db: Db, userId: string, empresaId: string) {
  await db.update(recruiters).set({ empresaId }).where(eq(recruiters.userId, userId));
}

export async function listarRecruiters(db: Db, estado: EstadoRecruiter): Promise<ListaRecruiters> {
  const subidas = sql<number>`count(${ofertas.id})`;
  const [filas, porEstado] = await Promise.all([
    db
      .select({ r: recruiters, usuario: { id: usuarios.id, nombre: usuarios.name, email: usuarios.email }, ofertas: subidas })
      .from(recruiters)
      .innerJoin(usuarios, eq(usuarios.id, recruiters.userId))
      .leftJoin(ofertas, eq(ofertas.autorId, recruiters.userId))
      .where(eq(recruiters.estado, estado))
      .groupBy(recruiters.userId, usuarios.id)
      .orderBy(estado === "bloqueado" ? desc(recruiters.bloqueadoEn) : desc(recruiters.creadaEn))
      .limit(500),
    db.select({ estado: recruiters.estado, n: count() }).from(recruiters).groupBy(recruiters.estado),
  ]);
  return {
    estado,
    recruiters: filas.map((f): RecruiterStaff => ({ ...aMiRecruiter(f.r, f.usuario.email), usuario: f.usuario, ofertas: Number(f.ofertas) })),
    cuentas: Object.fromEntries(porEstado.map((x) => [x.estado, Number(x.n)])),
  };
}

export const leerEstadoRecruiter = (valor: unknown): EstadoRecruiter =>
  (ESTADOS_RECRUITER as readonly string[]).includes(valor as string) ? (valor as EstadoRecruiter) : "activo";

async function existente(db: Db, userId: string) {
  const r = await filaRecruiter(db, userId);
  if (!r) throw new ErrorRecruiter("no_encontrado", "Ese recruiter no existe.");
  return r;
}

/** Bloquear (con motivo, que ve la persona). Sus ofertas pendientes se descartan; las publicadas siguen hasta que caduquen o el staff las cierre. */
export async function bloquearRecruiter(db: Db, userId: string, staffId: string, motivo: unknown) {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 3 || texto.length > LIMITES_RECRUITER.motivo) throw new ErrorRecruiter("motivo", "Escribe el motivo (3–300 caracteres).");
  const r = await existente(db, userId);
  if (r.estado === "bloqueado") throw new ErrorRecruiter("estado", "Ya está bloqueado.");
  await db.update(recruiters).set({ estado: "bloqueado", motivo: texto, bloqueadoPor: staffId, bloqueadoEn: new Date() }).where(eq(recruiters.userId, userId));
  await db
    .update(ofertas)
    .set({ estado: "rechazada", motivoRechazo: MOTIVO_BLOQUEADO, revisadaPor: staffId, revisadaEn: new Date() })
    .where(and(eq(ofertas.autorId, userId), eq(ofertas.estado, "pendiente")));
}

export async function desbloquearRecruiter(db: Db, userId: string) {
  const r = await existente(db, userId);
  if (r.estado !== "bloqueado") throw new ErrorRecruiter("estado", "No está bloqueado.");
  await db.update(recruiters).set({ estado: "activo", motivo: null, bloqueadoPor: null, bloqueadoEn: null }).where(eq(recruiters.userId, userId));
}

/** Agencia o headhunter: puede publicar ofertas de cualquier empresa. Lo decide el staff. */
export async function marcarAgencia(db: Db, userId: string, agencia: unknown) {
  await existente(db, userId);
  await db.update(recruiters).set({ agencia: agencia === true }).where(eq(recruiters.userId, userId));
}
