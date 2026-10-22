import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { leerFiltrosProyectos, mesDe, portadaGithub, validarProyecto } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { estadoDiscord, megustaProyectos, perfiles, proyectos, usuarios } from "../src/db/esquema";
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
const HACE_UN_MES = new Date(Date.now() - 30 * 86_400_000);

beforeAll(async () => {
  db = await crearDbPrueba();
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const t = (await auth.$context).test;
  for (const [nombre, verificada, perfil, vieja] of [
    ["ana", true, true, true],
    ["bea", true, true, true],
    ["carla", true, false, true], // sin perfil
    ["dani", false, true, true], // con perfil de antes, sin verificar
    ["eva", true, false, false], // cuenta recién creada: sus me gusta aún no cuentan
    ["pablo", true, false, true],
  ] as const) {
    const u = await t.saveUser(t.createUser({ email: `${nombre}@example.com`, name: nombre }));
    ids[nombre] = u.id;
    h[nombre] = (await t.login({ userId: u.id })).headers;
    if (vieja) await db.update(usuarios).set({ createdAt: HACE_UN_MES }).where(eq(usuarios.id, u.id));
    if (verificada) await db.insert(estadoDiscord).values({ userId: u.id, discordId: `d-${nombre}`, nombre, enServidor: true, roles: [] });
    if (perfil) {
      await db.insert(perfiles).values({
        userId: u.id, alias: `${nombre}-dev`, nombre, titular: "Backend developer", area: "desarrollo", seniority: "mid", anosExperiencia: 3,
        modalidades: ["remoto"], disponibilidad: "buscando", tecnologias: [], idiomas: [{ idioma: "es", nivel: null }], visibilidad: "publico",
      });
    }
  }
});

const pedir = async (ruta: string, quien: string | null, init: { method?: string; body?: unknown } = {}) => {
  const cab = new Headers(quien ? h[quien] : undefined);
  if (init.body !== undefined) cab.set("content-type", "application/json");
  const r = await crearApp({ db }).request(ruta, { method: init.method ?? "GET", headers: cab, body: init.body === undefined ? undefined : JSON.stringify(init.body) }, env);
  return { status: r.status, json: (await r.json().catch(() => null)) as never as Record<string, unknown> & { proyectos: Array<Record<string, unknown>> } };
};

const proyecto = (cambios: Record<string, unknown> = {}) => ({
  titulo: "Lakehouse de vivienda vacacional",
  descripcion: "Pipeline con PySpark que limpia y cruza datos de vivienda vacacional en Canarias.",
  area: "datos",
  tecnologias: ["python"],
  repo: "github.com/ana/lakehouse-canarias",
  ...cambios,
});

