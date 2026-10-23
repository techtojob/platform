import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { crearApp } from "../src/app";
import { guardiaDiscord, opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { eq } from "drizzle-orm";
import { cuentas } from "../src/db/esquema";
import { consultarDiscord } from "../src/servicios/discord";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  DISCORD_CLIENT_ID: "cliente",
  DISCORD_CLIENT_SECRET: "secreto",
  DISCORD_BOT_TOKEN: "token-bot",
  DISCORD_SERVIDOR_ID: "servidor-ttj",
  DISCORD_INVITACION: "https://discord.gg/ejemplo",
} as never;

let db: Db;
let cabecerasLucia: Headers;
let idLucia: string;

beforeAll(async () => {
  db = await crearDbPrueba();
  // Una instancia de Better Auth con utilidades de pruebas: crea un usuario y su sesión sin OAuth.
  // (Sin validateUserInfo: saveUser crea el usuario fuera de una petición y la guardia se prueba aparte.)
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const pruebas = (await auth.$context).test;
  const lucia = await pruebas.saveUser(pruebas.createUser({ email: "lucia@example.com", name: "Lucía" }));
  idLucia = lucia.id;
  cabecerasLucia = (await pruebas.login({ userId: lucia.id })).headers;
});

afterEach(() => vi.unstubAllGlobals());

const pedir = (ruta: string, init: RequestInit = {}) => crearApp({ db }).request(ruta, init, env);

describe("Mi cuenta", () => {
  it("sin sesión responde 401", async () => {
    const res = await pedir("/cuenta");
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { codigo: string } }).error.codigo).toBe("sin_sesion");
  });

  it("con sesión dice quién es y que no tiene Discord", async () => {
    const res = await pedir("/cuenta", { headers: cabecerasLucia });
    expect(res.status).toBe(200);
    const cuenta = (await res.json()) as { usuario: { nombre: string }; discord: Record<string, unknown> };
    expect(cuenta.usuario.nombre).toBe("Lucía");
    expect(cuenta.discord).toMatchObject({ disponible: true, vinculado: false, enServidor: false });
  });

  it("con Discord vinculado, el bot comprueba si está en el servidor", async () => {
    await db.insert(cuentas).values({ id: "cta-discord", accountId: "1234", providerId: "discord", userId: idLucia });
    const llamadas: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      llamadas.push(url);
      return Response.json({ roles: ["rol-verificado"], user: { username: "lucia.dev" } });
    });

    const res = await pedir("/cuenta/discord/comprobar", { method: "POST", headers: cabecerasLucia });
    expect(res.status).toBe(200);
    const { discord } = (await res.json()) as { discord: Record<string, unknown> };
    expect(discord).toMatchObject({ vinculado: true, cuentaId: "cta-discord", enServidor: true, nombre: "lucia.dev", roles: ["rol-verificado"] });
    expect(llamadas).toEqual(["https://discord.com/api/v10/guilds/servidor-ttj/members/1234"]);
  });
});

describe("dónde vive (país y región)", () => {
  const poner = (body: unknown) =>
    pedir("/cuenta/ubicacion", { method: "PUT", headers: { ...Object.fromEntries(cabecerasLucia), "content-type": "application/json" }, body: JSON.stringify(body) });

  it("al principio no lo ha puesto", async () => {
    const cuenta = (await (await pedir("/cuenta", { headers: cabecerasLucia })).json()) as { ubicacion: unknown };
    expect(cuenta.ubicacion).toBeNull();
  });

  it("España y Latinoamérica piden región; otros países, no", async () => {
    expect((await poner({ pais: "ES" })).status).toBe(400);
    expect((await poner({ pais: "ES", region: "jalisco" })).status).toBe(400); // no es de España
    expect((await poner({ pais: "XX" })).status).toBe(400);
    const r = await poner({ pais: "es", region: "canarias" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ubicacion: { pais: "ES", region: "canarias" }, pais: "ES" });
    expect(await (await poner({ pais: "MX", region: "jalisco" })).json()).toMatchObject({ ubicacion: { pais: "MX", region: "jalisco" } });
    expect(await (await poner({ pais: "DE", region: "lo-que-sea" })).json()).toMatchObject({ ubicacion: { pais: "DE", region: null } });
  });

  it("al crear el perfil de talento, el país ya viene puesto", async () => {
    await poner({ pais: "CO", region: "antioquia" });
    const mio = (await (await pedir("/cuenta/perfil", { headers: cabecerasLucia })).json()) as { sugerencias: { pais: string } };
    expect(mio.sugerencias.pais).toBe("CO");
  });

  it("sin sesión, no", async () => {
    expect((await pedir("/cuenta/ubicacion", { method: "PUT", body: "{}" })).status).toBe(401);
  });
});

