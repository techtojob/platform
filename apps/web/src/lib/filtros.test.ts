import { describe, expect, it } from "vitest";
import { aParametros, alternar, cambiar, cuantosFiltros, hayFiltros, leerFiltros, SIN_FILTROS } from "./filtros";

describe("leer filtros de la dirección", () => {
  it("lee varios valores separados por comas", () => {
    expect(leerFiltros({ area: "desarrollo,datos", nivel: "junior", tec: "react" })).toEqual({
      areas: ["desarrollo", "datos"],
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
    expect(leerFiltros({ area: ["desarrollo", "datos"] }).areas).toEqual(["desarrollo", "datos"]);
  });

  it("lee el texto buscado (sin espacios de más, 100 letras como mucho) y el salario", () => {
    const f = leerFiltros({ q: "  data engineer ", salario: "1" });
    expect(f.q).toBe("data engineer");
    expect(f.conSalario).toBe(true);
    expect(leerFiltros({ q: "x".repeat(150) }).q).toHaveLength(100);
    expect(leerFiltros({ salario: "si" }).conSalario).toBeUndefined();
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

  it("cambiar el texto vuelve a la primera página y se escribe en la dirección", () => {
    const f = cambiar({ ...SIN_FILTROS, despues: "abc" }, { q: "react" });
    expect(f.despues).toBeUndefined();
    expect(aParametros(cambiar(f, { conSalario: true }))).toEqual({ q: "react", salario: "1" });
  });

  it("cuenta los filtros puestos sin contar el texto", () => {
    expect(cuantosFiltros({ ...SIN_FILTROS, areas: ["desarrollo"], conSalario: true, q: "data" })).toBe(2);
    expect(hayFiltros({ ...SIN_FILTROS, q: "data" })).toBe(true);
  });

  it("sabe si hay alguno puesto", () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, despues: "abc" })).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, tecnologias: ["go"] })).toBe(true);
  });
});
