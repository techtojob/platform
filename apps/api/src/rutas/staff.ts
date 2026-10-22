import { leerFiltrosStaff, validarOferta, type ListaStaff } from "@techtojob/shared";
import { Hono, type Context } from "hono";
import type { Entorno } from "../app";
import {
  alargarOferta,
  cerrarOferta,
  crearEmpresa,
  configurarEmpresa,
  crearOferta,
  editarOferta,
  ErrorStaff,
  listarEmpresas,
  marcarRevisada,
  obtenerOfertaStaff,
  publicarOferta,
  rechazarOferta,
} from "../servicios/ofertas-staff";
import { resumenCandidatas, sugerirCandidatas } from "../servicios/descubrir";
import { buscarRepetida, importarOferta } from "../servicios/importar";
import { listarStaff, rechazarVarias, siguienteStaff } from "../servicios/lista-staff";
import { listarReportes, resolverReporte } from "../servicios/talento";
import {
  ErrorReporte,
  listarReportesOfertas,
  listarReportesRecruiters,
  resolverReporteOferta,
  resolverReporteRecruiter,
  resumenReportes,
} from "../servicios/reportes";
import {
  bloquearRecruiter,
  desbloquearRecruiter,
  ErrorRecruiter,
  leerEstadoRecruiter,
  listarRecruiters,
  marcarAgencia,
} from "../servicios/recruiters";
import { responderErrorTalento } from "./talento";
import { conSesion, soloStaff } from "./sesion";

