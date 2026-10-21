import { validarOfertaUsuario } from "@techtojob/shared";
import { Hono } from "hono";
import type { Entorno } from "../app";
import { ErrorMisOfertas, importarParaUsuario, listarMisOfertas, retirarOferta, subirOferta } from "../servicios/mis-ofertas";

/**
 * Ofertas que sube cualquiera con su cuenta (dentro de /cuenta, con sesión). Las revisa el staff antes de salir.
 *
 * GET  /cuenta/ofertas               → las mías, el límite y cuántas tengo en marcha.
 * POST /cuenta/ofertas               → subir una (queda pendiente). 409 "limite" si ya tengo 3; 409 "repetida".
 * POST /cuenta/ofertas/importar      { url } → rellenar el formulario desde el enlace.
 * POST /cuenta/ofertas/:id/retirar   → quitarla (pendiente: se borra; publicada: deja de salir).
 */

const ESTADOS_HTTP = { limite: 409, repetida: 409, empresa: 400, no_encontrada: 404, estado: 409 } as const;

export const rutasMisOfertas = new Hono<Entorno>()
  .get("/", async (c) => c.json(await listarMisOfertas(c.var.db, c.var.usuario.id)))
  .post("/", async (c) => {
    const r = validarOfertaUsuario(await c.req.json().catch(() => ({})));
    if (r.errores) {
      return c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos: r.errores } }, 400);
    }
    try {
      const id = await subirOferta(c.var.db, c.var.usuario.id, r.datos);
      return c.json({ id }, 201);
    } catch (e) {
      if (e instanceof ErrorMisOfertas) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
      throw e;
    }
  })
  .post("/importar", async (c) => {
    const { url } = (await c.req.json().catch(() => ({}))) as { url?: unknown };
    if (typeof url !== "string" || !url.trim()) {
      return c.json({ error: { codigo: "datos_invalidos", mensaje: "Falta el enlace.", campos: { url: "falta" } } }, 400);
    }
    return c.json(await importarParaUsuario(c.var.db, url));
  })
  .post("/:id/retirar", async (c) => {
    try {
      await retirarOferta(c.var.db, c.var.usuario.id, c.req.param("id"));
      return c.json(await listarMisOfertas(c.var.db, c.var.usuario.id));
    } catch (e) {
      if (e instanceof ErrorMisOfertas) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
      throw e;
    }
  });
