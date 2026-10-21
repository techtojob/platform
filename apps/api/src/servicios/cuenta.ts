import type { Cuenta } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { cuentas, emblemas, estadoDiscord, ofertas, perfiles, reportesPerfil, sesiones, usuarios } from "../db/esquema";
import { borrarEstadoDiscord } from "./discord";

export type { Cuenta } from "@techtojob/shared";

type Usuario = { id: string; name: string; email: string; image?: string | null };

/** Arma la respuesta de "Mi cuenta" para un usuario con sesión. */
export async function datosCuenta(
  db: Db,
  usuario: Usuario,
  opciones: { discordDisponible: boolean; invitacion: string | null; esStaff: boolean },
): Promise<Cuenta> {
  const [vinculadas, [estado], [perfil]] = await Promise.all([
    db.select({ id: cuentas.id, proveedor: cuentas.providerId, idExterno: cuentas.accountId }).from(cuentas).where(eq(cuentas.userId, usuario.id)),
    db.select().from(estadoDiscord).where(eq(estadoDiscord.userId, usuario.id)).limit(1),
    db.select({ pais: perfiles.pais }).from(perfiles).where(eq(perfiles.userId, usuario.id)).limit(1),
  ]);
  const [ubicacion] = await db.select({ pais: usuarios.pais, region: usuarios.region }).from(usuarios).where(eq(usuarios.id, usuario.id)).limit(1);
  const discord = vinculadas.find((c) => c.proveedor === "discord");

  // Si desvinculó Discord, lo que sabíamos de su Discord ya no vale.
  const vigente = discord && estado?.discordId === discord.idExterno ? estado : undefined;
  if (estado && !vigente) await borrarEstadoDiscord(db, usuario.id);

  return {
    usuario: { id: usuario.id, nombre: usuario.name, email: usuario.email, imagen: usuario.image ?? null },
    esStaff: opciones.esStaff,
    proveedores: vinculadas.map((c) => c.proveedor),
    ubicacion: ubicacion?.pais ? { pais: ubicacion.pais, region: ubicacion.region } : null,
    pais: ubicacion?.pais ?? perfil?.pais ?? null,
    discord: {
      disponible: opciones.discordDisponible,
      vinculado: !!discord,
      cuentaId: discord?.id ?? null,
      nombre: vigente?.nombre ?? null,
      enServidor: vigente?.enServidor ?? false,
      roles: vigente?.roles ?? [],
      comprobadoEn: vigente?.comprobadoEn.toISOString() ?? null,
      invitacion: opciones.invitacion,
    },
  };
}

/**
 * Borra la cuenta y todo lo suyo: sesiones, cuentas de Google/GitHub/Discord (con sus tokens),
 * estado de Discord, perfil de talento, emblemas y los reportes que hizo o recibió (en cascada).
 * Si era staff, las ofertas que revisó se quedan, pero sin su id.
 */
export async function borrarCuenta(db: Db, userId: string) {
  await db.update(ofertas).set({ revisadaPor: null }).where(eq(ofertas.revisadaPor, userId));
  await db.delete(usuarios).where(eq(usuarios.id, userId));
}

/**
 * Todo lo que TechToJob guarda de una persona, para descargarlo (derecho de acceso y portabilidad).
 * Sin tokens ni datos internos de seguridad.
 */
export async function exportarDatos(db: Db, userId: string) {
  const [[usuario], proveedores, [discord], [perfil], susEmblemas, reportesHechos, sesionesActivas] = await Promise.all([
    db.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1),
    db.select({ proveedor: cuentas.providerId, creadaEn: cuentas.createdAt }).from(cuentas).where(eq(cuentas.userId, userId)),
    db.select().from(estadoDiscord).where(eq(estadoDiscord.userId, userId)).limit(1),
    db.select().from(perfiles).where(eq(perfiles.userId, userId)).limit(1),
    db.select().from(emblemas).where(eq(emblemas.userId, userId)),
    db
      .select({ perfil: perfiles.alias, motivo: reportesPerfil.motivo, creadoEn: reportesPerfil.creadoEn })
      .from(reportesPerfil)
      .innerJoin(perfiles, eq(perfiles.userId, reportesPerfil.perfilUserId))
      .where(eq(reportesPerfil.reportadoPor, userId)),
    db.select({ creadaEn: sesiones.createdAt, caducaEn: sesiones.expiresAt, ip: sesiones.ipAddress, navegador: sesiones.userAgent }).from(sesiones).where(eq(sesiones.userId, userId)),
  ]);
  return {
    exportadoEn: new Date().toISOString(),
    cuenta: usuario
      ? {
          nombre: usuario.name,
          email: usuario.email,
          emailVerificado: usuario.emailVerified,
          foto: usuario.image,
          pais: usuario.pais,
          region: usuario.region,
          creadaEn: usuario.createdAt,
        }
      : null,
    formasDeEntrar: proveedores,
    discord: discord ? { id: discord.discordId, nombre: discord.nombre, enServidor: discord.enServidor, roles: discord.roles, comprobadoEn: discord.comprobadoEn } : null,
    perfilDeTalento: perfil ? (({ userId: _u, ...resto }) => resto)(perfil) : null,
    emblemas: susEmblemas.map(({ tipo, nombre, otorgadoEn, caducaEn }) => ({ tipo, nombre, otorgadoEn, caducaEn })),
    reportesQueHiciste: reportesHechos,
    sesiones: sesionesActivas,
  };
}

/** Guarda el país y la región de la cuenta (ver validarUbicacion). */
export async function guardarUbicacion(db: Db, userId: string, ubicacion: { pais: string; region: string | null }) {
  await db.update(usuarios).set({ pais: ubicacion.pais, region: ubicacion.region }).where(eq(usuarios.id, userId));
}
