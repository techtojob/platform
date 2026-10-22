import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { estadoDiscord } from "../src/db/esquema";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  STAFF_EMAILS: "pablo@example.com",
} as never;

let db: Db;
let lucia: Headers;
let pablo: Headers;
let sinVerificar: Headers;
const anonimo = new Headers();

beforeAll(async () => {
  db = await crearDbPrueba();
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const t = (await auth.$context).test;
  // Verificadas (Discord vinculado y en el servidor): para crear perfil hace falta.
  const entrar = async (email: string, name: string, verificada = true) => {
    const u = await t.saveUser(t.createUser({ email, name }));
    if (verificada) await db.insert(estadoDiscord).values({ userId: u.id, discordId: `d-${u.id}`, nombre: name, enServidor: true, roles: [] });
    return (await t.login({ userId: u.id })).headers;
  };
  lucia = await entrar("lucia@example.com", "Lucía Martín");
  pablo = await entrar("pablo@example.com", "Pablo");
  sinVerificar = await entrar("nuevo@example.com", "Nuevo", false);
});

const pedir = async (ruta: string, headers: Headers, init: { method?: string; body?: unknown } = {}) => {
  const h = new Headers(headers);
  if (init.body !== undefined) h.set("content-type", "application/json");
  const res = await crearApp({ db }).request(ruta, { method: init.method ?? "GET", headers: h, body: init.body === undefined ? undefined : JSON.stringify(init.body) }, env);
  return { status: res.status, json: (await res.json()) as any };
};
const alias = (r: { json: { perfiles: Array<{ alias: string }> } }) => r.json.perfiles.map((p) => p.alias).sort();

describe("buscador de talento", () => {
  it("sin sesión solo se ven los públicos, y se dice cuántos más hay entrando", async () => {
    const r = await pedir("/talento", anonimo);
    expect(alias(r)).toEqual(["diego-datos", "nayra-dev"]);
    expect(r.json.ocultosSinSesion).toBe(2);
  });

  it("con sesión se ven también los de solo registrados; los ocultos nunca", async () => {
    const r = await pedir("/talento", lucia);
    expect(alias(r)).toEqual(["diego-datos", "joao-cloud", "laura-sec", "nayra-dev"]);
    expect(r.json.ocultosSinSesion).toBe(0);
    expect(r.json.paises).toEqual({ ES: 2, CO: 1, PT: 1 });
  });

  it("filtra por texto, tecnología, disponibilidad, país y verificados", async () => {
    expect(alias(await pedir("/talento?q=react", lucia))).toEqual(["nayra-dev"]);
    expect(alias(await pedir("/talento?q=data%20engineer", lucia))).toEqual(["diego-datos"]);
    expect(alias(await pedir("/talento?tec=kubernetes", lucia))).toEqual(["joao-cloud"]);
    expect(alias(await pedir("/talento?disp=buscando", lucia))).toEqual(["laura-sec", "nayra-dev"]);
    expect(alias(await pedir("/talento?pais=es", lucia))).toEqual(["laura-sec", "nayra-dev"]);
    expect(alias(await pedir("/talento?verificados=1", lucia))).toEqual(["diego-datos", "joao-cloud", "nayra-dev"]);
    expect(alias(await pedir("/talento?modalidad=presencial", lucia))).toEqual(["laura-sec"]);
    expect((await pedir("/talento?area=nada", lucia)).status).toBe(400);
  });

  it("cada tarjeta lleva verificación y emblemas, y nunca el email", async () => {
    const r = await pedir("/talento?q=nayra", anonimo);
    const [nayra] = r.json.perfiles;
    expect(nayra.verificado).toBe(true);
    expect(nayra.emblemas.map((e: { tipo: string }) => e.tipo)).toEqual(["torneo", "fundador"]);
    expect(JSON.stringify(r.json)).not.toContain("@example.com");
  });
});

describe("mapa del sitio de talento", () => {
  it("solo los perfiles públicos", async () => {
    const r = await pedir("/talento/mapa", anonimo);
    expect(r.json.map((m: { ruta: string }) => m.ruta).sort()).toEqual(["diego-datos", "nayra-dev"]);
  });
});

describe("perfil público", () => {
  it("se ve entero, con enlaces e idiomas", async () => {
    const r = await pedir("/talento/nayra-dev", anonimo);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ alias: "nayra-dev", esMio: false, enlaces: { github: "https://github.com/ejemplo" } });
    expect(r.json.idiomas).toEqual([{ idioma: "es", nivel: "nativo" }, { idioma: "en", nivel: "b2" }]);
  });
  it("los de solo registrados piden iniciar sesión; los ocultos no existen", async () => {
    expect((await pedir("/talento/laura-sec", anonimo)).json.error.codigo).toBe("solo_registrados");
    expect((await pedir("/talento/laura-sec", lucia)).status).toBe(200);
    expect((await pedir("/talento/marta-ux", lucia)).status).toBe(404);
    expect((await pedir("/talento/nadie", lucia)).status).toBe(404);
  });
});

const miPerfil = {
  alias: "lucia",
  nombre: "Lucía Martín",
  titular: "Backend developer junior",
  sobreMi: "Me gusta Node.js",
  area: "desarrollo",
  anosExperiencia: 1,
  ciudad: "Las Palmas",
  pais: "ES",
  modalidades: ["remoto"],
  disponibilidad: "buscando",
  tecnologias: ["nodejs", "postgresql"],
  idiomas: [{ idioma: "es", nivel: "nativo" }],
  linkedin: "linkedin.com/in/lucia",
  github: "",
  portfolio: "",
  foto: "ninguna",
  visibilidad: "publico",
};

