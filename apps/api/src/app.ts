import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { conectar, type Db } from "./db/cliente";
import { rutasOfertas } from "./rutas/ofertas";
import { rutasSalud } from "./rutas/salud";

/**
 * El API de la bolsa. Cada grupo de rutas vive en src/rutas/ y solo hace de
 * puente: recibe la petición, llama a la lógica de src/servicios/ y responde.
 */
export type Entorno = {
  Bindings: Env & {
    /** Connection string de Neon. Secreto: .dev.vars en local, `wrangler secret put` en Cloudflare. */
    DATABASE_URL: string;
  };
  Variables: { db: Db };
};

type Opciones = {
  /** Para las pruebas: usar otra base de datos en vez de Neon. */
  db?: Db;
};

export function crearApp(opciones: Opciones = {}) {
  const app = new Hono<Entorno>();

  // Solo las webs de TechToJob pueden llamar al API desde el navegador.
  app.use("*", (c, next) => {
    const permitidos = c.env.ORIGENES_PERMITIDOS.split(",").map((o) => o.trim());
    return cors({
      origin: (origen) => (permitidos.includes(origen) ? origen : null),
      credentials: true,
    })(c, next);
  });

  // Conexión a la base de datos, disponible en las rutas como c.var.db.
  // Solo en las rutas que la usan: /salud responde aunque la base de datos falle.
  const conDb = createMiddleware<Entorno>(async (c, next) => {
    c.set("db", opciones.db ?? conectar(c.env.DATABASE_URL));
    await next();
  });

  app.route("/salud", rutasSalud);
  app.use("/ofertas", conDb).use("/ofertas/*", conDb).route("/ofertas", rutasOfertas);

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
