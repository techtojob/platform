import { eq } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { estadoDiscord } from "../db/esquema";

/**
 * Quién es staff:
 * - quien tenga el rol de moderador en el servidor de Discord (DISCORD_ROL_STAFF), con su Discord vinculado;
 * - o quien tenga su email en STAFF_EMAILS, verificado por Google o GitHub (para empezar o para probar en local sin Discord).
 * El rol se comprueba al vincular Discord y en cada inicio de sesión (servicios/discord.ts).
 */
export type ConfigStaff = { DISCORD_ROL_STAFF?: string; STAFF_EMAILS?: string };

export function emailsStaff(config: ConfigStaff): string[] {
  return (config.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function esStaff(
  db: Db,
  config: ConfigStaff,
  usuario: { id: string; email: string; emailVerified?: boolean },
): Promise<boolean> {
  // Por email, solo si Google o GitHub lo han verificado: si no, cualquiera podría poner ese email.
  if (usuario.emailVerified && emailsStaff(config).includes(usuario.email.toLowerCase())) return true;
  const rol = config.DISCORD_ROL_STAFF?.trim();
  if (!rol) return false;
  const [estado] = await db
    .select({ enServidor: estadoDiscord.enServidor, roles: estadoDiscord.roles })
    .from(estadoDiscord)
    .where(eq(estadoDiscord.userId, usuario.id))
    .limit(1);
  return !!estado?.enServidor && estado.roles.includes(rol);
}
