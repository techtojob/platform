import { AREAS, DISPONIBILIDAD, MODALIDADES, SENIORITY, TECNOLOGIAS } from "@techtojob/shared";
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Entorno } from "../app";
import { esStaff } from "../servicios/staff";
import { ErrorTalento, listarPerfiles, mapaPerfiles, obtenerPerfil, reportarPerfil, type Visitante } from "../servicios/talento";
import { lista } from "./ofertas";
import { conSesion } from "./sesion";

const idsTecnologias = TECNOLOGIAS.map((t) => t.id);

/** Quién mira, si ha iniciado sesión (aquí la sesión no es obligatoria). */
async function visitante(c: Context<Entorno>): Promise<Visitante> {
  const sesion = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  if (!sesion) return null;
  return { id: sesion.user.id, esStaff: await esStaff(c.var.db, c.env, sesion.user) };
}

const ESTADOS_HTTP = { no_existe: 404, solo_registrados: 401, motivo: 400, propio: 400, alias_ocupado: 409, reporte: 404, sin_verificar: 403 } as const;
export function responderErrorTalento(c: Context<Entorno>, e: unknown) {
  if (e instanceof ErrorTalento) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
  throw e;
}

/**
 * Talento.
 *
 * GET  /talento?q=&disp=&area=&nivel=&modalidad=&tec=&pais=&verificados=1&despues=
 * GET  /talento/mapa                → perfiles públicos, para el mapa del sitio
 * GET  /talento/:alias              → 404 si no existe o está oculto; 401 si es solo para registrados
 * POST /talento/:alias/reportar     { motivo }   (con sesión)
 */
export const rutasTalento = new Hono<Entorno>()
  .get("/", async (c) => {
    const q = c.req.query();
    const texto = q.q?.trim();
    if (texto && texto.length > 100) throw new HTTPException(400, { message: '"q" no puede tener más de 100 caracteres.' });
    const pais = q.pais?.trim().toUpperCase();
    if (pais && !/^[A-Z]{2}$/.test(pais)) throw new HTTPException(400, { message: '"pais" es un código de 2 letras.' });
    return c.json(
      await listarPerfiles(
        c.var.db,
        {
          q: texto || undefined,
          disponibilidad: lista(q.disp, DISPONIBILIDAD, "disp"),
          areas: lista(q.area, AREAS, "area"),
          seniority: lista(q.nivel, SENIORITY, "nivel"),
          modalidades: lista(q.modalidad, MODALIDADES, "modalidad"),
          tecnologias: lista(q.tec, idsTecnologias, "tec"),
          pais: pais || undefined,
          verificados: q.verificados === "1",
          despues: q.despues ?? null,
        },
        await visitante(c),
      ),
    );
  })
  .get("/mapa", async (c) => c.json(await mapaPerfiles(c.var.db)))
  .get("/:alias", async (c) => {
    try {
      return c.json(await obtenerPerfil(c.var.db, c.req.param("alias"), await visitante(c)));
    } catch (e) {
      return responderErrorTalento(c, e);
    }
  })
  .post("/:alias/reportar", conSesion, async (c) => {
    const cuerpo = (await c.req.json().catch(() => ({}))) as { motivo?: unknown };
    try {
      await reportarPerfil(c.var.db, c.req.param("alias"), c.var.usuario.id, cuerpo.motivo);
      return c.json({ ok: true });
    } catch (e) {
      return responderErrorTalento(c, e);
    }
  });
