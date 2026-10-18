import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import type { Db } from "../src/db/cliente";
import { listarOfertas } from "../src/servicios/ofertas";
import { crearDbPrueba } from "./db";

let db: Db;
beforeAll(async () => {
  db = await crearDbPrueba();
});

const titulos = (r: Awaited<ReturnType<typeof listarOfertas>>) => r.ofertas.map((o) => o.titulo);

describe("filtro por idiomas", () => {
  it("quien solo habla español no ve ofertas que piden inglés", async () => {
    const r = await listarOfertas(db, { idiomas: ["es"] });
    expect(titulos(r)).toEqual(["Desarrollador/a Frontend Junior", "Técnico/a de soporte IT N1"]);
  });

  it("y se le avisa de cuántas hay por idioma", async () => {
    const r = await listarOfertas(db, { idiomas: ["es"] });
    expect(r.ocultasPorIdioma).toEqual({ en: 3, de: 1 });
  });

  it("quien solo habla inglés no ve las que piden español", async () => {
    const r = await listarOfertas(db, { idiomas: ["en"] });
    expect(titulos(r)).toEqual(["Junior Data Engineer"]);
    expect(r.ocultasPorIdioma).toEqual({ es: 3, de: 1 });
  });

  it("quien habla español e inglés ve todo menos lo que pide alemán", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"] });
    expect(titulos(r)).toEqual([
      "Desarrollador/a Frontend Junior",
      "Junior Data Engineer",
      "Técnico/a de soporte IT N1",
      "Backend Developer (Node.js)",
    ]);
    expect(r.ocultasPorIdioma).toEqual({ de: 1 });
  });

  it("las ofertas pendientes de revisar no salen nunca", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en", "de"] });
    expect(titulos(r)).not.toContain("Analista SOC Junior");
    expect(r.ofertas).toHaveLength(5);
  });

  it("devuelve los idiomas que pide cada oferta", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"] });
    const backend = r.ofertas.find((o) => o.titulo.startsWith("Backend"));
    expect(backend?.idiomasRequeridos).toEqual(
      expect.arrayContaining([{ idioma: "en", nivel: "c1" }, { idioma: "es", nivel: null }]),
    );
  });
});

describe("otros filtros", () => {
  it("por nivel y modalidad", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"], seniority: ["junior"], modalidades: ["remoto"] });
    expect(titulos(r)).toEqual(["Junior Data Engineer"]);
  });

  it("por tecnologías (al menos una)", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"], tecnologias: ["typescript"] });
    expect(titulos(r)).toEqual(["Desarrollador/a Frontend Junior", "Backend Developer (Node.js)"]);
  });

  it("el aviso de idiomas respeta los demás filtros", async () => {
    const r = await listarOfertas(db, { idiomas: ["es"], areas: ["datos-ia"] });
    expect(r.ofertas).toHaveLength(0);
    expect(r.ocultasPorIdioma).toEqual({ en: 1 });
  });
});

describe("paginación", () => {
  it("de dos en dos, sin repetir ni saltarse ninguna", async () => {
    const vistas: string[] = [];
    let despues: string | null = null;
    do {
      const r = await listarOfertas(db, { idiomas: ["es", "en", "de"], limite: 2, despues });
      vistas.push(...titulos(r));
      despues = r.siguiente;
    } while (despues);
    expect(vistas).toHaveLength(5);
    expect(new Set(vistas).size).toBe(5);
  });
});

describe("GET /ofertas", () => {
  const env = { ORIGENES_PERMITIDOS: "https://techtojob.com", DATABASE_URL: "" } as never;
  const pedir = (query: string) => crearApp({ db }).request(`/ofertas${query}`, {}, env);

  it("devuelve las ofertas según los idiomas", async () => {
    const res = await pedir("?idiomas=es,en&nivel=junior");
    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as { ofertas: Array<{ titulo: string; empresa: { nombre: string } }> };
    expect(cuerpo.ofertas.map((o) => o.titulo)).toEqual([
      "Desarrollador/a Frontend Junior",
      "Junior Data Engineer",
    ]);
    expect(cuerpo.ofertas[0].empresa.nombre).toBe("Atlántica Labs");
  });

  it("sin idiomas responde 400", async () => {
    const res = await pedir("");
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { codigo: string } }).error.codigo).toBe("peticion_invalida");
  });

  it("con un valor que no existe responde 400", async () => {
    expect((await pedir("?idiomas=es&nivel=experto")).status).toBe(400);
    expect((await pedir("?idiomas=klingon")).status).toBe(400);
  });
});