describe("mi perfil", () => {
  it("para crear el perfil hay que estar verificado", async () => {
    const r = await pedir("/cuenta/perfil", sinVerificar, { method: "PUT", body: { ...miPerfil, alias: "nuevo-dev" } });
    expect(r.status).toBe(403);
    expect((r.json as { error: { codigo: string } }).error.codigo).toBe("sin_verificar");
  });

  it("el nivel no se elige: sale de los años de experiencia (y de si lidera)", async () => {
    const { nivelPorExperiencia, validarPerfil } = await import("@techtojob/shared");
    expect([0, 1, 2, 3, 5, 6, 16].map((n) => nivelPorExperiencia(n, false))).toEqual(["sin-experiencia", "junior", "junior", "mid", "mid", "senior", "senior"]);
    expect(nivelPorExperiencia(6, true)).toBe("lead");
    expect(nivelPorExperiencia(4, true)).toBe("mid");
    expect(validarPerfil({ ...miPerfil, anosExperiencia: 4, seniority: "lead" }).datos).toMatchObject({ anosExperiencia: 4, seniority: "mid" });
    expect(validarPerfil({ ...miPerfil, anosExperiencia: undefined }).errores).toMatchObject({ anosExperiencia: "falta" });
    expect(validarPerfil({ ...miPerfil, anosExperiencia: 99 }).errores).toMatchObject({ anosExperiencia: "falta" });
  });

  it("sin perfil, propone alias y nombre", async () => {
    const r = await pedir("/cuenta/perfil", lucia);
    expect(r.json).toMatchObject({ perfil: null, sugerencias: { alias: "lucia-martin", nombre: "Lucía Martín" } });
    expect((await pedir("/cuenta/perfil", anonimo)).status).toBe(401);
  });

  it("valida los campos y no deja usar el alias de otra persona", async () => {
    const malo = await pedir("/cuenta/perfil", lucia, { method: "PUT", body: { ...miPerfil, alias: "Lu", github: "gitlab.com/x", modalidades: [] } });
    expect(malo.json.error.campos).toMatchObject({ alias: "corto", github: "url", modalidades: "falta" });
    const ocupado = await pedir("/cuenta/perfil", lucia, { method: "PUT", body: { ...miPerfil, alias: "nayra-dev" } });
    expect(ocupado.json.error.campos).toEqual({ alias: "ocupado" });
    const reservado = await pedir("/cuenta/perfil", lucia, { method: "PUT", body: { ...miPerfil, alias: "staff" } });
    expect(reservado.json.error.campos).toEqual({ alias: "reservado" });
  });

  it("lo crea, completa el enlace de LinkedIn y sale el primero en el buscador", async () => {
    const r = await pedir("/cuenta/perfil", lucia, { method: "PUT", body: miPerfil });
    expect(r.status).toBe(200);
    expect(r.json.perfil).toMatchObject({ alias: "lucia", linkedin: "https://linkedin.com/in/lucia", github: null });
    const lista = await pedir("/talento", anonimo);
    expect(lista.json.perfiles[0].alias).toBe("lucia");
  });

  it("oculto: solo lo ve su dueña", async () => {
    await pedir("/cuenta/perfil", lucia, { method: "PUT", body: { ...miPerfil, visibilidad: "oculto" } });
    expect((await pedir("/talento/lucia", lucia)).json.esMio).toBe(true);
    expect((await pedir("/talento/lucia", pablo)).status).toBe(200); // staff, para revisar reportes
    expect((await pedir("/talento/lucia", anonimo)).status).toBe(404);
    expect(alias(await pedir("/talento", lucia))).not.toContain("lucia");
  });
});

describe("reportes", () => {
  it("hace falta sesión, motivo, y no vale el propio", async () => {
    expect((await pedir("/talento/nayra-dev/reportar", anonimo, { method: "POST", body: { motivo: "Es spam" } })).status).toBe(401);
    expect((await pedir("/talento/nayra-dev/reportar", lucia, { method: "POST", body: { motivo: "x" } })).json.error.codigo).toBe("motivo");
    expect((await pedir("/talento/lucia/reportar", lucia, { method: "POST", body: { motivo: "Prueba propia" } })).json.error.codigo).toBe("propio");
  });

  it("el staff los ve y puede ocultar el perfil", async () => {
    expect((await pedir("/talento/diego-datos/reportar", lucia, { method: "POST", body: { motivo: "Perfil falso" } })).status).toBe(200);
    // Reportar dos veces no duplica.
    await pedir("/talento/diego-datos/reportar", lucia, { method: "POST", body: { motivo: "Perfil falso otra vez" } });
    expect((await pedir("/staff/reportes", lucia)).status).toBe(403);
    const reportes = await pedir("/staff/reportes", pablo);
    expect(reportes.json).toHaveLength(1);
    expect(reportes.json[0]).toMatchObject({ motivo: "Perfil falso", perfil: { alias: "diego-datos" } });
    const tras = await pedir(`/staff/reportes/${reportes.json[0].id}/ocultar`, pablo, { method: "POST" });
    expect(tras.json).toEqual([]);
    expect((await pedir("/talento/diego-datos", lucia)).status).toBe(404);
  });

  it("borrar mi perfil", async () => {
    expect((await pedir("/cuenta/perfil", lucia, { method: "DELETE" })).status).toBe(200);
    expect((await pedir("/cuenta/perfil", lucia)).json.perfil).toBeNull();
  });
});
