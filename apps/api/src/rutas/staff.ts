import { ESTADOS_OFERTA, validarOferta, type EstadoOferta } from "@techtojob/shared";
import { Hono, type Context } from "hono";
import type { Entorno } from "../app";
import {
  alargarOferta,
  cerrarOferta,
  contarPorEstado,
  crearEmpresa,
  configurarEmpresa,
  crearOferta,
  editarOferta,
  ErrorStaff,
  listarEmpresas,
  listarOfertasStaff,
  obtenerOfertaStaff,
  publicarOferta,
  rechazarOferta,
} from "../servicios/ofertas-staff";
import { resumenCandidatas, sugerirCandidatas } from "../servicios/descubrir";
import { buscarRepetida, importarOferta } from "../servicios/importar";
import { listarReportes, resolverReporte } from "../servicios/talento";
import { responderErrorTalento } from "./talento";
import { conSesion, soloStaff } from "./sesion";

/**
 * Panel de staff. Solo moderadores (ver servicios/staff.ts).
 *
 * GET  /staff/ofertas?estado=pendiente   → ofertas de ese estado + cuántas hay en cada uno
 * GET  /staff/ofertas/:id                → una oferta (en cualquier estado)
 * POST /staff/ofertas                    → crear (queda pendiente)
 * PUT  /staff/ofertas/:id                → editar
 * POST /staff/ofertas/:id/publicar       { comprobaciones: ["empresa","enlace","idiomas"] }
 * POST /staff/ofertas/:id/rechazar       { motivo }
 * POST /staff/ofertas/:id/cerrar
 * POST /staff/ofertas/:id/alargar        → 45 días más
 * GET  /staff/empresas · POST /staff/empresas { nombre, web?, paginaEmpleo? }
 * PATCH /staff/empresas/:id { paginaEmpleo?, sincronizar?, bloqueada? }
 * GET  /staff/candidatas                  → empresas por descubrir, por estado
 * POST /staff/candidatas { nombres }      → sugerir empresas (una por línea)
 * POST /staff/importar { url }            → lo que se puede leer de la página de la oferta
 * GET  /staff/repetida?url=&sin=          → si ya hay una oferta con ese enlace
 * GET  /staff/reportes                    → reportes de perfiles sin revisar
 * POST /staff/reportes/:id/descartar · /ocultar
 */

const ESTADOS_HTTP = {
  no_encontrada: 404,
  empresa: 400,
  comprobaciones: 400,
  motivo: 400,
  estado: 409,
  nombre: 400,
  incompleta: 400,
  resumen: 400,
  ats: 400,
} as const;

function responderError(c: Context<Entorno>, error: unknown) {
  if (error instanceof ErrorStaff) {
    return c.json({ error: { codigo: error.codigo, mensaje: error.message } }, ESTADOS_HTTP[error.codigo]);
  }
  throw error;
}

async function cuerpo(c: Context<Entorno>): Promise<Record<string, unknown>> {
  try {
    const json = await c.req.json();
    return json && typeof json === "object" ? json : {};
  } catch {
    return {};
  }
}

const invalida = (c: Context<Entorno>, errores: Record<string, string>) =>
  c.json({ error: { codigo: "datos_invalidos", mensaje: "Revisa los campos marcados.", campos: errores } }, 400);

export const rutasStaff = new Hono<Entorno>()
  .use(conSesion, soloStaff)
  .get("/ofertas", async (c) => {
    const pedido = c.req.query("estado") ?? "pendiente";
    const estado: EstadoOferta = (ESTADOS_OFERTA as readonly string[]).includes(pedido) ? (pedido as EstadoOferta) : "pendiente";
    const [ofertas, cuentas, reportes] = await Promise.all([
      listarOfertasStaff(c.var.db, estado),
      contarPorEstado(c.var.db),
      listarReportes(c.var.db),
    ]);
    return c.json({ estado, ofertas, cuentas, reportes: reportes.length });
  })
  .get("/ofertas/:id", async (c) => {
    const oferta = await obtenerOfertaStaff(c.var.db, c.req.param("id"));
    if (!oferta) return c.json({ error: { codigo: "no_encontrada", mensaje: "Esa oferta no existe." } }, 404);
    return c.json(oferta);
  })
  .post("/ofertas", async (c) => {
    const r = validarOferta(await cuerpo(c));
    if (r.errores) return invalida(c, r.errores);
    try {
      const id = await crearOferta(c.var.db, r.datos);
      return c.json(await obtenerOfertaStaff(c.var.db, id), 201);
    } catch (e) {
      return responderError(c, e);
    }
  })
  .put("/ofertas/:id", async (c) => {
    const r = validarOferta(await cuerpo(c));
    if (r.errores) return invalida(c, r.errores);
    try {
      await editarOferta(c.var.db, c.req.param("id"), r.datos);
      return c.json(await obtenerOfertaStaff(c.var.db, c.req.param("id")));
    } catch (e) {
      return responderError(c, e);
    }
  })
  .post("/ofertas/:id/:accion{publicar|rechazar|cerrar|alargar}", async (c) => {
    const id = c.req.param("id");
    const staffId = c.var.usuario.id;
    const datos = await cuerpo(c);
    try {
      switch (c.req.param("accion")) {
        case "publicar":
          await publicarOferta(c.var.db, id, staffId, datos.comprobaciones);
          break;
        case "rechazar":
          await rechazarOferta(c.var.db, id, staffId, datos.motivo);
          break;
        case "cerrar":
          await cerrarOferta(c.var.db, id, staffId);
          break;
        case "alargar":
          await alargarOferta(c.var.db, id);
          break;
      }
      return c.json(await obtenerOfertaStaff(c.var.db, id));
    } catch (e) {
      return responderError(c, e);
    }
  })
  .post("/importar", async (c) => {
    const { url } = await cuerpo(c);
    if (typeof url !== "string" || !url.trim()) {
      return c.json({ error: { codigo: "datos_invalidos", mensaje: "Falta el enlace.", campos: { url: "falta" } } }, 400);
    }
    return c.json(await importarOferta(c.var.db, url));
  })
  .get("/repetida", async (c) => {
    const url = c.req.query("url") ?? "";
    return c.json({ repetida: await buscarRepetida(c.var.db, url, c.req.query("sin")) });
  })
  .get("/reportes", async (c) => c.json(await listarReportes(c.var.db)))
  .post("/reportes/:id/:accion{descartar|ocultar}", async (c) => {
    try {
      await resolverReporte(c.var.db, c.req.param("id"), c.req.param("accion") as "descartar" | "ocultar");
      return c.json(await listarReportes(c.var.db));
    } catch (e) {
      return responderErrorTalento(c, e);
    }
  })
  .get("/empresas", async (c) => c.json(await listarEmpresas(c.var.db)))
  .post("/empresas", async (c) => {
    try {
      return c.json(await crearEmpresa(c.var.db, await cuerpo(c)), 201);
    } catch (e) {
      return responderError(c, e);
    }
  })
  .get("/candidatas", async (c) => c.json(await resumenCandidatas(c.var.db)))
  .post("/candidatas", async (c) => {
    const anadidas = await sugerirCandidatas(c.var.db, (await cuerpo(c)).nombres);
    return c.json({ anadidas, resumen: await resumenCandidatas(c.var.db) });
  })
  .patch("/empresas/:id", async (c) => {
    try {
      return c.json(await configurarEmpresa(c.var.db, c.req.param("id"), await cuerpo(c)));
    } catch (e) {
      return responderError(c, e);
    }
  });