describe("Discord", () => {
  const config = { tokenBot: "t", servidorId: "s" };

  it("si no es miembro (404), lo dice y busca su nombre de usuario", async () => {
    const pedirFalso = (async (url: string) =>
      url.includes("/members/") ? new Response(null, { status: 404 }) : Response.json({ username: "fuera" })) as typeof fetch;
    expect(await consultarDiscord(config, "1", pedirFalso)).toEqual({ enServidor: false, nombre: "fuera", roles: [] });
  });

  it("si Discord falla, lanza un error (y no se borra lo que había)", async () => {
    const pedirFalso = (async () => new Response(null, { status: 500 })) as typeof fetch;
    await expect(consultarDiscord(config, "1", pedirFalso)).rejects.toThrow("500");
  });

  it("ni siquiera se empieza a entrar con Discord", async () => {
    const res = await pedir("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ provider: "discord", callbackURL: "/empleo" }),
    });
    expect(res.status).toBe(403);
  });

  it("con GitHub sí (lleva a github.com)", async () => {
    const res = await crearApp({ db }).request(
      "/api/auth/sign-in/social",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ provider: "github", callbackURL: "/empleo" }),
      },
      { ...(env as object), GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secreto" } as never,
    );
    expect(((await res.json()) as { url: string }).url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize/);
  });

  it("no se puede entrar ni crear cuenta con Discord, solo vincular", () => {
    const discord = (action: string) => ({ action, method: "oauth", oauth: { providerId: "discord" } });
    expect(guardiaDiscord(discord("sign-in"))?.error).toBe("discord_solo_vincular");
    expect(guardiaDiscord(discord("create-user"))?.error).toBe("discord_solo_vincular");
    expect(guardiaDiscord(discord("link-account"))).toBeUndefined();
    expect(guardiaDiscord({ action: "sign-in", oauth: { providerId: "github" } })).toBeUndefined();
  });
});

describe("unir cuentas", () => {
  it("Google y GitHub solo unen cuentas con el email verificado; Discord (solo para vincular) va sin email", () => {
    const opciones = opcionesAuth(db, env);
    expect(opciones.account.accountLinking.trustedProviders).toEqual(["discord"]);
  });
});

describe("formas de entrar: vincular GitHub o Google sin salir", () => {
  const envAmbas = {
    ...(env as object),
    GITHUB_CLIENT_ID: "id-github",
    GITHUB_CLIENT_SECRET: "secreto",
    GOOGLE_CLIENT_ID: "id-google",
    GOOGLE_CLIENT_SECRET: "secreto",
  } as never;
  let cabecerasMarta: Headers;
  let idMarta: string;

  beforeAll(async () => {
    const auth = betterAuth({ ...opcionesAuth(db, envAmbas), user: {}, plugins: [testUtils()] });
    const pruebas = (await auth.$context).test;
    const marta = await pruebas.saveUser(pruebas.createUser({ email: "marta.vincula@example.com", name: "Marta" }));
    idMarta = marta.id;
    // Entró con Google y tiene Discord vinculado.
    await db.insert(cuentas).values([
      { id: "cta-google-marta", accountId: "g-111", providerId: "google", userId: idMarta },
      { id: "cta-discord-marta", accountId: "d-222", providerId: "discord", userId: idMarta },
    ]);
    cabecerasMarta = (await pruebas.login({ userId: idMarta })).headers;
  });

  const conMarta = (ruta: string, init: RequestInit = {}) =>
    crearApp({ db }).request(
      ruta,
      { ...init, headers: { ...Object.fromEntries(cabecerasMarta), "content-type": "application/json", origin: "http://localhost:3000" } },
      envAmbas,
    );
  const quitar = (accountId: string) => conMarta("/api/auth/unlink-account", { method: "POST", body: JSON.stringify({ accountId }) });
  const tiene = async (id: string) => (await db.select().from(cuentas).where(eq(cuentas.id, id))).length === 1;

  it("Mi cuenta enseña Google (vinculado) y GitHub (por vincular), siempre en ese orden", async () => {
    const cuenta = (await (await conMarta("/cuenta")).json()) as { formasDeEntrar: unknown };
    expect(cuenta.formasDeEntrar).toEqual([
      { proveedor: "google", cuentaId: "cta-google-marta" },
      { proveedor: "github", cuentaId: null },
    ]);
  });

  it("sin GitHub configurado, no se ofrece (pero lo que ya tiene vinculado sí sale)", async () => {
    const res = await crearApp({ db }).request("/cuenta", { headers: cabecerasMarta }, env);
    expect(((await res.json()) as { formasDeEntrar: unknown }).formasDeEntrar).toEqual([{ proveedor: "google", cuentaId: "cta-google-marta" }]);
  });

  it("con sesión, vincular GitHub lleva a github.com (y vuelve a Mi cuenta)", async () => {
    const res = await conMarta("/api/auth/link-social", {
      method: "POST",
      body: JSON.stringify({ provider: "github", callbackURL: "/empleo/cuenta/ajustes?vinculada=github", errorCallbackURL: "/empleo/cuenta/ajustes" }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { url: string }).url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?.*state=/);
  });

  it("sin sesión no se puede vincular", async () => {
    const res = await crearApp({ db }).request(
      "/api/auth/link-social",
      { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify({ provider: "github", callbackURL: "/empleo" }) },
      envAmbas,
    );
    expect(res.status).toBe(401);
  });

  it("no deja quitar la única forma de entrar, aunque tenga Discord vinculado", async () => {
    const res = await quitar("cta-google-marta");
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("ultima_forma_de_entrar");
    expect(await tiene("cta-google-marta")).toBe(true);
  });

  it("con Google y GitHub, sí deja quitar una (y después ya no la otra)", async () => {
    await db.insert(cuentas).values({ id: "cta-github-marta", accountId: "gh-333", providerId: "github", userId: idMarta });
    expect((await quitar("cta-github-marta")).status).toBe(200);
    expect(await tiene("cta-github-marta")).toBe(false);
    expect((await quitar("cta-google-marta")).status).toBe(400);
  });

  it("desvincular Discord sigue funcionando", async () => {
    expect((await quitar("cta-discord-marta")).status).toBe(200);
    expect(await tiene("cta-discord-marta")).toBe(false);
  });
});
