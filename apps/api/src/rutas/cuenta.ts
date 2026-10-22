import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Entorno } from "../app";
import { configDiscord } from "../auth";
import { cuentas } from "../db/esquema";
import type { Db } from "../db/cliente";
import { borrarCuenta, datosCuenta, exportarDatos, guardarUbicacion } from "../servicios/cuenta";
import { esStaff } from "../servicios/staff";
import { PAISES, validarPerfil, validarSolicitudRecruiter, validarUbicacion } from "@techtojob/shared";
import { borrarPerfil, ErrorTalento, guardarPerfil, miPerfil } from "../servicios/talento";
import { conSesion } from "./sesion";
import { actualizarEstadoDiscord } from "../servicios/discord";
import { rutasMisOfertas } from "./mis-ofertas";
import { rutasMiPortfolio } from "./portfolios";
import { rutasMisProyectos } from "./proyectos";
import { ErrorRecruiter, miRecruiter, registrarRecruiter } from "../servicios/recruiters";

/**
 * "Mi cuenta". Necesita sesión iniciada (la cookie la manda la web).
 *
 * GET  /cuenta                     → quién es y el estado de su Discord.
 * POST /cuenta/discord/comprobar   → vuelve a preguntar al bot si está en el servidor.
 * GET  /cuenta/perfil              → mi perfil de talento (o null) y sugerencias para crearlo.
 * PUT  /cuenta/perfil              → crearlo o guardarlo.
 * DELETE /cuenta/perfil            → borrarlo.
 * /cuenta/ofertas/…               → las ofertas que subo yo, si soy recruiter (ver rutas/mis-ofertas.ts).
 * GET  /cuenta/recruiter           → mis datos de recruiter (o null).
 * PUT  /cuenta/recruiter           { cargo, empresa, web?, linkedin, mensaje? } → registrarme (al momento) o cambiarlos.
 * PUT  /cuenta/ubicacion           { pais, region } → dónde vive (obligatorio al completar la cuenta).
 * GET  /cuenta/datos               → todo lo que guardamos de la persona, en JSON.
 * DELETE /cuenta                   { confirmacion: <su email> } → borra la cuenta y todo lo suyo.
 */

/** Mi perfil de talento (dentro de /cuenta, con sesión). */
export const rutasPerfilPropio = new Hono<Entorno>()
  .get("/", async (c) => c.json(await miPerfil(c.var.db, c.var.usuario)))
  .put("/", async (c) => {
    const r = validarPerfil(await c.req.json().catch(() => ({})));
    if (r.errores) {
      return c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos: r.errores } }, 400);
    }
    try {
      await guardarPerfil(c.var.db, c.var.usuario.id, r.datos);
    } catch (e) {
      // El alias de otra persona se marca en su campo, como el resto de errores del formulario.
      if (e instanceof ErrorTalento && e.codigo === "alias_ocupado") {
        return c.json({ error: { codigo: "datos_invalidos", mensaje: e.message, campos: { alias: "ocupado" } } }, 400);
      }
      if (e instanceof ErrorTalento && e.codigo === "sin_verificar") {
        return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, 403);
      }
      throw e;
    }
    return c.json(await miPerfil(c.var.db, c.var.usuario));
  })
  .delete("/", async (c) => {
    await borrarPerfil(c.var.db, c.var.usuario.id);
    return c.json({ ok: true });
  });

export const rutasCuenta = new Hono<Entorno>()
  .use(conSesion)
  .route("/perfil", rutasPerfilPropio)
  .route("/ofertas", rutasMisOfertas)
  .route("/proyectos", rutasMisProyectos)
  .route("/portfolio", rutasMiPortfolio)
  .get("/recruiter", async (c) => c.json(await miRecruiter(c.var.db, c.var.usuario)))
  .put("/recruiter", async (c) => {
    const r = validarSolicitudRecruiter(await c.req.json().catch(() => ({})));
    if (r.errores) {
      return c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos: r.errores } }, 400);
    }
    try {
      return c.json(await registrarRecruiter(c.var.db, c.var.usuario, r.datos));
    } catch (e) {
      if (e instanceof ErrorRecruiter) {
        // Cambiar de empresa con ofertas en marcha: se marca en el campo "empresa" del formulario.
        if (e.codigo === "ofertas_en_marcha") {
          return c.json({ error: { codigo: "datos_invalidos", mensaje: e.message, campos: { empresa: "ofertas_en_marcha" } } }, 409);
        }
        return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, 409);
      }
      throw e;
    }
  })
  .get("/", async (c) => c.json(await datosCuenta(c.var.db, c.var.usuario, await opciones(c.var.db, c.env, c.var.usuario))))
  .put("/ubicacion", async (c) => {
    const r = validarUbicacion(await c.req.json().catch(() => ({})), PAISES);
    if ("error" in r) {
      const mensaje = r.error === "pais" ? "Elige tu país." : "Elige tu comunidad, estado o provincia.";
      return c.json({ error: { codigo: "datos_invalidos", mensaje, campos: { [r.error]: "falta" } } }, 400);
    }
    await guardarUbicacion(c.var.db, c.var.usuario.id, r);
    return c.json(await datosCuenta(c.var.db, c.var.usuario, await opciones(c.var.db, c.env, c.var.usuario)));
  })
  .get("/datos", async (c) => {
    c.header("content-disposition", 'attachment; filename="mis-datos-techtojob.json"');
    c.header("cache-control", "no-store");
    return c.json(await exportarDatos(c.var.db, c.var.usuario.id));
  })
  .delete("/", async (c) => {
    // Para no borrar sin querer: hay que escribir el email de la cuenta.
    const { confirmacion } = (await c.req.json().catch(() => ({}))) as { confirmacion?: unknown };
    if (typeof confirmacion !== "string" || confirmacion.trim().toLowerCase() !== c.var.usuario.email.toLowerCase()) {
      return c.json({ error: { codigo: "confirmacion", mensaje: "Escribe el email de tu cuenta para confirmar." } }, 400);
    }
    await borrarCuenta(c.var.db, c.var.usuario.id);
    return c.json({ ok: true });
  })
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
