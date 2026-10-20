import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { estadoDiscord, ofertas } from "../src/db/esquema";
import { listarOfertas, obtenerOferta } from "../src/servicios/ofertas";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  DISCORD_SERVIDOR_ID: "servidor-ttj",
  DISCORD_ROL_STAFF: "rol-moderador",
  STAFF_EMAILS: "Pablo@Example.com, jefa@example.com",
} as never;

let db: Db;
let pablo: Headers; // staff por email
let mod: Headers; // staff por el rol de Discord
let lucia: Headers; // usuaria normal
let impostor: Headers; // email de staff, pero sin verificar

beforeAll(async () => {
  db = await crearDbPrueba();
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const t = (await auth.$context).test;
  const crear = async (email: string, name: string) => {
    const u = await t.saveUser(t.createUser({ email, name }));
    return { id: u.id, headers: (await t.login({ userId: u.id })).headers };
  };
  pablo = (await crear("pablo@example.com", "Pablo")).headers;
  const m = await crear("mod@example.com", "Mod");
  mod = m.headers;
  await db.insert(estadoDiscord).values({ userId: m.id, discordId: "999", nombre: "mod", enServidor: true, roles: ["rol-moderador"] });
  lucia = (await crear("lucia@example.com", "Lucía")).headers;
  // Alguien que ha puesto en su cuenta un email de staff que no ha verificado.
  const falso = await t.saveUser(t.createUser({ email: "jefa@example.com", name: "Impostor", emailVerified: false }));
  impostor = (await t.login({ userId: falso.id })).headers;
});

const pedir = (ruta: string, headers: Headers, init: { method?: string; body?: unknown } = {}) => {
  const h = new Headers(headers);
  if (init.body !== undefined) h.set("content-type", "application/json");
  return crearApp({ db }).request(
    ruta,
    { method: init.method ?? "GET", headers: h, body: init.body === undefined ? undefined : JSON.stringify(init.body) },
    env,
  );
};

const nueva = {
  empresaId: "emp-teide",
  titulo: "QA Tester Junior",
  resumen: "Pruebas manuales y automáticas.",
  idioma: "es",
  urlOriginal: "https://teide.example.com/empleo/qa",
  area: "desarrollo",
  seniority: "junior",
  modalidad: "remoto",
  remotoDesde: "es",
  tecnologias: ["typescript"],
  idiomasRequeridos: [{ idioma: "es", nivel: "nativo" }],
  autorizada: true,
};

describe("quién entra al panel", () => {
  it("sin sesión, 401", async () => {
    expect((await pedir("/staff/ofertas", new Headers())).status).toBe(401);
  });
  it("con un email de staff sin verificar, 403", async () => {
    expect((await pedir("/staff/ofertas", impostor)).status).toBe(403);
  });
  it("una usuaria normal, 403", async () => {
    expect((await pedir("/staff/ofertas", lucia)).status).toBe(403);
  });
  it("staff por email (sin importar mayúsculas) y por rol de Discord", async () => {
    expect((await pedir("/staff/ofertas", pablo)).status).toBe(200);
    expect((await pedir("/staff/ofertas", mod)).status).toBe(200);
  });
  it("/cuenta dice si es staff", async () => {
    const yo = async (h: Headers) => ((await (await pedir("/cuenta", h)).json()) as { esStaff: boolean }).esStaff;
    expect(await yo(pablo)).toBe(true);
    expect(await yo(mod)).toBe(true);
    expect(await yo(lucia)).toBe(false);
  });
  it("si el moderador sale del servidor, deja de ser staff", async () => {
    await db.update(estadoDiscord).set({ enServidor: false }).where(eq(estadoDiscord.discordId, "999"));
    expect((await pedir("/staff/ofertas", mod)).status).toBe(403);
    await db.update(estadoDiscord).set({ enServidor: true }).where(eq(estadoDiscord.discordId, "999"));
  });
});

