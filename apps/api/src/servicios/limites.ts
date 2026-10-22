import { and, count, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { megustaPortfolios, megustaProyectos, reportes, reportesPerfil } from "../db/esquema";

/**
 * Límites contra el abuso (se cuentan en la base de datos: funcionan igual en todos los servidores de Cloudflare).
 * Pasarse devuelve 429 { error: { codigo: "limite" } } (ver app.onError).
 */
export const LIMITES_USO = {
  /** Reportes por persona en 24 horas (de cualquier cosa). */
  reportesAlDia: 20,
  /** Me gusta (dados o quitados) por persona en una hora. */
  megustaPorHora: 60,
} as const;

export class ErrorLimite extends Error {
  readonly codigo = "limite";
}

const hace = (horas: number) => sql`now() - make_interval(hours => ${horas})`;

export async function comprobarLimiteReportes(db: Db, userId: string, maximo: number = LIMITES_USO.reportesAlDia) {
  const [[a], [b]] = await Promise.all([
    db.select({ n: count() }).from(reportes).where(and(eq(reportes.reportadoPor, userId), gt(reportes.creadoEn, hace(24)))),
    db.select({ n: count() }).from(reportesPerfil).where(and(eq(reportesPerfil.reportadoPor, userId), gt(reportesPerfil.creadoEn, hace(24)))),
  ]);
  if (Number(a!.n) + Number(b!.n) >= maximo) {
    throw new ErrorLimite("Has enviado muchos reportes hoy. Gracias: el staff ya los está mirando. Mañana podrás enviar más.");
  }
}

export async function comprobarLimiteMegusta(db: Db, userId: string, maximo: number = LIMITES_USO.megustaPorHora) {
  const [[a], [b]] = await Promise.all([
    db.select({ n: count() }).from(megustaProyectos).where(and(eq(megustaProyectos.userId, userId), gt(megustaProyectos.creadoEn, hace(1)))),
    db.select({ n: count() }).from(megustaPortfolios).where(and(eq(megustaPortfolios.userId, userId), gt(megustaPortfolios.creadoEn, hace(1)))),
  ]);
  if (Number(a!.n) + Number(b!.n) >= maximo) {
    throw new ErrorLimite("Has dado muchos me gusta en poco tiempo. Espera un rato.");
  }
}
