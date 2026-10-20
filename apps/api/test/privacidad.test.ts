import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { cuentas, estadoDiscord, ofertas, perfiles, reportesPerfil, sesiones, usuarios } from "../src/db/esquema";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
} as never;

let db: Db;
let marta: Headers;
let idMarta: string;

beforeAll(async () => {
  db = await crearDbPrueba();
  const t = (await betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] }).$context).test;
  const u = await t.saveUser(t.createUser({ email: "marta@ejemplo.dev", name: "Marta" }));
  idMarta = u.id;
  marta = (await t.login({ userId: u.id })).headers;
  // Cuenta de GitHub (con un token que nunca debe salir), Discord, perfil, un reporte hecho y una oferta revisada.
  await db.insert(cuentas).values({ id: "cta-gh", accountId: "gh-1", providerId: "github", userId: u.id, accessToken: "token-secreto-de-github" });
  await db.insert(estadoDiscord).values({ userId: u.id, discordId: "d-1", nombre: "marta", enServidor: true });
  await db.insert(perfiles).values({
    userId: u.id, alias: "marta-dev", nombre: "Marta", titular: "Backend junior", area: "desarrollo", seniority: "junior",
    disponibilidad: "buscando", modalidades: ["remoto"], idiomas: [{ idioma: "es", nivel: "nativo" }], visibilidad: "publico",
  });
  await db.insert(reportesPerfil).values({ id: "rep-1", perfilUserId: "usr-prueba-1", reportadoPor: u.id, motivo: "Prueba de reporte" });
  await db.update(ofertas).set({ revisadaPor: u.id }).where(eq(ofertas.id, "k7x2m9qa"));
});

const pedir = async (ruta: string, init: { method?: string; body?: unknown } = {}) => {
  const h = new Headers(marta);
  if (init.body !== undefined) h.set("content-type", "application/json");
  const res = await crearApp({ db }).request(ruta, { method: init.method ?? "GET", headers: h, body: init.body === undefined ? undefined : JSON.stringify(init.body) }, env);
  return { status: res.status, cabeceras: res.headers, texto: await res.text() };
};

describe("descargar mis datos", () => {
  it("lo devuelve todo como archivo, sin tokens", async () => {
    const r = await pedir("/cuenta/datos");
    expect(r.status).toBe(200);
    expect(r.cabeceras.get("content-disposition")).toContain("mis-datos-techtojob.json");
    const datos = JSON.parse(r.texto);
    expect(datos.cuenta).toMatchObject({ nombre: "Marta", email: "marta@ejemplo.dev" });
    expect(datos.formasDeEntrar.map((f: { proveedor: string }) => f.proveedor)).toEqual(["github"]);
    expect(datos.discord).toMatchObject({ nombre: "marta", enServidor: true });
    expect(datos.perfilDeTalento).toMatchObject({ alias: "marta-dev" });
    expect(datos.reportesQueHiciste).toHaveLength(1);
    expect(r.texto).not.toContain("token-secreto-de-github");
    expect(r.texto).not.toContain(idMarta);
  });
});

describe("borrar mi cuenta", () => {
  it("pide escribir el email de la cuenta", async () => {
    expect((await pedir("/cuenta", { method: "DELETE", body: { confirmacion: "otro@ejemplo.dev" } })).status).toBe(400);
    expect((await pedir("/cuenta", { method: "DELETE" })).status).toBe(400);
  });

  it("borra la cuenta y todo lo suyo; la sesión deja de valer", async () => {
    expect((await pedir("/cuenta", { method: "DELETE", body: { confirmacion: " MARTA@ejemplo.dev " } })).status).toBe(200);
    for (const tabla of [cuentas, estadoDiscord, perfiles, sesiones]) {
      expect(await db.select().from(tabla).where(eq(tabla.userId, idMarta))).toEqual([]);
    }
    expect(await db.select().from(usuarios).where(eq(usuarios.id, idMarta))).toEqual([]);
    expect(await db.select().from(reportesPerfil).where(eq(reportesPerfil.reportadoPor, idMarta))).toEqual([]);
    // La oferta que revisó sigue, pero sin su id.
    const [oferta] = await db.select().from(ofertas).where(eq(ofertas.id, "k7x2m9qa"));
    expect(oferta).toMatchObject({ revisadaPor: null });
    expect((await pedir("/cuenta")).status).toBe(401);
  });
});
