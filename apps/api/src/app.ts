import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { rutasSalud } from "./rutas/salud";

/**
 * El API de la bolsa. Cada grupo de rutas vive en src/rutas/ y solo hace de
 * puente: recibe la petición, llama a la lógica de src/servicios/ y responde.
 */
export type Entorno = { Bindings: Env };

export function crearApp() {
  const app = new Hono<Entorno>();

  // Solo las webs de TechToJob pueden llamar al API desde el navegador.
  app.use("*", (c, next) => {
    const permitidos = c.env.ORIGENES_PERMITIDOS.split(",").map((o) => o.trim());
    return cors({
      origin: (origen) => (permitidos.includes(origen) ? origen : null),
      credentials: true,
    })(c, next);
  });

  app.route("/salud", rutasSalud);

  // Respuestas de error siempre en el mismo formato: { error: { codigo, mensaje } }.
  app.notFound((c) => c.json({ error: { codigo: "no_encontrado", mensaje: "Esta ruta no existe." } }, 404));
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: { codigo: "peticion_invalida", mensaje: err.message } }, err.status);
    }
    console.error(err);
    return c.json({ error: { codigo: "error_interno", mensaje: "Algo ha fallado. Inténtalo más tarde." } }, 500);
  });

  return app;
}
