import { describe, expect, it } from "vitest";
import { paisDelUsuario, TODOS } from "./pais-usuario";

describe("paisDelUsuario", () => {
  it("lo elegido a mano manda", () => {
    expect(paisDelUsuario({ cookie: "MX", paisConexion: "ES" })).toBe("MX");
  });
  it("si eligió ver todas, ninguno", () => {
    expect(paisDelUsuario({ cookie: TODOS, paisConexion: "ES" })).toBeNull();
  });
  it("si no eligió, el de su perfil antes que el de su conexión", () => {
    expect(paisDelUsuario({ cookie: undefined, paisPerfil: "AR", paisConexion: "ES" })).toBe("AR");
  });
  it("si no eligió ni tiene perfil, el de su conexión", () => {
    expect(paisDelUsuario({ cookie: undefined, paisConexion: "co" })).toBe("CO");
  });
  it("países que no conocemos (o Tor: T1), ninguno", () => {
    expect(paisDelUsuario({ cookie: "XX", paisConexion: "T1" })).toBeNull();
  });
});
