import { MOTIVO_SIN_REVISAR, REGIONES } from "@techtojob/shared";
import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ofertas } from "../src/db/esquema";
import { descartarPendientesViejas, desdeEspana, desdeLatam, enParalelo } from "../src/servicios/sincronizar";
import { crearDbPrueba } from "./db";

const r = (...paises: string[]) => ({ mundo: false, paises });

describe("desde España / desde Latinoamérica", () => {
  it("cuenta como España si la incluye (o Europa) o es desde cualquier país; igual con Latinoamérica", () => {
    expect(desdeEspana({ mundo: true, paises: [] })).toBe(true);
    expect(desdeEspana(r("ES"))).toBe(true);
    expect(desdeEspana(r(...REGIONES.eu))).toBe(true);
    expect(desdeEspana(r("MX"))).toBe(false);
    expect(desdeEspana(null)).toBe(false);
    expect(desdeLatam(r("MX"))).toBe(true);
    expect(desdeLatam({ mundo: true, paises: [] })).toBe(true);
    expect(desdeLatam(r("ES"))).toBe(false);
  });

  it("solo entran ofertas que se puedan hacer desde España o Latinoamérica", async () => {
    const { dondeRemoto } = await import("../src/servicios/ats");
    expect(dondeRemoto(["Remote - US"])).toBe("fuera");
    expect(dondeRemoto(["Remote - United Kingdom"])).toBe("fuera");
    expect(dondeRemoto(["Remote - Canada"])).toBe("fuera");
    expect(dondeRemoto(["Remote - US", "Remote - Mexico"])).toEqual(r("MX", "US"));
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
