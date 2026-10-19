import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { crearAuth, RUTA_AUTH, type Auth, type EnvAuth } from "./auth";
import { conectar, type Db } from "./db/cliente";
import { rutasCuenta } from "./rutas/cuenta";
import { rutasOfertas } from "./rutas/ofertas";
import { rutasSalud } from "./rutas/salud";
import { rutasStaff } from "./rutas/staff";
import { rutasTalento } from "./rutas/talento";

/**
 * El API de la bolsa. Cada grupo de rutas vive en src/rutas/ y solo hace de
 * puente: recibe la petición, llama a la lógica de src/servicios/ y responde.
 */
export type Entorno = {
  Bindings: Env &
    EnvAuth & {
      /** Connection string de Neon. Secreto: .dev.vars en local, `wrangler secret put` en Cloudflare. */
      DATABASE_URL: string;
      /** Invitación al servidor de Discord, para quien aún no está. */
      DISCORD_INVITACION?: string;
      /** Rol del servidor de Discord que da acceso al panel de staff (moderadores). */
      DISCORD_ROL_STAFF?: string;
      /** Emails con acceso al panel de staff aunque no tengan Discord, separados por comas. */
      STAFF_EMAILS?: string;
    };
  Variables: {
    db: Db;
    auth: Auth;
    usuario: { id: string; name: string; email: string; image?: string | null };
  };
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

  // Inicio de sesión: base de datos + Better Auth.
  const conAuth = createMiddleware<Entorno>(async (c, next) => {
    c.set("auth", crearAuth(c.var.db, c.env));
    await next();
  });

  app.route("/salud", rutasSalud);
  app.use("/ofertas", conDb).use("/ofertas/*", conDb).route("/ofertas", rutasOfertas);
  app.use(`${RUTA_AUTH}/*`, conDb, conAuth).on(["GET", "POST"], `${RUTA_AUTH}/*`, (c) => c.var.auth.handler(c.req.raw));
  app.use("/cuenta", conDb, conAuth).use("/cuenta/*", conDb, conAuth).route("/cuenta", rutasCuenta);
  app.use("/staff/*", conDb, conAuth).route("/staff", rutasStaff);
  app.use("/talento", conDb, conAuth).use("/talento/*", conDb, conAuth).route("/talento", rutasTalento);

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
