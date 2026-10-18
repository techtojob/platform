import { describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { comprobarSalud } from "../src/servicios/salud";

const env = { ORIGENES_PERMITIDOS: "https://techtojob.com,http://localhost:3000" } as Env;
const app = crearApp();

describe("servicio de salud", () => {
  it("devuelve ok con la fecha", () => {
    expect(comprobarSalud(new Date("2026-10-18T12:00:00Z"))).toEqual({
      estado: "ok",
      servicio: "techtojob-api",
      fecha: "2026-10-18T12:00:00.000Z",
    });
  });
});

describe("GET /salud", () => {
  it("responde 200 con estado ok", async () => {
    const res = await app.request("/salud", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ estado: "ok" });
  });

  it("permite llamadas desde techtojob.com", async () => {
    const res = await app.request("/salud", { headers: { Origin: "https://techtojob.com" } }, env);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://techtojob.com");
  });

  it("no permite llamadas desde otras webs", async () => {
    const res = await app.request("/salud", { headers: { Origin: "https://otra-web.com" } }, env);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("errores", () => {
  it("una ruta que no existe responde 404 con el formato común", async () => {
    const res = await app.request("/no-existe", {}, env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { codigo: "no_encontrado", mensaje: "Esta ruta no existe." },
    });
  });
});
