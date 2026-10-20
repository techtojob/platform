import { leerFiltrosStaff, MOTIVO_DESAPARECIDA, parametrosStaff } from "@techtojob/shared";
import { eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/cliente";
import { ofertas } from "../src/db/esquema";
import { listarStaff, rechazarVarias, siguienteStaff } from "../src/servicios/lista-staff";
import { crearDbPrueba } from "./db";

const AHORA = new Date("2026-10-20T12:00:00Z");
const hace = (h: number) => new Date(AHORA.getTime() - h * 3_600_000);

let db: Db;
const f = (p: Record<string, string> = {}) => leerFiltrosStaff(p);
const titulos = async (p: Record<string, string> = {}) => (await listarStaff(db, f(p), AHORA)).ofertas.map((o) => o.titulo);

beforeEach(async () => {
  db = await crearDbPrueba();
  // Pendientes de prueba: dos automáticas (una sin resumen y sin zona) y una manual en inglés.
  const base = { empresaId: "emp-marea", urlOriginal: "https://example.com/x", area: "desarrollo" as const, seniority: "mid" as const, estado: "pendiente" as const };
  await db.insert(ofertas).values([
    { ...base, id: "aut00001", slug: "a1", titulo: "Backend Automática", idioma: "es", modalidad: "remoto", remotoPaises: [], origen: "automatica", fuenteAts: "ashby", creadaEn: hace(30) },
    { ...base, id: "aut00002", slug: "a2", titulo: "Data Automática", idioma: "en", modalidad: "remoto", remotoPaises: ["MX", "CO"], resumen: "Nuestro resumen.", origen: "automatica", fuenteAts: "greenhouse", creadaEn: hace(2) },
    { ...base, id: "man00001", slug: "m1", titulo: "Frontend Manual", idioma: "en", modalidad: "presencial", pais: "ES", ciudad: "Madrid", origen: "manual", creadaEn: hace(5) },
  ]);
  // Las pendientes de los datos de prueba, más antiguas que todo esto.
  await db.update(ofertas).set({ creadaEn: hace(24 * 40) }).where(eq(ofertas.estado, "pendiente"));
  await db.update(ofertas).set({ creadaEn: hace(30) }).where(eq(ofertas.id, "aut00001"));
  await db.update(ofertas).set({ creadaEn: hace(2) }).where(eq(ofertas.id, "aut00002"));
  await db.update(ofertas).set({ creadaEn: hace(5) }).where(eq(ofertas.id, "man00001"));
});

describe("leer y escribir los filtros", () => {
  it("lo que no se reconoce se ignora; lo que está por defecto no sale en la dirección", () => {
    const filtros = f({ estado: "publicada", idioma: "xx", atajo: "sin_resumen", orden: "nuevas", desde: "mx", pagina: "2" });
    // "sin resumen" no es un atajo de publicadas.
    expect(filtros).toMatchObject({ estado: "publicada", desde: "MX", orden: "nuevas", pagina: 2 });
    expect(filtros.atajo).toBeUndefined();
    expect(parametrosStaff(filtros)).toEqual({ estado: "publicada", desde: "MX", pagina: "2" });
  });
});

describe("lista del panel", () => {
  it("pendientes: primero lo que más lleva esperando", async () => {
    const t = await titulos({ origen: "automatica" });
    expect(t).toEqual(["Backend Automática", "Data Automática"]);
    expect(await titulos({ origen: "automatica", orden: "nuevas" })).toEqual(["Data Automática", "Backend Automática"]);
  });

  it("atajos con su recuento", async () => {
    const r = await listarStaff(db, f({ atajo: "sin_resumen" }), AHORA);
    expect(r.ofertas.map((o) => o.titulo)).toEqual(["Backend Automática"]);
    expect(r.atajos).toMatchObject({ sin_resumen: 1, sin_zona: 1, hoy: 2 });
    expect(await titulos({ atajo: "sin_zona" })).toEqual(["Backend Automática"]);
    expect(await titulos({ atajo: "hoy" })).toEqual(["Frontend Manual", "Data Automática"]);
  });

  it("idioma, fuente, desde dónde, fecha y búsqueda", async () => {
    expect(await titulos({ idioma: "en", origen: "automatica" })).toEqual(["Data Automática"]);
    expect(await titulos({ fuente: "ashby" })).toEqual(["Backend Automática"]);
    expect(await titulos({ desde: "MX", origen: "automatica" })).toEqual(["Data Automática"]);
    // Desde España: la presencial en Madrid (y las de prueba que se puedan hacer desde España).
    expect(await titulos({ desde: "ES", q: "manual" })).toEqual(["Frontend Manual"]);
    expect(await titulos({ fecha: "hoy" })).toEqual(["Frontend Manual", "Data Automática"]);
    expect(await titulos({ q: "marea", origen: "manual", idioma: "en" })).toContain("Frontend Manual");
  });

  it("cuenta el total y las pestañas", async () => {
    const r = await listarStaff(db, f({ origen: "automatica" }), AHORA);
    expect(r.total).toBe(2);
    expect(r.cuentas.pendiente).toBeGreaterThanOrEqual(3);
  });

  it("cerradas: las que desaparecieron de la web de la empresa", async () => {
    await db.update(ofertas).set({ estado: "cerrada", motivoRechazo: MOTIVO_DESAPARECIDA }).where(eq(ofertas.id, "aut00002"));
    const r = await listarStaff(db, f({ estado: "cerrada", atajo: "desaparecidas" }), AHORA);
    expect(r.ofertas.map((o) => o.id)).toEqual(["aut00002"]);
  });
});

describe("revisar en cadena", () => {
  it("la siguiente con los mismos filtros, sin la actual ni las saltadas", async () => {
    const filtros = f({ fecha: "hoy" });
    expect(await siguienteStaff(db, filtros, null, [], AHORA)).toEqual({ id: "man00001", quedan: 2 });
    expect(await siguienteStaff(db, filtros, "man00001", [], AHORA)).toEqual({ id: "aut00002", quedan: 1 });
    expect(await siguienteStaff(db, filtros, "aut00002", ["man00001"], AHORA)).toEqual({ id: null, quedan: 0 });
  });
});

describe("rechazar varias", () => {
  it("solo las pendientes, con el mismo motivo", async () => {
    await db.update(ofertas).set({ estado: "publicada" }).where(eq(ofertas.id, "man00001"));
    const n = await rechazarVarias(db, ["aut00001", "aut00002", "man00001", "no-existe"], "Empresa que no encaja", "staff-1");
    expect(n).toBe(2);
    const filas = await db.select().from(ofertas).where(inArray(ofertas.id, ["aut00001", "aut00002", "man00001"]));
    expect(filas.map((o) => [o.id, o.estado, o.motivoRechazo])).toEqual(
      expect.arrayContaining([
        ["aut00001", "rechazada", "Empresa que no encaja"],
        ["aut00002", "rechazada", "Empresa que no encaja"],
        ["man00001", "publicada", null],
      ]),
    );
  });

  it("sin motivo, no", async () => {
    await expect(rechazarVarias(db, ["aut00001"], " ", "staff-1")).rejects.toMatchObject({ codigo: "motivo" });
  });
});
