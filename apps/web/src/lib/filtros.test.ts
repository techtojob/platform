import { describe, expect, it } from "vitest";
import { aParametros, alternar, hayFiltros, leerFiltros, SIN_FILTROS } from "./filtros";

describe("leer filtros de la dirección", () => {
  it("lee varios valores separados por comas", () => {
    expect(leerFiltros({ area: "desarrollo,datos-ia", nivel: "junior", tec: "react" })).toEqual({
      areas: ["desarrollo", "datos-ia"],
      seniority: ["junior"],
      modalidades: [],
      tecnologias: ["react"],
    });
  });

  it("ignora lo que no existe y los repetidos, sin dar error", () => {
    expect(leerFiltros({ area: "magia", tec: "cobol-de-marte" })).toEqual(SIN_FILTROS);
    expect(leerFiltros({ area: "magia,desarrollo,desarrollo" }).areas).toEqual(["desarrollo"]);
  });

  it("acepta el parámetro repetido (?area=a&area=b)", () => {
    expect(leerFiltros({ area: ["desarrollo", "datos-ia"] }).areas).toEqual(["desarrollo", "datos-ia"]);
  });

  it("guarda la página siguiente", () => {
    expect(leerFiltros({ despues: "abc" }).despues).toBe("abc");
  });
});

describe("escribir filtros en la dirección", () => {
  it("solo pone los que tienen algo", () => {
    expect(aParametros({ ...SIN_FILTROS, modalidades: ["remoto"], tecnologias: ["python", "sql"] })).toEqual({
      modalidad: "remoto",
      tec: "python,sql",
    });
  });

  it("ida y vuelta da lo mismo", () => {
    const f = { ...SIN_FILTROS, areas: ["desarrollo" as const], seniority: ["mid" as const] };
    expect(leerFiltros(aParametros(f))).toEqual(f);
  });
});

describe("poner y quitar filtros", () => {
  it("pone el valor si no estaba y lo quita si estaba", () => {
    const con = alternar(SIN_FILTROS, "seniority", "junior");
    expect(con.seniority).toEqual(["junior"]);
    expect(alternar(con, "seniority", "junior").seniority).toEqual([]);
  });

  it("al cambiar un filtro vuelve a la primera página", () => {
    expect(alternar({ ...SIN_FILTROS, despues: "abc" }, "areas", "desarrollo").despues).toBeUndefined();
  });

  it("sabe si hay alguno puesto", () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, despues: "abc" })).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, tecnologias: ["go"] })).toBe(true);
  });
});
