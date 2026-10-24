import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { dominioDe, mesDe, validarPortfolio, validarVideoJuicio } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { emblemas, estadoDiscord, megustaPortfolios, perfiles, portfolios, usuarios } from "../src/db/esquema";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  STAFF_EMAILS: "pablo@example.com",
} as never;

let db: Db;
const h: Record<string, Headers> = {};
const ids: Record<string, string> = {};
const HACE_UN_MES = new Date(Date.now() - 35 * 86_400_000);

// Las webs de los portfolios, inventadas: sin salir a internet.
const WEBS: Record<string, string> = {
  "https://ana.dev/": `<html><head><meta property="og:image" content="/portada.png"><title>Ana</title></head></html>`,
  "https://bea.dev/": `<html><head><title>Bea</title></head></html>`,
};
vi.stubGlobal("fetch", async (url: string) =>
  WEBS[url] ? new Response(WEBS[url], { headers: { "content-type": "text/html" } }) : new Response("no", { status: 404 }),
);

beforeAll(async () => {
  db = await crearDbPrueba();
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const t = (await auth.$context).test;
  for (const [nombre, verificada, perfil] of [
    ["ana", true, true],
    ["bea", true, true],
    ["carla", true, false],
    ["dani", false, true],
    ["pablo", true, false],
  ] as const) {
    const u = await t.saveUser(t.createUser({ email: `${nombre}@example.com`, name: nombre }));
    ids[nombre] = u.id;
    h[nombre] = (await t.login({ userId: u.id })).headers;
    await db.update(usuarios).set({ createdAt: HACE_UN_MES }).where(eq(usuarios.id, u.id));
    if (verificada) await db.insert(estadoDiscord).values({ userId: u.id, discordId: `d-${nombre}`, nombre, enServidor: true, roles: [] });
    if (perfil) {
      await db.insert(perfiles).values({
        userId: u.id, alias: `${nombre}-dev`, nombre, titular: "Frontend developer", area: nombre === "bea" ? "datos" : "desarrollo", seniority: "junior", anosExperiencia: 1,
        modalidades: ["remoto"], disponibilidad: "buscando", tecnologias: [], idiomas: [{ idioma: "es", nivel: null }], visibilidad: "publico",
      });
    }
  }
});

const pedir = async (ruta: string, quien: string | null, init: { method?: string; body?: unknown } = {}) => {
  const cab = new Headers(quien ? h[quien] : undefined);
  if (init.body !== undefined) cab.set("content-type", "application/json");
  const r = await crearApp({ db }).request(ruta, { method: init.method ?? "GET", headers: cab, body: init.body === undefined ? undefined : JSON.stringify(init.body) }, env);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: r.status, json: (await r.json().catch(() => null)) as any };
};

describe("validar", () => {
  it("la dirección hace falta; https se pone solo", () => {
    expect(validarPortfolio({ url: "ana.dev" }).datos).toEqual({ url: "https://ana.dev", descripcion: null, quiereJuicio: false });
    expect(validarPortfolio({}).errores).toEqual({ url: "falta" });
    expect(validarPortfolio({ url: "no es una web" }).errores).toEqual({ url: "url" });
    expect(validarPortfolio({ url: "ana.dev", descripcion: "x".repeat(501) }).errores).toEqual({ descripcion: "largo" });
    expect(dominioDe("https://www.ana.dev/")).toBe("ana.dev");
    expect(validarVideoJuicio("youtube.com/watch?v=1")).toBe("https://youtube.com/watch?v=1");
    expect(validarVideoJuicio("https://example.com/video")).toBe("mal");
  });
});

describe("mi portfolio", () => {
  it("hace falta perfil y estar verificado", async () => {
    expect((await pedir("/cuenta/portfolio", "carla", { method: "PUT", body: { url: "carla.dev" } })).json.error.codigo).toBe("sin_perfil");
    expect((await pedir("/cuenta/portfolio", "dani", { method: "PUT", body: { url: "dani.dev" } })).json.error.codigo).toBe("sin_verificar");
  });

  it("se pone, con la imagen de la web, y se pide Tu portfolio a juicio", async () => {
    const r = await pedir("/cuenta/portfolio", "ana", { method: "PUT", body: { url: "ana.dev/", descripcion: "Mi web", quiereJuicio: true } });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ alias: "ana-dev", url: "https://ana.dev/", dominio: "ana.dev", imagen: "https://ana.dev/portada.png", juicio: { estado: "pedido" } });
    // Quitar la petición antes de que se revise la cancela.
    expect((await pedir("/cuenta/portfolio", "ana", { method: "PUT", body: { url: "ana.dev/", quiereJuicio: false } })).json.juicio).toEqual({ estado: "no" });
    await pedir("/cuenta/portfolio", "ana", { method: "PUT", body: { url: "ana.dev/", quiereJuicio: true } });
    expect((await pedir("/cuenta/portfolio", "bea", { method: "PUT", body: { url: "https://bea.dev/" } })).json.imagen).toBeNull();
  });
});

