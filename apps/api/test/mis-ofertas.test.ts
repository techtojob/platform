import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { esEmailDeLaEmpresa, validarOfertaUsuario, validarSolicitudRecruiter } from "@techtojob/shared";
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
    expect(validarOfertaUsuario(oferta({ empresa: { nombre: "Nube", web: "nube con espacios" } })).errores).toMatchObject({ empresaWeb: "url" });
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

const solicitud = (cambios: Record<string, unknown> = {}) => ({
  cargo: "recruiter",
  empresa: "Nube Canaria",
  web: "https://www.nubecanaria.example.com",
  linkedin: "https://www.linkedin.com/in/ana-recruiter",
  mensaje: "Contratamos 3 personas este trimestre.",
  ...cambios,
});
type MiRecruiter = { estado: string; motivo: string | null; emailEmpresa: boolean; agencia: boolean };
const cuenta = async (h: Headers) => (await (await pedir("/cuenta", h)).json()) as { recruiter: { estado: string; agencia: boolean; empresa: string } | null };

describe("validar la solicitud de recruiter", () => {
  it("pide cargo, empresa y un LinkedIn de verdad", () => {
    expect(validarSolicitudRecruiter(solicitud()).errores).toBeUndefined();
    expect(validarSolicitudRecruiter(solicitud({ cargo: "jefe" })).errores).toMatchObject({ cargo: "falta" });
    expect(validarSolicitudRecruiter(solicitud({ empresa: "" })).errores).toMatchObject({ empresa: "falta" });
    expect(validarSolicitudRecruiter(solicitud({ linkedin: "" })).errores).toMatchObject({ linkedin: "falta" });
    expect(validarSolicitudRecruiter(solicitud({ linkedin: "https://linkedin.com.evil.example/in/x" })).errores).toMatchObject({ linkedin: "linkedin" });
    expect(validarSolicitudRecruiter(solicitud({ linkedin: "https://es.linkedin.com/in/ana" })).errores).toBeUndefined();
    // Sin https:// (como se copia a mano): se pone solo.
    expect(validarSolicitudRecruiter(solicitud({ linkedin: "www.linkedin.com/in/pablo-pio-ramos", web: "nube.example.com" })).datos).toMatchObject({
      linkedin: "https://www.linkedin.com/in/pablo-pio-ramos",
      web: "https://nube.example.com",
    });
    expect(validarSolicitudRecruiter(solicitud({ web: "nube con espacios" })).errores).toMatchObject({ web: "url" });
  });

  it("email de la empresa: mismo dominio que la web, nunca uno gratuito", () => {
    expect(esEmailDeLaEmpresa("ana@volcandata.com", "https://www.volcandata.com")).toBe(true);
    expect(esEmailDeLaEmpresa("ana@es.volcandata.com", "https://careers.volcandata.com/jobs")).toBe(true);
    expect(esEmailDeLaEmpresa("ana@empresa.com.mx", "https://empresa.com.mx")).toBe(true);
    expect(esEmailDeLaEmpresa("ana@otra.com.mx", "https://empresa.com.mx")).toBe(false);
    expect(esEmailDeLaEmpresa("ana@gmail.com", "https://gmail.com")).toBe(false);
    expect(esEmailDeLaEmpresa("ana@volcandata.com", null)).toBe(false);
  });
});