describe("validar un proyecto", () => {
  it("pide título, descripción, área y el repositorio o la demo", () => {
    expect(validarProyecto(proyecto()).datos).toMatchObject({ repo: "https://github.com/ana/lakehouse-canarias", estado: "terminado" });
    expect(validarProyecto(proyecto({ titulo: "" })).errores).toMatchObject({ titulo: "falta" });
    expect(validarProyecto(proyecto({ descripcion: "corta" })).errores).toMatchObject({ descripcion: "corto" });
    expect(validarProyecto(proyecto({ repo: "", demo: "" })).errores).toMatchObject({ repo: "repoODemo" });
    expect(validarProyecto(proyecto({ repo: "", demo: "mi-app.vercel.app" })).datos).toMatchObject({ demo: "https://mi-app.vercel.app" });
    expect(validarProyecto(proyecto({ tecnologias: ["inventada"] })).errores).toMatchObject({ tecnologias: "desconocida" });
  });

  it("la portada es la imagen que hace GitHub del repositorio", () => {
    expect(portadaGithub("https://github.com/ana/mi-app")).toBe("https://opengraph.githubassets.com/1/ana/mi-app");
    expect(portadaGithub("https://github.com/ana/mi-app.git")).toBe("https://opengraph.githubassets.com/1/ana/mi-app");
    expect(portadaGithub("https://gitlab.com/ana/mi-app")).toBeNull();
    expect(portadaGithub(null)).toBeNull();
  });

  it("filtros: orden y mes (nunca uno futuro)", () => {
    const ahora = new Date("2026-10-22T10:00:00Z");
    expect(leerFiltrosProyectos({}, ahora)).toMatchObject({ orden: "mes", pagina: 1 });
    expect(leerFiltrosProyectos({ orden: "mes", mes: "2026-09" }, ahora)).toMatchObject({ mes: "2026-09" });
    expect(leerFiltrosProyectos({ orden: "mes", mes: "2026-12" }, ahora).mes).toBeUndefined();
    expect(mesDe(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11"); // ya es 1 de noviembre en España
  });
});

describe("subir proyectos", () => {
  it("hace falta perfil y estar verificado", async () => {
    expect((await pedir("/cuenta/proyectos", null, { method: "POST", body: proyecto() })).status).toBe(401);
    expect((await pedir("/cuenta/proyectos", "carla", { method: "POST", body: proyecto() })).json).toMatchObject({ error: { codigo: "sin_perfil" } });
    expect((await pedir("/cuenta/proyectos", "dani", { method: "POST", body: proyecto() })).json).toMatchObject({ error: { codigo: "sin_verificar" } });
    expect((await pedir("/cuenta/proyectos", "ana", { method: "POST", body: { ...proyecto(), titulo: "" } })).status).toBe(400);
  });

  it("se sube, sale en la lista con su autor y su portada", async () => {
    const r = await pedir("/cuenta/proyectos", "ana", { method: "POST", body: proyecto() });
    expect(r.status).toBe(201);
    ids.lakehouse = r.json.id as unknown as string;
    ids.web = (await pedir("/cuenta/proyectos", "ana", { method: "POST", body: proyecto({ titulo: "Mi portfolio web", area: "desarrollo", repo: "", demo: "https://ana.dev" }) })).json
      .id as unknown as string;
    ids.bot = (await pedir("/cuenta/proyectos", "bea", { method: "POST", body: proyecto({ titulo: "Bot de Discord", area: "desarrollo", repo: "https://github.com/bea/bot" }) })).json
      .id as unknown as string;
    const lista = await pedir("/proyectos?orden=nuevos", null);
    expect(lista.json.total).toBe(3);
    expect(lista.json.proyectos[2]).toMatchObject({
      titulo: "Lakehouse de vivienda vacacional",
      slug: "lakehouse-de-vivienda-vacacional",
      portada: "https://opengraph.githubassets.com/1/ana/lakehouse-canarias",
      autor: { alias: "ana-dev", disponibilidad: "buscando" },
      megusta: 0,
    });
  });

  it("filtros por área, tecnología y búsqueda", async () => {
    const titulos = async (q: string) => (await pedir(`/proyectos?orden=nuevos&${q}`, null)).json.proyectos.map((p) => p.titulo);
    expect(await titulos("area=datos")).toEqual(["Lakehouse de vivienda vacacional"]);
    expect(await titulos("q=bot")).toEqual(["Bot de Discord"]);
    expect(await titulos("tec=python")).toHaveLength(3);
  });
});

describe("me gusta", () => {
  it("con sesión, uno por persona, se puede quitar y nunca al propio", async () => {
    expect((await pedir(`/proyectos/${ids.lakehouse}/megusta`, null, { method: "POST" })).status).toBe(401);
    expect((await pedir(`/proyectos/${ids.lakehouse}/megusta`, "ana", { method: "POST" })).json).toMatchObject({ error: { codigo: "propio" } });
    expect((await pedir(`/proyectos/${ids.lakehouse}/megusta`, "bea", { method: "POST" })).json).toEqual({ megusta: 1, meGusta: true });
    expect((await pedir(`/proyectos/${ids.lakehouse}/megusta`, "bea", { method: "POST" })).json).toEqual({ megusta: 1, meGusta: true });
    expect((await pedir(`/proyectos/${ids.lakehouse}/megusta`, "bea", { method: "DELETE" })).json).toEqual({ megusta: 0, meGusta: false });
    await pedir(`/proyectos/${ids.lakehouse}/megusta`, "bea", { method: "POST" });
    await pedir(`/proyectos/${ids.lakehouse}/megusta`, "carla", { method: "POST" });
    await pedir(`/proyectos/${ids.bot}/megusta`, "ana", { method: "POST" });
  });

  it("los de una cuenta recién creada no cuentan (contra trampas)", async () => {
    const r = await pedir(`/proyectos/${ids.bot}/megusta`, "eva", { method: "POST" });
    expect(r.json).toEqual({ megusta: 1, meGusta: true });
  });

  it("rankings: este mes, tendencia, de siempre y meses pasados", async () => {
    // Un me gusta antiguo al bot (del mes pasado): cuenta para "de siempre", no para "este mes".
    await db.insert(megustaProyectos).values({ proyectoId: ids.bot, userId: ids.pablo!, creadoEn: HACE_UN_MES });
    const orden = async (q: string) => (await pedir(`/proyectos?${q}`, null)).json.proyectos.map((p) => [p.titulo, p.megusta, p.megustaPeriodo]);
    expect((await orden("orden=mes"))[0]).toEqual(["Lakehouse de vivienda vacacional", 2, 2]);
    expect((await orden("orden=tendencia"))[0]).toEqual(["Lakehouse de vivienda vacacional", 2, 2]);
    // Empate a 2: gana el más nuevo.
    expect((await orden("orden=siempre")).slice(0, 2)).toEqual([
      ["Bot de Discord", 2, undefined],
      ["Lakehouse de vivienda vacacional", 2, undefined],
    ]);
    const mesPasado = mesDe(HACE_UN_MES);
    expect((await orden(`orden=mes&mes=${mesPasado}`))[0]).toEqual(["Bot de Discord", 2, 1]);
  });

  it("el perfil suma los me gusta de sus proyectos y los enseña (fijados primero)", async () => {
    expect((await pedir(`/cuenta/proyectos/${ids.web}/fijar`, "ana", { method: "POST", body: { fijado: true } })).status).toBe(200);
    const perfil = await pedir("/talento/ana-dev", null);
    expect(perfil.json).toMatchObject({ megusta: 2 });
    expect(perfil.json.proyectos.map((p) => [p.titulo, p.fijado])).toEqual([
      ["Mi portfolio web", true],
      ["Lakehouse de vivienda vacacional", false],
    ]);
    const talento = (await pedir("/talento", null)).json as unknown as { perfiles: Array<{ alias: string; megusta: number }> };
    expect(talento.perfiles.find((p) => p.alias === "ana-dev")?.megusta).toBe(2);
  });

  it("como mucho 3 fijados", async () => {
    for (const n of [1, 2, 3]) {
      const { json } = await pedir("/cuenta/proyectos", "ana", { method: "POST", body: proyecto({ titulo: `Extra ${n}`, repo: `https://github.com/ana/extra-${n}` }) });
      const r = await pedir(`/cuenta/proyectos/${json.id}/fijar`, "ana", { method: "POST", body: { fijado: true } });
      expect(r.status).toBe(n < 3 ? 200 : 409);
    }
  });
});

describe("editar, borrar, reportar y ocultar", () => {
  it("solo su autor lo edita o lo borra", async () => {
    expect((await pedir(`/cuenta/proyectos/${ids.lakehouse}`, "bea", { method: "PUT", body: proyecto() })).status).toBe(404);
    expect((await pedir(`/cuenta/proyectos/${ids.lakehouse}`, "ana", { method: "PUT", body: proyecto({ estado: "en_curso" }) })).status).toBe(200);
    expect((await pedir(`/proyectos/${ids.lakehouse}`, null)).json).toMatchObject({ estado: "en_curso" });
    expect((await pedir(`/cuenta/proyectos/${ids.web}`, "bea", { method: "DELETE" })).status).toBe(404);
  });

  it("reportar y que el staff lo oculte: solo lo ve su autor", async () => {
    expect((await pedir(`/proyectos/${ids.bot}/reportar`, "bea", { method: "POST", body: { motivo: "Es mío, no lo reporto" } })).status).toBe(400);
    expect((await pedir(`/proyectos/${ids.bot}/reportar`, "ana", { method: "POST", body: { motivo: "Copiado de otro repositorio." } })).status).toBe(200);
    expect((await pedir("/staff/reportes/resumen", "pablo")).json).toMatchObject({ proyectos: 1 });
    const [rep] = (await pedir("/staff/reportes-proyectos", "pablo")).json as unknown as Array<{ id: string; proyecto: { titulo: string } }>;
    expect(rep!.proyecto.titulo).toBe("Bot de Discord");
    expect((await pedir(`/staff/reportes-proyectos/${rep!.id}/ocultar`, "pablo", { method: "POST" })).status).toBe(200);
    expect((await pedir(`/proyectos/${ids.bot}`, null)).status).toBe(404);
    expect((await pedir(`/proyectos/${ids.bot}`, "bea")).json).toMatchObject({ oculto: true });
    expect((await pedir("/proyectos?orden=nuevos", null)).json.proyectos.map((p) => p.titulo)).not.toContain("Bot de Discord");
  });

  it("borrar", async () => {
    expect((await pedir(`/cuenta/proyectos/${ids.web}`, "ana", { method: "DELETE" })).status).toBe(200);
    expect(await db.select().from(proyectos).where(eq(proyectos.id, ids.web!))).toHaveLength(0);
  });
});

describe("borrar el perfil", () => {
  it("se lleva sus proyectos", async () => {
    expect((await pedir("/cuenta/perfil", "bea", { method: "DELETE" })).status).toBe(200);
    expect(await db.select().from(proyectos).where(eq(proyectos.userId, ids.bea!))).toHaveLength(0);
  });
});