describe("lista y me gusta", () => {
  it("se ven en la lista, filtran por área y suman en el perfil", async () => {
    const l = await pedir("/portfolios?orden=nuevos", null);
    expect(l.json.portfolios.map((p: { alias: string }) => p.alias)).toEqual(["bea-dev", "ana-dev"]);
    expect((await pedir("/portfolios?area=datos", null)).json.portfolios.map((p: { alias: string }) => p.alias)).toEqual(["bea-dev"]);
    expect((await pedir("/portfolios/ana-dev/megusta", "ana", { method: "POST" })).json.error.codigo).toBe("propio");
    expect((await pedir("/portfolios/ana-dev/megusta", "bea", { method: "POST" })).json).toEqual({ megusta: 1, meGusta: true });
    await db.insert(megustaPortfolios).values({ portfolioId: ids.bea!, userId: ids.pablo!, creadoEn: HACE_UN_MES });
    expect((await pedir("/portfolios?orden=mes", null)).json.portfolios[0]).toMatchObject({ alias: "ana-dev", megustaPeriodo: 1 });
    expect((await pedir(`/portfolios?orden=mes&mes=${mesDe(HACE_UN_MES)}`, null)).json.portfolios[0]).toMatchObject({ alias: "bea-dev", megustaPeriodo: 1 });
    const perfil = await pedir("/talento/ana-dev", null);
    expect(perfil.json).toMatchObject({ megusta: 1, portfolio: { url: "https://ana.dev/", meGusta: false } });
  });
});

describe("Tu portfolio a juicio (staff)", () => {
  it("el staff ve los pedidos, lo marca con fecha y vídeo y da el emblema", async () => {
    expect((await pedir("/staff/juicio", "ana")).status).toBe(403);
    const lista = await pedir("/staff/juicio", "pablo");
    expect(lista.json.pendientes.map((p: { alias: string }) => p.alias)).toEqual(["ana-dev"]);
    expect((await pedir("/staff/juicio/ana-dev", "pablo", { method: "POST", body: { fecha: "2026-10-23", video: "https://example.com/v" } })).json.error.codigo).toBe("video");
    expect((await pedir("/staff/juicio/ana-dev", "pablo", { method: "POST", body: { fecha: "3000-01-01" } })).json.error.codigo).toBe("fecha");
    const hoy = new Date().toISOString().slice(0, 10);
    const r = await pedir("/staff/juicio/ana-dev", "pablo", { method: "POST", body: { fecha: hoy, video: "youtu.be/abc" } });
    expect(r.json.pendientes).toEqual([]);
    expect(r.json.revisados[0]).toMatchObject({ alias: "ana-dev", juicio: { estado: "revisado", video: "https://youtu.be/abc" } });
    expect(await db.select().from(emblemas).where(eq(emblemas.userId, ids.ana!))).toMatchObject([{ tipo: "juicio" }]);
    expect((await pedir("/talento/ana-dev", null)).json.emblemas.map((e: { tipo: string }) => e.tipo)).toContain("juicio");
    expect((await pedir("/portfolios?juicio=1", null)).json.portfolios.map((p: { alias: string }) => p.alias)).toEqual(["ana-dev"]);
    // Ya revisado: quitar la casilla no lo cambia.
    expect((await pedir("/cuenta/portfolio", "ana", { method: "PUT", body: { url: "ana.dev/", quiereJuicio: false } })).json.juicio.estado).toBe("revisado");
  });
});

describe("reportar, ocultar y borrar", () => {
  it("el staff lo oculta: solo lo ve su autor", async () => {
    expect((await pedir("/portfolios/bea-dev/reportar", "bea", { method: "POST", body: { motivo: "Prueba propia" } })).json.error.codigo).toBe("propio");
    expect((await pedir("/portfolios/bea-dev/reportar", "ana", { method: "POST", body: { motivo: "No es suyo, es una plantilla." } })).status).toBe(200);
    expect((await pedir("/staff/reportes/resumen", "pablo")).json).toMatchObject({ portfolios: 1 });
    const [rep] = (await pedir("/staff/reportes-portfolios", "pablo")).json;
    expect(rep.portfolio.alias).toBe("bea-dev");
    expect((await pedir(`/staff/reportes-portfolios/${rep.id}/ocultar`, "pablo", { method: "POST" })).status).toBe(200);
    expect((await pedir("/portfolios", null)).json.portfolios.map((p: { alias: string }) => p.alias)).toEqual(["ana-dev"]);
    expect((await pedir("/talento/bea-dev", null)).json.portfolio).toBeNull();
    expect((await pedir("/cuenta/portfolio", "bea")).json).toMatchObject({ oculto: true });
  });

  it("borrar el portfolio, y borrar el perfil se lo lleva", async () => {
    expect((await pedir("/cuenta/portfolio", "bea", { method: "DELETE" })).status).toBe(200);
    expect((await pedir("/cuenta/portfolio", "bea")).json).toBeNull();
    await pedir("/cuenta/perfil", "ana", { method: "DELETE" });
    expect(await db.select().from(portfolios).where(eq(portfolios.userId, ids.ana!))).toHaveLength(0);
  });
});
