import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { validarOfertaUsuario } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { opcionesAuth } from "../src/auth";
import type { Db } from "../src/db/cliente";
import { empresas, ofertas } from "../src/db/esquema";
import { borrarCuenta } from "../src/servicios/cuenta";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  STAFF_EMAILS: "pablo@example.com",
} as never;

let db: Db;
let pablo: Headers; // staff
let ana: Headers; // sube ofertas
let idAna: string;
let bea: Headers; // otra persona
let idBea: string;

beforeAll(async () => {
  db = await crearDbPrueba();
  const auth = betterAuth({ ...opcionesAuth(db, env), user: {}, plugins: [testUtils()] });
  const t = (await auth.$context).test;
  const crear = async (email: string, name: string) => {
    const u = await t.saveUser(t.createUser({ email, name }));
    return { id: u.id, headers: (await t.login({ userId: u.id })).headers };
  };
  pablo = (await crear("pablo@example.com", "Pablo")).headers;
  ({ id: idAna, headers: ana } = await crear("ana@example.com", "Ana"));
  ({ id: idBea, headers: bea } = await crear("bea@example.com", "Bea"));
});

const pedir = (ruta: string, headers: Headers | null, init: { method?: string; body?: unknown } = {}) => {
  const h = new Headers(headers ?? undefined);
  if (init.body !== undefined) h.set("content-type", "application/json");
  return crearApp({ db }).request(
    ruta,
    { method: init.method ?? "GET", headers: h, body: init.body === undefined ? undefined : JSON.stringify(init.body) },
    env,
  );
};

let n = 0;
const oferta = (cambios: Record<string, unknown> = {}) => ({
  empresa: { nombre: "Nube Canaria", web: "https://nubecanaria.example.com" },
  titulo: "Backend Developer",
  resumen: "API en Node.js para una startup de Tenerife.",
  descripcion: "Buscamos a alguien para el equipo de backend.",
  idioma: "es",
  urlOriginal: `https://nubecanaria.example.com/empleo/backend-${++n}`,
  area: "desarrollo",
  seniority: "mid",
  modalidad: "remoto",
  remotoPaises: ["ES", "MX"],
  tecnologias: ["nodejs"],
  idiomasRequeridos: [{ idioma: "es", nivel: null }],
  declaracion: true,
  ...cambios,
});

type Lista = { ofertas: Array<{ id: string; estado: string; titulo: string; motivoRechazo: string | null }>; limite: number; enMarcha: number };
const misOfertas = async (h: Headers) => (await (await pedir("/cuenta/ofertas", h)).json()) as Lista;

describe("validarOfertaUsuario", () => {
  it("pide la empresa, la declaración y que se pueda hacer desde España o Latinoamérica", () => {
    expect(validarOfertaUsuario(oferta()).errores).toBeUndefined();
    expect(validarOfertaUsuario(oferta({ empresa: { nombre: "" } })).errores).toMatchObject({ empresa: "falta" });
    expect(validarOfertaUsuario(oferta({ empresa: { nombre: "Nube", web: "nube" } })).errores).toMatchObject({ empresaWeb: "url" });
    expect(validarOfertaUsuario(oferta({ declaracion: false })).errores).toMatchObject({ declaracion: "falta" });
    expect(validarOfertaUsuario(oferta({ remotoPaises: ["US", "CA"] })).errores).toMatchObject({ remotoPaises: "fuera" });
    expect(validarOfertaUsuario(oferta({ remotoPaises: [], remotoMundo: true })).errores).toBeUndefined();
    expect(validarOfertaUsuario(oferta({ modalidad: "hibrido", pais: "DE", ciudad: "Berlín" })).errores).toMatchObject({ pais: "fuera" });
    expect(validarOfertaUsuario(oferta({ modalidad: "presencial", pais: "AR", ciudad: "Córdoba" })).errores).toBeUndefined();
    // No puede marcarse "autorizada" ni elegir una empresa por id.
    const d = validarOfertaUsuario(oferta({ autorizada: true, empresaId: "emp-otra" })).datos!;
    expect(d).not.toHaveProperty("autorizada");
    expect(d).not.toHaveProperty("empresaId");
  });
});