describe("registrarse como recruiter", () => {
  it("sin ser recruiter no se puede subir ni rellenar desde el enlace", async () => {
    const r = await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: { codigo: string } }).error.codigo).toBe("no_recruiter");
    expect((await pedir("/cuenta/ofertas/importar", ana, { method: "POST", body: { url: "https://example.com/x" } })).status).toBe(403);
    expect(await (await pedir("/cuenta/recruiter", ana)).json()).toBeNull();
    expect((await cuenta(ana)).recruiter).toBeNull();
  });

  it("se registra al momento (sin que lo apruebe nadie) y aún no crea la empresa", async () => {
    expect((await pedir("/cuenta/recruiter", ana, { method: "PUT", body: solicitud({ linkedin: "" }) })).status).toBe(400);
    const r = await pedir("/cuenta/recruiter", ana, { method: "PUT", body: solicitud() });
    expect(r.status).toBe(200);
    // ana@example.com y la web nubecanaria.example.com: mismo dominio.
    expect(await r.json()).toMatchObject({ estado: "activo", emailEmpresa: true, agencia: false, empresaId: null });
    expect((await cuenta(ana)).recruiter).toMatchObject({ estado: "activo", empresa: "Nube Canaria" });
    expect(await db.select().from(empresas).where(eq(empresas.nombre, "Nube Canaria"))).toHaveLength(0);
    await pedir("/cuenta/recruiter", bea, { method: "PUT", body: solicitud({ empresa: "Talento Rápido", web: "https://talentorapido.dev", cargo: "otro" }) });
  });

  it("puede cambiar sus datos cuando quiera", async () => {
    const r = (await (await pedir("/cuenta/recruiter", ana, { method: "PUT", body: solicitud({ cargo: "rrhh" }) })).json()) as { cargo: string };
    expect(r.cargo).toBe("rrhh");
    await pedir("/cuenta/recruiter", ana, { method: "PUT", body: solicitud() });
  });

  it("solo el staff ve la lista y marca agencias", async () => {
    expect((await pedir("/staff/recruiters", ana)).status).toBe(403);
    const lista = (await (await pedir("/staff/recruiters", pablo)).json()) as { recruiters: Array<{ usuario: { nombre: string }; emailEmpresa: boolean }>; cuentas: Record<string, number> };
    expect(lista.cuentas).toMatchObject({ activo: 2 });
    expect(lista.recruiters.map((r) => [r.usuario.nombre, r.emailEmpresa]).sort()).toEqual([["Ana", true], ["Bea", false]]);
    // Bea es de una agencia: puede publicar de cualquier empresa.
    expect((await pedir(`/staff/recruiters/${idBea}/agencia`, pablo, { method: "POST", body: { agencia: true } })).status).toBe(200);
    expect((await cuenta(bea)).recruiter).toMatchObject({ estado: "activo", agencia: true });
  });
});

