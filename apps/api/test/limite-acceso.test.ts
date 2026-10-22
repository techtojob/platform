import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import type { Db } from "../src/db/cliente";
import { crearDbPrueba } from "./db";

const env = {
  ORIGENES_PERMITIDOS: "http://localhost:3000",
  DATABASE_URL: "",
  BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
  WEB_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "id-falso",
  GITHUB_CLIENT_SECRET: "secreto-falso",
} as never;
let db: Db;

beforeAll(async () => {
  db = await crearDbPrueba();
});

const entrar = (ip: string) =>
  crearApp({ db }).request(
    "/api/auth/sign-in/social",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", "cf-connecting-ip": ip },
      body: JSON.stringify({ provider: "github", callbackURL: "http://localhost:3000/empleo" }),
    },
    env,
  );

describe("límite de intentos al entrar", () => {
  it("10 por minuto y por IP; el 11 da 429; otra IP sigue pudiendo", async () => {
    for (let i = 0; i < 10; i++) expect((await entrar("203.0.113.7")).status).toBe(200);
    expect((await entrar("203.0.113.7")).status).toBe(429);
    expect((await entrar("198.51.100.4")).status).toBe(200);
  });

  it("preguntar si hay sesión no cuenta (la landing lo hace en cada página)", async () => {
    for (let i = 0; i < 30; i++) {
      const r = await crearApp({ db }).request("/api/auth/get-session", { headers: { "cf-connecting-ip": "203.0.113.9" } }, env);
      expect(r.status).toBe(200);
    }
  });
});