/**
 * Panel de staff. Solo moderadores (ver servicios/staff.ts).
 *
 * GET  /staff/ofertas?estado=pendiente&atajo=sin_resumen&idioma=es…  → ofertas (50 por página) + recuentos
 *      filtros: estado, q, idioma (es|en|otros), origen, fuente, desde, area, nivel, fecha (hoy|7|30),
 *      atajo (sin_resumen|sin_zona|hoy|caducan|desaparecidas), orden (antiguas|nuevas|caducan), pagina
 * GET  /staff/ofertas/siguiente?<filtros>&actual=id&saltadas=a,b → la siguiente por revisar
 * POST /staff/ofertas/rechazar-varias { ids, motivo }
 * GET  /staff/ofertas/:id                → una oferta (en cualquier estado)
 * POST /staff/ofertas                    → crear (queda pendiente)
 * PUT  /staff/ofertas/:id                → editar
 * POST /staff/ofertas/:id/publicar       { comprobaciones: ["empresa","enlace","idiomas"] }
 * POST /staff/ofertas/:id/rechazar       { motivo }
 * POST /staff/ofertas/:id/cerrar
 * POST /staff/ofertas/:id/alargar        → 45 días más
 * POST /staff/ofertas/:id/revisada       → ya se ha mirado lo que cambió su recruiter (sale de "Editadas")
 * GET  /staff/empresas · POST /staff/empresas { nombre, web?, paginaEmpleo? }
 * PATCH /staff/empresas/:id { paginaEmpleo?, sincronizar?, bloqueada? }
 * GET  /staff/candidatas                  → empresas por descubrir, por estado
 * POST /staff/candidatas { nombres }      → sugerir empresas (una por línea)
 * POST /staff/importar { url }            → lo que se puede leer de la página de la oferta
 * GET  /staff/repetida?url=&sin=          → si ya hay una oferta con ese enlace
 * GET  /staff/reportes                    → reportes de perfiles sin revisar
 * POST /staff/reportes/:id/descartar · /ocultar
 * GET  /staff/reportes/resumen            → cuántos reportes sin revisar hay de perfiles, ofertas y recruiters
 * GET  /staff/reportes-ofertas · POST /staff/reportes-ofertas/:id/descartar · /cerrar
 * GET  /staff/reportes-recruiters · POST /staff/reportes-recruiters/:id/descartar · /bloquear { motivo }
 * GET  /staff/recruiters?estado=activo|bloqueado → recruiters (se registran solos; el staff revisa sus ofertas)
 * POST /staff/recruiters/:userId/bloquear { motivo } · /desbloquear · /agencia { agencia }
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

function responderErrorReporte(c: Context<Entorno>, e: unknown) {
  if (e instanceof ErrorReporte) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, e.codigo === "no_existe" ? 404 : 400);
  if (e instanceof ErrorRecruiter) return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, e.codigo === "motivo" ? 400 : 409);
  throw e;
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
    const [lista, reportes] = await Promise.all([listarStaff(c.var.db, leerFiltrosStaff(c.req.query())), resumenReportes(c.var.db)]);
    return c.json({ ...lista, reportes: reportes.perfiles + reportes.ofertas + reportes.recruiters } satisfies ListaStaff);
  })
  .get("/ofertas/siguiente", async (c) => {
    const q = c.req.query();
    const saltadas = (q.saltadas ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return c.json(await siguienteStaff(c.var.db, leerFiltrosStaff(q), q.actual || null, saltadas));
  })
  .post("/ofertas/rechazar-varias", async (c) => {
    const datos = await cuerpo(c);
    try {
      return c.json({ rechazadas: await rechazarVarias(c.var.db, datos.ids, datos.motivo, c.var.usuario.id) });
    } catch (e) {
      return responderError(c, e);
    }
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
  .post("/ofertas/:id/:accion{publicar|rechazar|cerrar|alargar|revisada}", async (c) => {
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
        case "revisada":
          await marcarRevisada(c.var.db, id, staffId);
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
  .get("/reportes/resumen", async (c) => c.json(await resumenReportes(c.var.db)))
  .get("/reportes-ofertas", async (c) => c.json(await listarReportesOfertas(c.var.db)))
  .get("/reportes-recruiters", async (c) => c.json(await listarReportesRecruiters(c.var.db)))
  .post("/reportes-ofertas/:id/:accion{descartar|cerrar}", async (c) => {
    try {
      await resolverReporteOferta(c.var.db, c.req.param("id"), c.var.usuario.id, c.req.param("accion") as "descartar" | "cerrar");
      return c.json({ ok: true });
    } catch (e) {
      return responderErrorReporte(c, e);
    }
  })
  .post("/reportes-recruiters/:id/:accion{descartar|bloquear}", async (c) => {
    try {
      const accion = c.req.param("accion") as "descartar" | "bloquear";
      await resolverReporteRecruiter(c.var.db, c.req.param("id"), c.var.usuario.id, accion, (await cuerpo(c)).motivo);
      return c.json({ ok: true });
    } catch (e) {
      return responderErrorReporte(c, e);
    }
  })
  .post("/reportes/:id/:accion{descartar|ocultar}", async (c) => {
    try {
      await resolverReporte(c.var.db, c.req.param("id"), c.req.param("accion") as "descartar" | "ocultar");
      return c.json(await listarReportes(c.var.db));
    } catch (e) {
      return responderErrorTalento(c, e);
    }
  })
  .get("/recruiters", async (c) => c.json(await listarRecruiters(c.var.db, leerEstadoRecruiter(c.req.query("estado")))))
  .post("/recruiters/:userId/:accion{bloquear|desbloquear|agencia}", async (c) => {
    const userId = c.req.param("userId");
    const staffId = c.var.usuario.id;
    const datos = await cuerpo(c);
    try {
      switch (c.req.param("accion")) {
        case "bloquear":
          await bloquearRecruiter(c.var.db, userId, staffId, datos.motivo);
          break;
        case "desbloquear":
          await desbloquearRecruiter(c.var.db, userId);
          break;
        case "agencia":
          await marcarAgencia(c.var.db, userId, datos.agencia);
          break;
      }
      return c.json({ ok: true });
    } catch (e) {
      if (e instanceof ErrorRecruiter) {
        const http = { no_encontrado: 404, estado: 409, motivo: 400, ofertas_en_marcha: 409 } as const;
        return c.json({ error: { codigo: e.codigo, mensaje: e.message } }, http[e.codigo]);
      }
      throw e;
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