describe("subir ofertas con tu cuenta", () => {
  it("sin sesión, no", async () => {
    expect((await pedir("/cuenta/ofertas", null)).status).toBe(401);
    expect((await pedir("/cuenta/ofertas", null, { method: "POST", body: oferta() })).status).toBe(401);
  });

  it("con datos mal, dice qué campos", async () => {
    const r = await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta({ titulo: "", declaracion: false }) });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: { campos: Record<string, string> } }).error.campos).toMatchObject({ titulo: "falta", declaracion: "falta" });
  });

  it("entra pendiente, de origen usuario, con su autora; la empresa nueva se crea sin leer su página de empleo", async () => {
    const r = await pedir("/cuenta/ofertas", ana, {
      method: "POST",
      body: oferta({ urlOriginal: "https://jobs.lever.co/nubecanaria/123", autorizada: true }),
    });
    expect(r.status).toBe(201);
    const { id } = (await r.json()) as { id: string };
    const [o] = await db.select().from(ofertas).where(eq(ofertas.id, id));
    expect(o).toMatchObject({ estado: "pendiente", origen: "usuario", autorId: idAna, autorizada: false });
    const [e] = await db.select().from(empresas).where(eq(empresas.id, o!.empresaId));
    expect(e).toMatchObject({ nombre: "Nube Canaria", ats: null, sincronizar: false });

    const lista = await misOfertas(ana);
    expect(lista).toMatchObject({ limite: 3, enMarcha: 1 });
    expect(lista.ofertas[0]).toMatchObject({ id, estado: "pendiente" });
    // Bea no la ve.
    expect((await misOfertas(bea)).ofertas).toHaveLength(0);
  });

  it("la misma oferta (mismo enlace) no se puede subir dos veces", async () => {
    const r = await pedir("/cuenta/ofertas", bea, { method: "POST", body: oferta({ urlOriginal: "https://jobs.lever.co/nubecanaria/123/" }) });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: { codigo: string } }).error.codigo).toBe("repetida");
  });

  it("como mucho 3 a la vez; al retirar una pendiente, deja hueco", async () => {
    expect((await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() })).status).toBe(201);
    expect((await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() })).status).toBe(201);
    const cuarta = await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() });
    expect(cuarta.status).toBe(409);
    expect(((await cuarta.json()) as { error: { codigo: string } }).error.codigo).toBe("limite");

    const { ofertas: mias } = await misOfertas(ana);
    const r = await pedir(`/cuenta/ofertas/${mias[0]!.id}/retirar`, ana, { method: "POST" });
    expect(r.status).toBe(200);
    expect(((await r.json()) as Lista).enMarcha).toBe(2);
    // Una pendiente retirada se borra del todo.
    expect(await db.select().from(ofertas).where(eq(ofertas.id, mias[0]!.id))).toHaveLength(0);
    expect((await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() })).status).toBe(201);
  });

  it("no se pueden retirar las de otra persona", async () => {
    const { ofertas: mias } = await misOfertas(ana);
    expect((await pedir(`/cuenta/ofertas/${mias[0]!.id}/retirar`, bea, { method: "POST" })).status).toBe(404);
  });

  it("el staff la ve con su autora, la publica o la rechaza; la autora ve el motivo", async () => {
    const { ofertas: mias } = await misOfertas(ana);
    const [publicar, rechazar] = [mias[0]!.id, mias[1]!.id];

    const vista = (await (await pedir(`/staff/ofertas/${publicar}`, pablo)).json()) as { origen: string; autor: { nombre: string } };
    expect(vista).toMatchObject({ origen: "usuario", autor: { nombre: "Ana" } });
    const lista = (await (await pedir("/staff/ofertas?origen=usuario", pablo)).json()) as { ofertas: Array<{ origen: string }> };
    expect(lista.ofertas.length).toBe(3);
    expect(lista.ofertas.every((o) => o.origen === "usuario")).toBe(true);

    const p = await pedir(`/staff/ofertas/${publicar}/publicar`, pablo, { method: "POST", body: { comprobaciones: ["empresa", "enlace", "idiomas"] } });
    expect(p.status).toBe(200);
    await pedir(`/staff/ofertas/${rechazar}/rechazar`, pablo, { method: "POST", body: { motivo: "El enlace no funciona." } });

    const despues = await misOfertas(ana);
    expect(despues.ofertas.find((o) => o.id === publicar)).toMatchObject({ estado: "publicada" });
    expect(despues.ofertas.find((o) => o.id === rechazar)).toMatchObject({ estado: "rechazada", motivoRechazo: "El enlace no funciona." });
    // Las rechazadas no cuentan para el límite.
    expect(despues.enMarcha).toBe(2);
  });

  it("al publicar la de enlace de Lever, la empresa aprende su página de empleo", async () => {
    const [o] = await db.select().from(ofertas).where(eq(ofertas.urlOriginal, "https://jobs.lever.co/nubecanaria/123"));
    await pedir(`/staff/ofertas/${o!.id}/publicar`, pablo, { method: "POST", body: { comprobaciones: ["empresa", "enlace", "idiomas"] } });
    const [e] = await db.select().from(empresas).where(eq(empresas.id, o!.empresaId));
    expect(e).toMatchObject({ ats: "lever", atsId: "nubecanaria", sincronizar: true });
  });

  it("retirar una publicada: deja de salir y se ve como retirada", async () => {
    const { ofertas: mias } = await misOfertas(ana);
    const publicada = mias.find((o) => o.estado === "publicada")!;
    await pedir(`/cuenta/ofertas/${publicada.id}/retirar`, ana, { method: "POST" });
    const [o] = await db.select().from(ofertas).where(eq(ofertas.id, publicada.id));
    expect(o!.estado).toBe("cerrada");
    expect((await misOfertas(ana)).ofertas.find((x) => x.id === publicada.id)).toMatchObject({ estado: "retirada", motivoRechazo: null });
    // Ya no se puede retirar otra vez.
    expect((await pedir(`/cuenta/ofertas/${publicada.id}/retirar`, ana, { method: "POST" })).status).toBe(409);
  });

  it("caducada: no cuenta para el límite", async () => {
    const antes = await misOfertas(ana);
    const publicada = antes.ofertas.find((o) => o.estado === "publicada")!;
    await db.update(ofertas).set({ caducaEn: new Date(Date.now() - 1000) }).where(eq(ofertas.id, publicada.id));
    const despues = await misOfertas(ana);
    expect(despues.ofertas.find((o) => o.id === publicada.id)!.estado).toBe("caducada");
    expect(despues.enMarcha).toBe(antes.enMarcha - 1);
  });

  it("una empresa en 'no publicar' no acepta ofertas", async () => {
    await db.update(empresas).set({ bloqueada: true }).where(eq(empresas.nombre, "Nube Canaria"));
    const r = await pedir("/cuenta/ofertas", bea, { method: "POST", body: oferta({ empresa: { nombre: "nube canaria, s.l." } }) });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: { codigo: string } }).error.codigo).toBe("empresa");
    await db.update(empresas).set({ bloqueada: false }).where(eq(empresas.nombre, "Nube Canaria"));
  });

  it("al borrar la cuenta: sus pendientes se borran; las demás se quedan sin autor", async () => {
    const r = await pedir("/cuenta/ofertas", bea, { method: "POST", body: oferta() });
    const { id } = (await r.json()) as { id: string };
    const antes = await db.select().from(ofertas).where(eq(ofertas.autorId, idAna));
    await borrarCuenta(db, idBea);
    expect(await db.select().from(ofertas).where(eq(ofertas.id, id))).toHaveLength(0);
    await borrarCuenta(db, idAna);
    const quedan = await db.select().from(ofertas).where(eq(ofertas.origen, "usuario"));
    expect(quedan.length).toBe(antes.filter((o) => o.estado !== "pendiente").length);
    expect(quedan.every((o) => o.autorId === null)).toBe(true);
  });
});