describe("ofertas desde el panel", () => {
  it("lista las pendientes y cuenta cada estado", async () => {
    const r = (await (await pedir("/staff/ofertas?estado=pendiente", pablo)).json()) as {
      ofertas: Array<{ estado: string }>;
      cuentas: Record<string, number>;
    };
    expect(r.ofertas.length).toBeGreaterThan(0);
    expect(r.ofertas.every((o) => o.estado === "pendiente")).toBe(true);
    expect(r.cuentas.pendiente).toBe(r.ofertas.length);
  });

  it("valida los datos y dice qué campo está mal", async () => {
    const res = await pedir("/staff/ofertas", pablo, { method: "POST", body: { ...nueva, urlOriginal: "teide", idiomasRequeridos: [] } });
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as { error: { campos: Record<string, string> } };
    expect(error.campos).toEqual({ urlOriginal: "url", idiomasRequeridos: "falta" });
  });

  it("crear → pendiente (no sale en la bolsa) → publicar con las comprobaciones → sale 45 días", async () => {
    const res = await pedir("/staff/ofertas", pablo, { method: "POST", body: nueva });
    expect(res.status).toBe(201);
    const creada = (await res.json()) as { id: string; slug: string; estado: string; idiomasRequeridos: unknown[] };
    expect(creada).toMatchObject({ estado: "pendiente", slug: "qa-tester-junior-teide-software" });
    expect(creada.id).toMatch(/^[a-z0-9]{8}$/);
    expect(creada.idiomasRequeridos).toEqual([{ idioma: "es", nivel: "nativo" }]);
    expect(creada).toMatchObject({ autorizada: true });
    expect(await obtenerOferta(db, creada.id)).toBeNull();

    // Sin todas las comprobaciones, no se publica.
    const sin = await pedir(`/staff/ofertas/${creada.id}/publicar`, pablo, { method: "POST", body: { comprobaciones: ["empresa"] } });
    expect(sin.status).toBe(400);

    const pub = await pedir(`/staff/ofertas/${creada.id}/publicar`, pablo, {
      method: "POST",
      body: { comprobaciones: ["empresa", "enlace", "idiomas"] },
    });
    const publicada = (await pub.json()) as { estado: string; publicadaEn: string; caducaEn: string };
    expect(publicada.estado).toBe("publicada");
    const dias = (Date.parse(publicada.caducaEn) - Date.parse(publicada.publicadaEn)) / 86_400_000;
    expect(Math.round(dias)).toBe(45);
    expect(await obtenerOferta(db, creada.id)).not.toBeNull();
  });

  it("editar cambia los datos y el slug", async () => {
    const [o] = await db.select({ id: ofertas.id }).from(ofertas).where(eq(ofertas.titulo, "QA Tester Junior"));
    const res = await pedir(`/staff/ofertas/${o!.id}`, pablo, { method: "PUT", body: { ...nueva, titulo: "QA Tester" } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { slug: string }).slug).toBe("qa-tester-teide-software");
  });

  it("rechazar pide un motivo", async () => {
    const { ofertas: pendientes } = (await (await pedir("/staff/ofertas", pablo)).json()) as { ofertas: Array<{ id: string }> };
    const id = pendientes[0]!.id;
    expect((await pedir(`/staff/ofertas/${id}/rechazar`, pablo, { method: "POST", body: {} })).status).toBe(400);
    const res = await pedir(`/staff/ofertas/${id}/rechazar`, pablo, { method: "POST", body: { motivo: "El enlace no funciona" } });
    expect(await res.json()).toMatchObject({ estado: "rechazada", motivoRechazo: "El enlace no funciona" });
  });

  it("cerrar la quita de la bolsa; alargar solo con publicadas", async () => {
    const [o] = await db.select({ id: ofertas.id }).from(ofertas).where(eq(ofertas.titulo, "QA Tester"));
    const antes = Date.parse(((await (await pedir(`/staff/ofertas/${o!.id}`, pablo)).json()) as { caducaEn: string }).caducaEn);
    const alargada = (await (await pedir(`/staff/ofertas/${o!.id}/alargar`, pablo, { method: "POST" })).json()) as { caducaEn: string };
    expect(Math.round((Date.parse(alargada.caducaEn) - antes) / 86_400_000)).toBe(45);

    await pedir(`/staff/ofertas/${o!.id}/cerrar`, pablo, { method: "POST" });
    expect(await obtenerOferta(db, o!.id)).toBeNull();
    expect((await pedir(`/staff/ofertas/${o!.id}/alargar`, pablo, { method: "POST" })).status).toBe(409);
  });

  it("una oferta inexistente da 404", async () => {
    expect((await pedir("/staff/ofertas/nada/cerrar", pablo, { method: "POST" })).status).toBe(404);
  });
});

describe("caducidad", () => {
  it("las ofertas caducadas no salen en la bolsa ni en su página", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en", "de"] });
    const id = r.ofertas[0]!.id;
    await db.update(ofertas).set({ caducaEn: new Date(Date.now() - 1000) }).where(eq(ofertas.id, id));
    expect((await listarOfertas(db, { idiomas: ["es", "en", "de"] })).ofertas.map((o) => o.id)).not.toContain(id);
    expect(await obtenerOferta(db, id)).toBeNull();
    await db.update(ofertas).set({ caducaEn: null }).where(eq(ofertas.id, id));
  });
});

describe("empresas", () => {
  it("crea una empresa con slug único y no duplica nombres", async () => {
    const a = (await (await pedir("/staff/empresas", pablo, { method: "POST", body: { nombre: "Guanche Tech", web: "https://guanche.example.com" } })).json()) as { id: string; slug: string };
    expect(a.slug).toBe("guanche-tech");
    const b = (await (await pedir("/staff/empresas", pablo, { method: "POST", body: { nombre: "guanche tech" } })).json()) as { id: string };
    expect(b.id).toBe(a.id);
    expect((await pedir("/staff/empresas", pablo, { method: "POST", body: { nombre: "x" } })).status).toBe(400);
    const lista = (await (await pedir("/staff/empresas", pablo)).json()) as Array<{ nombre: string; ofertas: number }>;
    expect(lista.find((e) => e.nombre === "Teide Software")!.ofertas).toBeGreaterThan(0);
  });
});
