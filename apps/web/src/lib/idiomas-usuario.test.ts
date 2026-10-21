import { describe, expect, it } from "vitest";
import { idiomasDeCookie, idiomasDelUsuario, idiomasDeNavegador, nombreIdioma } from "./idiomas-usuario";

describe("idiomas del navegador", () => {
  it("ordena por preferencia y quita repetidos y regiones", () => {
    expect(idiomasDeNavegador("es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,fr;q=0.1")).toEqual(["es", "en", "fr"]);
  });
  it("respeta los pesos aunque vengan desordenados", () => {
    expect(idiomasDeNavegador("en;q=0.5,de;q=0.9")).toEqual(["de", "en"]);
  });
  it("ignora idiomas que no están en la lista y los de peso 0", () => {
    expect(idiomasDeNavegador("tlh,es;q=0,en")).toEqual(["en"]);
  });
  it("sin cabecera, nada", () => {
    expect(idiomasDeNavegador(null)).toEqual([]);
  });
});

describe("idiomas elegidos a mano", () => {
  it("lee la cookie", () => {
    expect(idiomasDeCookie("es,en")).toEqual(["es", "en"]);
  });
  it("una cookie sin idiomas válidos no cuenta", () => {
    expect(idiomasDeCookie("xx,")).toBeNull();
  });
});

describe("idiomas del usuario", () => {
  it("la elección a mano manda sobre el navegador", () => {
    expect(idiomasDelUsuario({ cookie: "de", acceptLanguage: "es,en", idiomaWeb: "es" })).toEqual(["de"]);
  });
  it("si no eligió, los del navegador", () => {
    expect(idiomasDelUsuario({ cookie: undefined, acceptLanguage: "es,en;q=0.5", idiomaWeb: "es" })).toEqual(["es", "en"]);
  });
  it("si no hay nada, el idioma de la web", () => {
    expect(idiomasDelUsuario({ cookie: undefined, acceptLanguage: null, idiomaWeb: "en" })).toEqual(["en"]);
  });
});

describe("nombres de idiomas", () => {
  it("en español, con mayúscula al ir solo y en minúscula dentro de una frase", () => {
    expect(nombreIdioma("de", "es")).toBe("Alemán");
    expect(nombreIdioma("de", "es", { enFrase: true })).toBe("alemán");
  });
  it("en inglés, siempre con mayúscula", () => {
    expect(nombreIdioma("de", "en", { enFrase: true })).toBe("German");
  });
});
