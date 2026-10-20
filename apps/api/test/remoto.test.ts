import { describirRemoto, ordenarPaises, puedeTrabajarDesde, REGIONES, validarOferta } from "@techtojob/shared";
import { describe, expect, it } from "vitest";

const r = (...paises: string[]) => ({ mundo: false, paises });

describe("describirRemoto", () => {
  it("cualquier país", () => {
    expect(describirRemoto({ mundo: true, paises: [] })).toEqual({ mundo: true });
  });
  it("un país solo", () => {
    expect(describirRemoto(r("MX"))).toEqual({ mundo: false, partes: [{ tipo: "pais", pais: "MX" }] });
  });
  it("si están todos los de una región, la región", () => {
    expect(describirRemoto(r(...REGIONES.latam))).toEqual({ mundo: false, partes: [{ tipo: "region", region: "latam" }] });
  });
  it("España primero, luego regiones, luego el resto", () => {
    expect(describirRemoto(r("US", ...REGIONES.latam, "ES"))).toEqual({
      mundo: false,
      partes: [{ tipo: "pais", pais: "ES" }, { tipo: "region", region: "latam" }, { tipo: "pais", pais: "US" }],
    });
  });
  it("Europa ya incluye España", () => {
    expect(describirRemoto(r(...REGIONES.eu))).toEqual({ mundo: false, partes: [{ tipo: "region", region: "eu" }] });
  });
  it("si falta un país de la región, van sueltos", () => {
    const casi = REGIONES.latam.filter((p) => p !== "BR");
    expect((describirRemoto(r(...casi)) as { partes: unknown[] }).partes).toHaveLength(19);
  });
});

describe("puedeTrabajarDesde", () => {
  it("con la lista o desde cualquier país", () => {
    expect(puedeTrabajarDesde(r("ES", "MX"), "MX")).toBe(true);
    expect(puedeTrabajarDesde(r("ES", "MX"), "mx")).toBe(true);
    expect(puedeTrabajarDesde(r("ES"), "MX")).toBe(false);
    expect(puedeTrabajarDesde({ mundo: true, paises: [] }, "JP")).toBe(true);
    expect(puedeTrabajarDesde(r("ES"), null)).toBe(false);
  });
});

describe("validarOferta: desde dónde", () => {
  const base = {
    empresaId: "e", titulo: "Backend Developer", idioma: "es", urlOriginal: "https://example.com/x",
    area: "desarrollo", seniority: "mid", modalidad: "remoto", idiomasRequeridos: [{ idioma: "es" }],
  };
  it("en remoto hace falta al menos un país o «cualquier país»", () => {
    expect(validarOferta(base).errores?.remotoPaises).toBe("falta");
    expect(validarOferta({ ...base, remotoMundo: true }).datos).toMatchObject({ remotoMundo: true, remotoPaises: [] });
    expect(validarOferta({ ...base, remotoPaises: ["mx", "ES", "MX"] }).datos).toMatchObject({ remotoMundo: false, remotoPaises: ["ES", "MX"] });
  });
  it("códigos que no existen, no", () => {
    expect(validarOferta({ ...base, remotoPaises: ["XX"] }).errores?.remotoPaises).toBe("codigo");
  });
  it("con «cualquier país», la lista se vacía; y si no es remota, no se guarda nada de esto", () => {
    expect(validarOferta({ ...base, remotoMundo: true, remotoPaises: ["ES"] }).datos?.remotoPaises).toEqual([]);
    const presencial = validarOferta({ ...base, modalidad: "presencial", ciudad: "Madrid", remotoMundo: true, remotoPaises: ["ES"] }).datos;
    expect(presencial).toMatchObject({ remotoMundo: false, remotoPaises: [] });
  });
  it("ordenarPaises: España primero y sin repetir", () => {
    expect(ordenarPaises(["US", "es", "MX", "ES"])).toEqual(["ES", "MX", "US"]);
  });
});
