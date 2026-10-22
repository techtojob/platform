import { leerFiltrosPortfolios, validarPortfolio } from "@techtojob/shared";
import { Hono, type Context } from "hono";
import type { Entorno } from "../app";
import {
  borrarPortfolio,
  ErrorPortfolio,
  guardarPortfolio,
  listarPortfolios,
  megustaPortfolio,
  miPortfolio,
  reportarPortfolio,
} from "../servicios/portfolios";
import { esStaff } from "../servicios/staff";
import type { Visitante } from "../servicios/talento";
import { conSesion } from "./sesion";

async function visitante(c: Context<Entorno>): Promise<Visitante> {
  const sesion = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  if (!sesion) return null;
  return { id: sesion.user.id, esStaff: await esStaff(c.var.db, c.env, sesion.user) };
}

const ESTADOS_HTTP = { no_existe: 404, sin_perfil: 403, sin_verificar: 403, propio: 400, motivo: 400, fecha: 400, video: 400 } as const;
export function responderPortfolio(c: Context<Entorno>, e: unknown) {
  if (e instanceof ErrorPortfolio) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
  throw e;
}
const cuerpo = async (c: Context<Entorno>) => (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

/**
 * Portfolios de la comunidad (uno por persona; se nombran por el alias de su autor).
 *
 * GET    /portfolios?orden=mes|tendencia|siempre|nuevos&mes=&area=&q=&juicio=1&pagina=
 * POST   /portfolios/:alias/megusta · DELETE /portfolios/:alias/megusta   (con sesión)
 * POST   /portfolios/:alias/reportar { motivo }                         (con sesión)
 */
export const rutasPortfolios = new Hono<Entorno>()
  .get("/", async (c) => c.json(await listarPortfolios(c.var.db, leerFiltrosPortfolios(c.req.query()), await visitante(c))))
  .on(["POST", "DELETE"], "/:alias/megusta", conSesion, async (c) => {
    try {
      const yo = { id: c.var.usuario.id, esStaff: await esStaff(c.var.db, c.env, c.var.usuario) };
      return c.json(await megustaPortfolio(c.var.db, c.req.param("alias"), yo, c.req.method === "POST"));
    } catch (e) {
      return responderPortfolio(c, e);
    }
  })
  .post("/:alias/reportar", conSesion, async (c) => {
    try {
      await reportarPortfolio(c.var.db, c.req.param("alias"), { id: c.var.usuario.id, esStaff: false }, (await cuerpo(c)).motivo);
      return c.json({ ok: true });
    } catch (e) {
      return responderPortfolio(c, e);
    }
  });

/**
 * Mi portfolio (dentro de /cuenta, con sesión).
 *
 * GET    /cuenta/portfolio   → el mío, o null
 * PUT    /cuenta/portfolio   { url, descripcion, quiereJuicio } (hace falta perfil y estar verificado)
 * DELETE /cuenta/portfolio
 */
export const rutasMiPortfolio = new Hono<Entorno>()
  .get("/", async (c) => c.json(await miPortfolio(c.var.db, c.var.usuario.id)))
  .put("/", async (c) => {
    const r = validarPortfolio(await cuerpo(c));
    if (r.errores) return c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos: r.errores } }, 400);
    try {
      await guardarPortfolio(c.var.db, c.var.usuario.id, r.datos);
      return c.json(await miPortfolio(c.var.db, c.var.usuario.id));
    } catch (e) {
      return responderPortfolio(c, e);
    }
  })
  .delete("/", async (c) => {
    await borrarPortfolio(c.var.db, c.var.usuario.id);
    return c.json({ ok: true });
  });
