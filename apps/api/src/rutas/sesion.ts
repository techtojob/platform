import { createMiddleware } from "hono/factory";
import type { Entorno } from "../app";
import { esStaff } from "../servicios/staff";

/** Necesita sesión iniciada (la cookie la manda la web). Deja el usuario en c.var.usuario. */
export const conSesion = createMiddleware<Entorno>(async (c, next) => {
  const sesion = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  if (!sesion) {
    return c.json({ error: { codigo: "sin_sesion", mensaje: "Inicia sesión para ver tu cuenta." } }, 401);
  }
  c.set("usuario", sesion.user);
  await next();
});

/** Solo staff (moderadores del Discord o emails de STAFF_EMAILS). Va después de conSesion. */
export const soloStaff = createMiddleware<Entorno>(async (c, next) => {
  if (!(await esStaff(c.var.db, c.env, c.var.usuario))) {
    return c.json({ error: { codigo: "sin_permiso", mensaje: "Esto es solo para el staff." } }, 403);
  }
  await next();
});
