import type { Cuenta } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { cuentas, estadoDiscord } from "../db/esquema";
import { borrarEstadoDiscord } from "./discord";

export type { Cuenta } from "@techtojob/shared";

type Usuario = { id: string; name: string; email: string; image?: string | null };

/** Arma la respuesta de "Mi cuenta" para un usuario con sesión. */
export async function datosCuenta(
  db: Db,
  usuario: Usuario,
  opciones: { discordDisponible: boolean; invitacion: string | null; esStaff: boolean },
): Promise<Cuenta> {
  const [vinculadas, [estado]] = await Promise.all([
    db.select({ id: cuentas.id, proveedor: cuentas.providerId, idExterno: cuentas.accountId }).from(cuentas).where(eq(cuentas.userId, usuario.id)),
    db.select().from(estadoDiscord).where(eq(estadoDiscord.userId, usuario.id)).limit(1),
  ]);
  const discord = vinculadas.find((c) => c.proveedor === "discord");

  // Si desvinculó Discord, lo que sabíamos de su Discord ya no vale.
  const vigente = discord && estado?.discordId === discord.idExterno ? estado : undefined;
  if (estado && !vigente) await borrarEstadoDiscord(db, usuario.id);

  return {
    usuario: { id: usuario.id, nombre: usuario.name, email: usuario.email, imagen: usuario.image ?? null },
    esStaff: opciones.esStaff,
    proveedores: vinculadas.map((c) => c.proveedor),
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
