import type { ReporteOferta, ReporteRecruiter, ResumenReportes } from "@techtojob/shared";
import { and, asc, count, eq } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertas, recruiters, reportes, reportesPerfil, usuarios } from "../db/esquema";
import { bloquearRecruiter } from "./recruiters";

/**
 * Reportes de ofertas y de recruiters (los de perfiles están en talento.ts). Hay que haber iniciado sesión
 * y cada persona reporta cada cosa una vez. El staff los revisa:
 * - oferta: "descartar" (está bien) o "cerrar" (deja de salir en la bolsa);
 * - recruiter: "descartar" o "bloquear" (con motivo; ver recruiters.ts).
 */

export class ErrorReporte extends Error {
  constructor(
    public readonly codigo: "no_existe" | "motivo" | "propio" | "sin_recruiter",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

function leerMotivo(motivo: unknown): string {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 5 || texto.length > 500) throw new ErrorReporte("motivo", "Cuéntanos qué pasa (de 5 a 500 caracteres).");
  return texto;
}

/**
 * Reportar una oferta publicada o a quien la publicó (si la subió un recruiter).
 * `sobre`: "oferta" (por defecto) o "recruiter".
 */
export async function reportarOferta(db: Db, ofertaId: string, userId: string, motivo: unknown, sobre: unknown) {
  const texto = leerMotivo(motivo);
  const [o] = await db
    .select({ id: ofertas.id, autorId: ofertas.autorId, recruiter: recruiters.userId })
    .from(ofertas)
    .leftJoin(recruiters, eq(recruiters.userId, ofertas.autorId))
    .where(and(eq(ofertas.id, ofertaId), eq(ofertas.estado, "publicada")))
    .limit(1);
  if (!o) throw new ErrorReporte("no_existe", "Esta oferta no existe.");
  if (o.autorId === userId) throw new ErrorReporte("propio", "No puedes reportar tu propia oferta.");
  if (sobre === "recruiter") {
    if (!o.recruiter) throw new ErrorReporte("sin_recruiter", "Esta oferta no la publicó un recruiter.");
    await db.insert(reportes).values({ id: crypto.randomUUID(), recruiterId: o.recruiter, reportadoPor: userId, motivo: texto }).onConflictDoNothing();
    return;
  }
  await db.insert(reportes).values({ id: crypto.randomUUID(), ofertaId: o.id, reportadoPor: userId, motivo: texto }).onConflictDoNothing();
}

export async function listarReportesOfertas(db: Db): Promise<ReporteOferta[]> {
  const filas = await db
    .select({ r: reportes, o: { id: ofertas.id, slug: ofertas.slug, titulo: ofertas.titulo, estado: ofertas.estado }, empresa: empresas.nombre })
    .from(reportes)
    .innerJoin(ofertas, eq(ofertas.id, reportes.ofertaId))
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(eq(reportes.estado, "pendiente"))
    .orderBy(asc(reportes.creadoEn));
  return filas.map(({ r, o, empresa }) => ({ id: r.id, oferta: { ...o, empresa }, motivo: r.motivo, creadoEn: r.creadoEn.toISOString() }));
}

export async function listarReportesRecruiters(db: Db): Promise<ReporteRecruiter[]> {
  const filas = await db
    .select({
      r: reportes,
      rec: { id: recruiters.userId, empresa: recruiters.empresaNombre, estado: recruiters.estado },
      u: { nombre: usuarios.name, email: usuarios.email },
    })
    .from(reportes)
    .innerJoin(recruiters, eq(recruiters.userId, reportes.recruiterId))
    .innerJoin(usuarios, eq(usuarios.id, recruiters.userId))
    .where(eq(reportes.estado, "pendiente"))
    .orderBy(asc(reportes.creadoEn));
  return filas.map(({ r, rec, u }) => ({ id: r.id, recruiter: { ...rec, ...u }, motivo: r.motivo, creadoEn: r.creadoEn.toISOString() }));
}

export async function resumenReportes(db: Db): Promise<ResumenReportes> {
  const [[perfiles], [deOfertas], [deRecruiters]] = await Promise.all([
    db.select({ n: count() }).from(reportesPerfil).where(eq(reportesPerfil.estado, "pendiente")),
    db.select({ n: count() }).from(reportes).innerJoin(ofertas, eq(ofertas.id, reportes.ofertaId)).where(eq(reportes.estado, "pendiente")),
    db.select({ n: count() }).from(reportes).innerJoin(recruiters, eq(recruiters.userId, reportes.recruiterId)).where(eq(reportes.estado, "pendiente")),
  ]);
  return { perfiles: Number(perfiles!.n), ofertas: Number(deOfertas!.n), recruiters: Number(deRecruiters!.n) };
}

async function reporte(db: Db, id: string) {
  const [r] = await db.select().from(reportes).where(eq(reportes.id, id)).limit(1);
  if (!r) throw new ErrorReporte("no_existe", "Ese reporte no existe.");
  return r;
}

/**
 * El staff revisa un reporte de oferta: "descartar" (está bien) o "cerrar" la oferta
 * (deja de salir; se dan por revisados todos sus reportes).
 */
export async function resolverReporteOferta(db: Db, id: string, staffId: string, accion: "descartar" | "cerrar") {
  const r = await reporte(db, id);
  if (!r.ofertaId) throw new ErrorReporte("no_existe", "Ese reporte no es de una oferta.");
  if (accion === "cerrar") {
    await db.update(ofertas).set({ estado: "cerrada", revisadaPor: staffId, revisadaEn: new Date() }).where(eq(ofertas.id, r.ofertaId));
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.ofertaId, r.ofertaId));
  } else {
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.id, id));
  }
}

/**
 * El staff revisa un reporte de recruiter: "descartar" o "bloquear" (con motivo, que ve la persona;
 * se dan por revisados todos sus reportes).
 */
export async function resolverReporteRecruiter(db: Db, id: string, staffId: string, accion: "descartar" | "bloquear", motivo?: unknown) {
  const r = await reporte(db, id);
  if (!r.recruiterId) throw new ErrorReporte("no_existe", "Ese reporte no es de un recruiter.");
  if (accion === "bloquear") {
    const [actual] = await db.select({ estado: recruiters.estado }).from(recruiters).where(eq(recruiters.userId, r.recruiterId));
    if (actual?.estado !== "bloqueado") await bloquearRecruiter(db, r.recruiterId, staffId, motivo);
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.recruiterId, r.recruiterId));
  } else {
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.id, id));
  }
}
