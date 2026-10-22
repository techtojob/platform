import { leerFiltrosProyectos, validarProyecto } from "@techtojob/shared";
import { Hono, type Context } from "hono";
import type { Entorno } from "../app";
import { esStaff } from "../servicios/staff";
import {
  borrarProyecto,
  crearProyecto,
  editarProyecto,
  ErrorProyecto,
  fijarProyecto,
  listarProyectos,
  megusta,
  obtenerProyecto,
  proyectosDe,
  reportarProyecto,
} from "../servicios/proyectos";
import type { Visitante } from "../servicios/talento";
import { conSesion } from "./sesion";

async function visitante(c: Context<Entorno>): Promise<Visitante> {
  const sesion = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  if (!sesion) return null;
  return { id: sesion.user.id, esStaff: await esStaff(c.var.db, c.env, sesion.user) };
}

const ESTADOS_HTTP = { no_existe: 404, sin_perfil: 403, sin_verificar: 403, propio: 400, fijados: 409, demasiados: 409, motivo: 400 } as const;
function responder(c: Context<Entorno>, e: unknown) {
  if (e instanceof ErrorProyecto) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
  throw e;
}
const cuerpo = async (c: Context<Entorno>) => (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
const invalido = (c: Context<Entorno>, campos: Record<string, string>) =>
  c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos } }, 400);

/**
 * Proyectos de la comunidad.
 *
 * GET    /proyectos?orden=mes|tendencia|siempre|nuevos&mes=2026-09&area=&tec=&q=&pagina=
 * GET    /proyectos/:id
 * POST   /proyectos/:id/megusta · DELETE /proyectos/:id/megusta   (con sesión)
 * POST   /proyectos/:id/reportar { motivo }                       (con sesión)
 */
export const rutasProyectos = new Hono<Entorno>()
  .get("/", async (c) => c.json(await listarProyectos(c.var.db, leerFiltrosProyectos(c.req.query()), await visitante(c))))
  .get("/:id", async (c) => {
    try {
      return c.json(await obtenerProyecto(c.var.db, c.req.param("id"), await visitante(c)));
    } catch (e) {
      return responder(c, e);
    }
  })
  .on(["POST", "DELETE"], "/:id/megusta", conSesion, async (c) => {
    try {
      const yo = { id: c.var.usuario.id, esStaff: await esStaff(c.var.db, c.env, c.var.usuario) };
      return c.json(await megusta(c.var.db, c.req.param("id"), yo, c.req.method === "POST"));
    } catch (e) {
      return responder(c, e);
    }
  })
  .post("/:id/reportar", conSesion, async (c) => {
    try {
      await reportarProyecto(c.var.db, c.req.param("id"), { id: c.var.usuario.id }, (await cuerpo(c)).motivo);
      return c.json({ ok: true });
    } catch (e) {
      return responder(c, e);
    }
  });

/**
 * Mis proyectos (dentro de /cuenta, con sesión).
 *
 * GET    /cuenta/proyectos            → los míos (también los ocultos por el staff)
 * POST   /cuenta/proyectos            → subir uno (hace falta perfil y estar verificado)
 * PUT    /cuenta/proyectos/:id · DELETE /cuenta/proyectos/:id
 * POST   /cuenta/proyectos/:id/fijar  { fijado }
 */
export const rutasMisProyectos = new Hono<Entorno>()
  .get("/", async (c) => c.json(await proyectosDe(c.var.db, c.var.usuario.id, { id: c.var.usuario.id })))
  .post("/", async (c) => {
    const r = validarProyecto(await cuerpo(c));
    if (r.errores) return invalido(c, r.errores);
    try {
      return c.json({ id: await crearProyecto(c.var.db, c.var.usuario.id, r.datos) }, 201);
    } catch (e) {
      return responder(c, e);
    }
  })
  .put("/:id", async (c) => {
    const r = validarProyecto(await cuerpo(c));
    if (r.errores) return invalido(c, r.errores);
    try {
      await editarProyecto(c.var.db, c.var.usuario.id, c.req.param("id"), r.datos);
      return c.json({ ok: true });
    } catch (e) {
      return responder(c, e);
    }
  })
  .delete("/:id", async (c) => {
    try {
      await borrarProyecto(c.var.db, c.var.usuario.id, c.req.param("id"));
      return c.json({ ok: true });
    } catch (e) {
      return responder(c, e);
    }
  })
  .post("/:id/fijar", async (c) => {
    try {
      await fijarProyecto(c.var.db, c.var.usuario.id, c.req.param("id"), (await cuerpo(c)).fijado);
      return c.json({ ok: true });
    } catch (e) {
      return responder(c, e);
    }
  });
