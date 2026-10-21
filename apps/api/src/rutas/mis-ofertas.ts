import { validarOfertaUsuario } from "@techtojob/shared";
import { Hono } from "hono";
import type { Entorno } from "../app";
import { ErrorMisOfertas, importarParaUsuario, listarMisOfertas, retirarOferta, subirOferta } from "../servicios/mis-ofertas";
import { recruiterActivo } from "../servicios/recruiters";

/**
 * Ofertas que suben los recruiters (dentro de /cuenta, con sesión). Las revisa el staff antes de salir.
 * Subir e importar: 403 "no_recruiter" si no se ha registrado como recruiter o está bloqueado (ver /cuenta/recruiter).
 *
 * GET  /cuenta/ofertas               → las mías, el límite y cuántas tengo en marcha.
 * POST /cuenta/ofertas               → subir una (queda pendiente). 409 "limite" si ya tengo 3; 409 "repetida".
 * POST /cuenta/ofertas/importar      { url } → rellenar el formulario desde el enlace.
 * POST /cuenta/ofertas/:id/retirar   → quitarla (pendiente: se borra; publicada: deja de salir).
 */

const ESTADOS_HTTP = { limite: 409, repetida: 409, empresa: 400, no_encontrada: 404, estado: 409, no_recruiter: 403 } as const;

export const rutasMisOfertas = new Hono<Entorno>()
  .get("/", async (c) => c.json(await listarMisOfertas(c.var.db, c.var.usuario.id)))
  .post("/", async (c) => {
    const recruiter = await recruiterActivo(c.var.db, c.var.usuario.id);
    if (!recruiter) {
      return c.json({ error: { codigo: "no_recruiter", mensaje: "Solo los recruiters pueden publicar ofertas." } }, 403);
    }
    const cuerpo = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    // Si no es agencia, la empresa es siempre la suya (lo que mande se ignora).
    const r = validarOfertaUsuario(recruiter.agencia ? cuerpo : { ...cuerpo, empresa: { nombre: recruiter.empresaNombre } });
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
    try {
      return c.json(await importarParaUsuario(c.var.db, c.var.usuario.id, url));
    } catch (e) {
      if (e instanceof ErrorMisOfertas) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, ESTADOS_HTTP[e.codigo]);
      throw e;
    }
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
