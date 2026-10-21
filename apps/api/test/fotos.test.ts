import { fotoElegida } from "@techtojob/shared";
import { describe, expect, it } from "vitest";
import { fotoDelIdToken, fotoGithub } from "../src/servicios/fotos";

const jwt = (datos: object) => `cabecera.${btoa(JSON.stringify(datos)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.firma`;

describe("fotos de Google y GitHub", () => {
  it("la de Google sale del id_token; la de GitHub, del id de la cuenta", () => {
    expect(fotoDelIdToken(jwt({ picture: "https://lh3.googleusercontent.com/a/abc" }))).toBe("https://lh3.googleusercontent.com/a/abc");
    expect(fotoDelIdToken(jwt({ email: "x@y.com" }))).toBeNull();
    expect(fotoDelIdToken(jwt({ picture: "javascript:alert(1)" }))).toBeNull();
    expect(fotoDelIdToken("no-es-un-jwt")).toBeNull();
    expect(fotoDelIdToken(null)).toBeNull();
    expect(fotoGithub("12345")).toBe("https://avatars.githubusercontent.com/u/12345?v=4");
  });

  it("se enseña la elegida; si esa cuenta no está, ninguna", () => {
    const fotos = { google: "https://g/1", github: null };
    expect(fotoElegida("google", fotos)).toBe("https://g/1");
    expect(fotoElegida("github", fotos)).toBeNull();
    expect(fotoElegida("ninguna", fotos)).toBeNull();
  });
});
