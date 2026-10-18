import { Hono } from "hono";
import type { Entorno } from "../app";
import { comprobarSalud } from "../servicios/salud";

/** GET /salud → el API está vivo. Lo usa la monitorización y sirve de ejemplo. */
export const rutasSalud = new Hono<Entorno>().get("/", (c) => c.json(comprobarSalud()));
