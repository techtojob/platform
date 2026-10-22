import { count, like } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import type { Db } from "../src/db/cliente";
import { cargarDemo, quitarDemo } from "../src/db/datos-demo";
import { ofertas, usuarios } from "../src/db/esquema";
import { crearDbPrueba } from "./db";

const env = { ORIGENES_PERMITIDOS: "http://localhost:3000", DATABASE_URL: "", BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres", WEB_URL: "http://localhost:3000" } as never;
let db: Db;
const pedir = async (ruta: string) => (await (await crearApp({ db }).request(ruta, {}, env)).json()) as Record<string, unknown> & { total: number };
const cuantas = async () => Number((await db.select({ n: count() }).from(ofertas))[0]!.n);

beforeAll(async () => {
  db = await crearDbPrueba();
});

describe("demostración", () => {
  it("se carga (dos veces queda igual) sin tocar lo que había", async () => {
    const antes = await cuantas();
    const r = await cargarDemo(db);
    await cargarDemo(db);
    expect(await cuantas()).toBe(antes + r.ofertas);
    expect((await pedir("/talento")).total).toBeGreaterThanOrEqual(10);
    // El de Hugo no: su perfil es "solo registrados".
    expect((await pedir("/proyectos?orden=siempre")).total).toBe(11);
    expect((await pedir("/portfolios?orden=siempre")).total).toBe(7);
    const mes = (await pedir("/proyectos")) as unknown as { proyectos: Array<{ megustaPeriodo: number }> };
    expect(mes.proyectos[0]!.megustaPeriodo).toBeGreaterThan(0);
  });

  it("se quita y deja lo de antes", async () => {
    const r = await quitarDemo(db);
    expect(r.usuarios).toBe(17);
    expect(await db.select().from(usuarios).where(like(usuarios.id, "demo-usr-%"))).toHaveLength(0);
    expect(await cuantas()).toBe(6);
  });
});