describe("subir ofertas (recruiters)", () => {
  it("sin sesión, no", async () => {
    expect((await pedir("/cuenta/ofertas", null)).status).toBe(401);
    expect((await pedir("/cuenta/ofertas", null, { method: "POST", body: oferta() })).status).toBe(401);
  });

  it("un recruiter que no es agencia publica siempre de su empresa (se crea con su primera oferta)", async () => {
    const r = await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta({ empresa: { nombre: "Google" } }) });
    expect(r.status).toBe(201);
    const { id } = (await r.json()) as { id: string };
    const [o] = await db.select({ empresa: empresas.nombre }).from(ofertas).innerJoin(empresas, eq(empresas.id, ofertas.empresaId)).where(eq(ofertas.id, id));
    expect(o!.empresa).toBe("Nube Canaria");
    expect(((await (await pedir("/cuenta/recruiter", ana)).json()) as { empresaId: string | null }).empresaId).not.toBeNull();
    await pedir(`/cuenta/ofertas/${id}/retirar`, ana, { method: "POST" });
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
    expect(o).toMatchObject({ estado: "pendiente", origen: "usuario", autorId: idAna, autorizada: true });
    const [e] = await db.select().from(empresas).where(eq(empresas.id, o!.empresaId));
    expect(e).toMatchObject({ nombre: "Nube Canaria", ats: null, sincronizar: false });

    const lista = await misOfertas(ana);
    expect(lista).toMatchObject({ limite: 3, enMarcha: 1 });
    expect(lista.ofertas[0]).toMatchObject({ id, estado: "pendiente" });
    // Bea no la ve.
    expect((await misOfertas(bea)).ofertas).toHaveLength(0);
    // La página de empleo no se aprende al subirla (solo cuando el staff la publica).
    expect(e!.ats).toBeNull();
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
    expect(vista).toMatchObject({
      origen: "usuario",
      autor: { nombre: "Ana", recruiter: { cargo: "recruiter", empresa: "Nube Canaria", linkedin: "https://www.linkedin.com/in/ana-recruiter", emailEmpresa: true, agencia: false } },
    });
    const lista = (await (await pedir("/staff/ofertas?origen=usuario", pablo)).json()) as { ofertas: Array<{ origen: string }> };
    expect(lista.ofertas.length).toBe(3);
    expect(lista.ofertas.every((o) => o.origen === "usuario")).toBe(true);

    const p = await pedir(`/staff/ofertas/${publicar}/publicar`, pablo, { method: "POST", body: { comprobaciones: ["empresa", "enlace", "idiomas"] } });
    expect(p.status).toBe(200);
    // En la bolsa sale quién la publicó, con el emblema de recruiter verificado.
    const publica = (await (await pedir(`/ofertas/${publicar}`, null)).json()) as { recruiter: unknown };
    expect(publica.recruiter).toEqual({ nombre: "Ana", cargo: "recruiter", empresa: "Nube Canaria" });
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

  it("reportar una oferta o a quien la publicó (con sesión, una vez, nunca la propia)", async () => {
    const publicada = (await db.select().from(ofertas).where(eq(ofertas.autorId, idAna))).find((o) => o.estado === "publicada")!;
    await db.update(ofertas).set({ caducaEn: new Date(Date.now() + 86_400_000) }).where(eq(ofertas.id, publicada.id));
    const reportar = (h: Headers | null, body: unknown) => pedir(`/ofertas/${publicada.id}/reportar`, h, { method: "POST", body });
    expect((await reportar(null, { motivo: "Oferta falsa, no existe." })).status).toBe(401);
    expect((await reportar(bea, { motivo: "no" })).status).toBe(400);
    expect((await reportar(ana, { motivo: "Me reporto a mí misma." })).status).toBe(400);
    expect((await reportar(bea, { motivo: "El enlace no funciona." })).status).toBe(200);
    expect((await reportar(bea, { motivo: "Otra vez lo mismo." })).status).toBe(200); // no se duplica
    expect((await reportar(bea, { motivo: "Se hace pasar por la empresa.", sobre: "recruiter" })).status).toBe(200);
    expect((await pedir("/ofertas/no-existe/reportar", bea, { method: "POST", body: { motivo: "No existe esta oferta." } })).status).toBe(404);

    expect(await (await pedir("/staff/reportes/resumen", pablo)).json()).toEqual({ perfiles: 0, ofertas: 1, recruiters: 1 });
    expect(((await (await pedir("/staff/ofertas", pablo)).json()) as { reportes: number }).reportes).toBe(2);
    expect((await pedir("/staff/reportes-ofertas", bea)).status).toBe(403);
    const deOfertas = (await (await pedir("/staff/reportes-ofertas", pablo)).json()) as Array<{ id: string; motivo: string; oferta: { id: string; empresa: string } }>;
    expect(deOfertas).toHaveLength(1);
    expect(deOfertas[0]).toMatchObject({ motivo: "El enlace no funciona.", oferta: { id: publicada.id, empresa: "Nube Canaria" } });
    const deRecruiters = (await (await pedir("/staff/reportes-recruiters", pablo)).json()) as Array<{ id: string; recruiter: { nombre: string; estado: string } }>;
    expect(deRecruiters[0]).toMatchObject({ recruiter: { nombre: "Ana", estado: "activo" } });

    // Descartar el de la oferta; el del recruiter se queda para el siguiente test.
    expect((await pedir(`/staff/reportes-ofertas/${deOfertas[0]!.id}/descartar`, pablo, { method: "POST" })).status).toBe(200);
    expect(await (await pedir("/staff/reportes/resumen", pablo)).json()).toMatchObject({ ofertas: 0, recruiters: 1 });
    // Cerrar la oferta desde un reporte: deja de salir.
    await db.update(ofertas).set({ estado: "publicada" }).where(eq(ofertas.id, publicada.id));
    await pedir(`/ofertas/${publicada.id}/reportar`, pablo, { method: "POST", body: { motivo: "Ya no está disponible." } });
    const [otro] = (await (await pedir("/staff/reportes-ofertas", pablo)).json()) as Array<{ id: string }>;
    expect((await pedir(`/staff/reportes-ofertas/${otro!.id}/cerrar`, pablo, { method: "POST" })).status).toBe(200);
    expect((await db.select().from(ofertas).where(eq(ofertas.id, publicada.id)))[0]!.estado).toBe("cerrada");
    await db.update(ofertas).set({ estado: "publicada" }).where(eq(ofertas.id, publicada.id));
  });

  it("bloquear desde un reporte de recruiter (con motivo)", async () => {
    const [rep] = (await (await pedir("/staff/reportes-recruiters", pablo)).json()) as Array<{ id: string }>;
    expect((await pedir(`/staff/reportes-recruiters/${rep!.id}/bloquear`, pablo, { method: "POST", body: {} })).status).toBe(400);
    expect((await pedir(`/staff/reportes-recruiters/${rep!.id}/bloquear`, pablo, { method: "POST", body: { motivo: "Se hace pasar por otra empresa." } })).status).toBe(200);
    expect(await (await pedir("/cuenta/recruiter", ana)).json()).toMatchObject({ estado: "bloqueado" });
    expect(await (await pedir("/staff/reportes/resumen", pablo)).json()).toMatchObject({ recruiters: 0 });
    await pedir(`/staff/recruiters/${idAna}/desbloquear`, pablo, { method: "POST" });
  });

  it("bloquearlo: sus pendientes se descartan, ya no publica ni cambia sus datos y la bolsa no dice quién es", async () => {
    const nueva = (await (await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() })).json()) as { id: string };
    const publicada = (await db.select().from(ofertas).where(eq(ofertas.autorId, idAna))).find((o) => o.estado === "publicada");
    expect((await pedir(`/staff/recruiters/${idAna}/bloquear`, pablo, { method: "POST", body: { motivo: "" } })).status).toBe(400);
    expect((await pedir(`/staff/recruiters/${idAna}/bloquear`, pablo, { method: "POST", body: { motivo: "Ofertas falsas." } })).status).toBe(200);
    expect(await (await pedir("/cuenta/recruiter", ana)).json()).toMatchObject({ estado: "bloqueado", motivo: "Ofertas falsas." });
    const [o] = await db.select().from(ofertas).where(eq(ofertas.id, nueva.id));
    expect(o).toMatchObject({ estado: "rechazada", motivoRechazo: "La cuenta de recruiter está bloqueada." });
    expect((await pedir("/cuenta/ofertas", ana, { method: "POST", body: oferta() })).status).toBe(403);
    expect((await pedir("/cuenta/recruiter", ana, { method: "PUT", body: solicitud() })).status).toBe(409);
    if (publicada) {
      await db.update(ofertas).set({ caducaEn: new Date(Date.now() + 86_400_000) }).where(eq(ofertas.id, publicada.id));
      expect(((await (await pedir(`/ofertas/${publicada.id}`, null)).json()) as { recruiter: unknown }).recruiter).toBeNull();
    }
    // Desbloquearlo: vuelve a poder publicar.
    expect((await pedir(`/staff/recruiters/${idAna}/desbloquear`, pablo, { method: "POST" })).status).toBe(200);
    expect((await cuenta(ana)).recruiter).toMatchObject({ estado: "activo" });
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
