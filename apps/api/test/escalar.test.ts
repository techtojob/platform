import { MOTIVO_SIN_REVISAR, REGIONES } from "@techtojob/shared";
import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ofertas } from "../src/db/esquema";
import { descartarPendientesViejas, elegir, enParalelo, prioridad } from "../src/servicios/sincronizar";
import { crearDbPrueba } from "./db";

const r = (...paises: string[]) => ({ mundo: false, paises });

describe("prioridad en el cupo", () => {
  it("primero lo que se puede hacer desde España o Latinoamérica", () => {
    expect(prioridad({ mundo: true, paises: [] })).toBe(0);
    expect(prioridad(r("ES"))).toBe(0);
    expect(prioridad(r("MX"))).toBe(0);
    expect(prioridad(r(...REGIONES.eu))).toBe(0); // Europa incluye España
    expect(prioridad(null)).toBe(1);
    expect(prioridad(r("US"))).toBe(2);
    expect(prioridad(r("US", "CA", "GB"))).toBe(2);
  });

  it("elegir: las solo de EE. UU. entran con lo que sobra", () => {
    const c = (id: string, remoto: ReturnType<typeof r> | null, empresa = id) => ({ empresa: { id: empresa }, idioma: "en" as const, oferta: { publicadaEn: null, remoto }, id });
    const lista = [c("us1", r("US")), c("us2", r("US")), c("es1", r("ES")), c("nada", null), c("mx1", r("MX"))];
    const cupos = { total: 3, reservas: { es: 0, en: 3 } };
    expect(elegir(lista, cupos).map((x) => x.id)).toEqual(["es1", "mx1", "nada"]);
    expect(elegir(lista, { total: 5, reservas: { es: 0, en: 5 } }).map((x) => x.id)).toEqual(["es1", "mx1", "nada", "us1", "us2"]);
  });
});

describe("cola del staff", () => {
  it("las automáticas pendientes más de 14 días se descartan solas; las manuales y las recientes, no", async () => {
    const db = await crearDbPrueba();
    const ahora = new Date("2026-10-20T05:00:00Z");
    const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);
    const base = { empresaId: "emp-marea", urlOriginal: "https://example.com/x", idioma: "en" as const, area: "desarrollo" as const, seniority: "mid" as const, modalidad: "remoto" as const, remotoMundo: true, estado: "pendiente" as const };
    await db.insert(ofertas).values([
      { ...base, id: "vieja001", slug: "v1", titulo: "Vieja", origen: "automatica", creadaEn: hace(15) },
      { ...base, id: "nueva001", slug: "n1", titulo: "Nueva", origen: "automatica", creadaEn: hace(3) },
      { ...base, id: "manual01", slug: "m1", titulo: "Manual vieja", origen: "manual", creadaEn: hace(30) },
    ]);
    expect(await descartarPendientesViejas(db, ahora)).toBe(1);
    const filas = await db.select().from(ofertas).where(inArray(ofertas.id, ["vieja001", "nueva001", "manual01"]));
    expect(Object.fromEntries(filas.map((f) => [f.id, f.estado]))).toEqual({ vieja001: "rechazada", nueva001: "pendiente", manual01: "pendiente" });
    expect((await db.select().from(ofertas).where(eq(ofertas.id, "vieja001")))[0]!.motivoRechazo).toBe(MOTIVO_SIN_REVISAR);
    expect(await descartarPendientesViejas(db, ahora)).toBe(0);
  });
});

describe("enParalelo", () => {
  it("como mucho n a la vez y en el mismo orden", async () => {
    let activas = 0;
    let maximo = 0;
    const r = await enParalelo([5, 1, 4, 2, 3], 2, async (n) => {
      activas++;
      maximo = Math.max(maximo, activas);
      await new Promise((ok) => setTimeout(ok, n * 3));
      activas--;
      return n * 10;
    });
    expect(r).toEqual([50, 10, 40, 20, 30]);
    expect(maximo).toBe(2);
  });
});
