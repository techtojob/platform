import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { cargarDemo } from "../src/db/datos-demo";
import { estadoDiscord, megustaProyectos, reportes } from "../src/db/esquema";
import { comprobarLimiteMegusta, comprobarLimiteReportes, ErrorLimite, LIMITES_USO } from "../src/servicios/limites";
import { crearDbPrueba } from "./db";

const env = { ORIGENES_PERMITIDOS: "http://localhost:3000", DATABASE_URL: "", BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres", WEB_URL: "http://localhost:3000" } as never;
let db: Db;
let yo: Headers;
let miId: string;
const ofertas = Array.from({ length: 16 }, (_, i) => `demo${String(i + 1).padStart(4, "0")}`);
const proyectos = Array.from({ length: 12 }, (_, i) => `demop${String(i + 1).padStart(3, "0")}`);

beforeAll(async () => {
  db = await crearDbPrueba();
  await cargarDemo(db);
  const t = (await betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] }).$context).test;
  const u = await t.saveUser(t.createUser({ email: "abuso@example.com", name: "Abuso" }));
  miId = u.id;
  yo = (await t.login({ userId: u.id })).headers;
  await db.insert(estadoDiscord).values({ userId: u.id, discordId: "d-abuso", nombre: "abuso", enServidor: true, roles: [] });
});

describe("límites contra el abuso", () => {
  it("cuentan lo de la última hora o día de cada persona", async () => {
    await db.insert(megustaProyectos).values(proyectos.slice(0, 5).map((proyectoId) => ({ proyectoId, userId: miId })));
    await expect(comprobarLimiteMegusta(db, miId, 6)).resolves.toBeUndefined();
    await expect(comprobarLimiteMegusta(db, miId, 5)).rejects.toBeInstanceOf(ErrorLimite);
    await expect(comprobarLimiteMegusta(db, "otra-persona", 5)).resolves.toBeUndefined();
  });

  it(`con ${LIMITES_USO.reportesAlDia} reportes en 24 horas, el siguiente da 429`, async () => {
    const cosas = [...ofertas.map((ofertaId) => ({ ofertaId })), ...proyectos.slice(5).map((proyectoId) => ({ proyectoId }))].slice(0, LIMITES_USO.reportesAlDia);
    await db.insert(reportes).values(cosas.map((c, i) => ({ id: `abuso-${i}`, reportadoPor: miId, motivo: "Prueba de límite", ...c })));
    await expect(comprobarLimiteReportes(db, miId)).rejects.toBeInstanceOf(ErrorLimite);
    const h = new Headers(yo);
    h.set("content-type", "application/json");
    const r = await crearApp({ db }).request("/proyectos/demop001/reportar", { method: "POST", headers: h, body: JSON.stringify({ motivo: "Uno más de la cuenta" }) }, env);
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ error: { codigo: "limite" } });
  });
});
