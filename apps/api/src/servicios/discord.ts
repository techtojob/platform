import { eq } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { estadoDiscord } from "../db/esquema";

/**
 * Comprueba con el bot de TechToJob si un usuario de Discord está en el servidor
 * y con qué roles. Solo usa el id de Discord de la persona: no pedimos permiso
 * para ver sus servidores, lo pregunta nuestro bot, que ya está dentro.
 */

const API_DISCORD = "https://discord.com/api/v10";

export type ConfigDiscord = {
  /** Token del bot (secreto). */
  tokenBot: string;
  /** Id del servidor de TechToJob. */
  servidorId: string;
};

export type ResultadoDiscord = { enServidor: boolean; nombre: string | null; roles: string[] };

type MiembroDiscord = { roles?: string[]; user?: { username?: string; global_name?: string | null } };
type UsuarioDiscord = { username?: string; global_name?: string | null };

/** Pregunta a Discord. Lanza un error si Discord no responde bien (salvo "no es miembro"). */
export async function consultarDiscord(
  config: ConfigDiscord,
  discordId: string,
  pedir: typeof fetch = fetch,
): Promise<ResultadoDiscord> {
  const cabeceras = { Authorization: `Bot ${config.tokenBot}` };
  const res = await pedir(`${API_DISCORD}/guilds/${config.servidorId}/members/${discordId}`, { headers: cabeceras });

  if (res.ok) {
    const miembro = (await res.json()) as MiembroDiscord;
    return { enServidor: true, nombre: miembro.user?.username ?? null, roles: miembro.roles ?? [] };
  }
  if (res.status === 404) {
    // No está en el servidor. Pedimos su nombre de usuario para enseñarlo en "Mi cuenta".
    const usuario = await pedir(`${API_DISCORD}/users/${discordId}`, { headers: cabeceras });
    const datos = usuario.ok ? ((await usuario.json()) as UsuarioDiscord) : null;
    return { enServidor: false, nombre: datos?.username ?? null, roles: [] };
  }
  throw new Error(`Discord respondió ${res.status} al comprobar el servidor.`);
}

/** Comprueba y guarda el resultado. Si Discord falla, se deja lo que había. */
export async function actualizarEstadoDiscord(
  db: Db,
  config: ConfigDiscord,
  userId: string,
  discordId: string,
  pedir: typeof fetch = fetch,
) {
  const r = await consultarDiscord(config, discordId, pedir);
  const valores = { discordId, nombre: r.nombre, enServidor: r.enServidor, roles: r.roles, comprobadoEn: new Date() };
  await db
    .insert(estadoDiscord)
    .values({ userId, ...valores })
    .onConflictDoUpdate({ target: estadoDiscord.userId, set: valores });
  return r;
}

export async function borrarEstadoDiscord(db: Db, userId: string) {
  await db.delete(estadoDiscord).where(eq(estadoDiscord.userId, userId));
}
