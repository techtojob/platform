import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Entorno } from "../app";
import { configDiscord } from "../auth";
import { cuentas } from "../db/esquema";
import type { Db } from "../db/cliente";
import { datosCuenta } from "../servicios/cuenta";
import { esStaff } from "../servicios/staff";
import { conSesion } from "./sesion";
import { actualizarEstadoDiscord } from "../servicios/discord";

/**
 * "Mi cuenta". Necesita sesión iniciada (la cookie la manda la web).
 *
 * GET  /cuenta                     → quién es y el estado de su Discord.
 * POST /cuenta/discord/comprobar   → vuelve a preguntar al bot si está en el servidor.
 */
export const rutasCuenta = new Hono<Entorno>()
  .use(conSesion)
  .get("/", async (c) => c.json(await datosCuenta(c.var.db, c.var.usuario, await opciones(c.var.db, c.env, c.var.usuario))))
  .post("/discord/comprobar", async (c) => {
    const config = configDiscord(c.env);
    const usuario = c.var.usuario;
    const [discord] = await c.var.db
      .select({ id: cuentas.accountId })
      .from(cuentas)
      .where(and(eq(cuentas.userId, usuario.id), eq(cuentas.providerId, "discord")))
      .limit(1);
    if (!config || !discord) {
      return c.json({ error: { codigo: "sin_discord", mensaje: "No tienes Discord vinculado." } }, 400);
    }
    try {
      await actualizarEstadoDiscord(c.var.db, config, usuario.id, discord.id);
    } catch (error) {
      console.error(error);
      return c.json({ error: { codigo: "discord_no_responde", mensaje: "Discord no responde. Prueba en un rato." } }, 502);
    }
    return c.json(await datosCuenta(c.var.db, usuario, await opciones(c.var.db, c.env, usuario)));
  });

async function opciones(db: Db, env: Entorno["Bindings"], usuario: Entorno["Variables"]["usuario"]) {
  return {
    discordDisponible: !!(env.DISCORD_CLIENT_ID && configDiscord(env)),
    invitacion: env.DISCORD_INVITACION || null,
    esStaff: await esStaff(db, env, usuario),
  };
}
