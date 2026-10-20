import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import type { Db } from "../src/db/cliente";
import { listarOfertas, obtenerOferta } from "../src/servicios/ofertas";
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

describe("desde dónde trabajo", () => {
  const idiomas: Array<"es" | "en"> = ["es", "en"];
  it("desde España: las remotas desde España o Europa, y las híbridas y presenciales en España", async () => {
    const r = await listarOfertas(db, { idiomas, desde: "ES" });
    expect(r.total).toBe(4);
    expect(r.ocultasPorPais).toBe(0);
  });

  it("desde Portugal: solo la remota desde Europa; se avisa de las que quedan fuera", async () => {
    const r = await listarOfertas(db, { idiomas, desde: "PT" });
    expect(titulos(r)).toEqual(["Backend Developer (Node.js)"]);
    expect(r.ocultasPorPais).toBe(3);
  });

  it("desde México: ninguna de las de prueba", async () => {
    const r = await listarOfertas(db, { idiomas, desde: "MX" });
    expect(r.total).toBe(0);
    expect(r.ocultasPorPais).toBe(4);
  });

  it("sin país, todas (y no hay aviso)", async () => {
    const r = await listarOfertas(db, { idiomas });
    expect(r.total).toBe(4);
    expect(r.ocultasPorPais).toBe(0);
  });

  it("la oferta trae la lista de países", async () => {
    const r = await listarOfertas(db, { idiomas, desde: "ES" });
    expect(r.ofertas.find((o) => o.titulo === "Junior Data Engineer")).toMatchObject({ remotoMundo: false, remotoPaises: ["ES"] });
  });
});

describe("buscador", () => {
  const todos = ["es", "en", "de"] as const;

  it("busca en el título sin importar mayúsculas", async () => {
    const r = await listarOfertas(db, { idiomas: [...todos], q: "DATA engineer" });
    expect(titulos(r)).toEqual(["Junior Data Engineer"]);
  });

  it("busca por el nombre de la empresa", async () => {
    const r = await listarOfertas(db, { idiomas: [...todos], q: "teide" });
    expect(titulos(r)).toEqual(["Técnico/a de soporte IT N1"]);
  });

  it("si lo escrito es una tecnología (o un alias), salen sus ofertas", async () => {
    const r = await listarOfertas(db, { idiomas: [...todos], q: "reactjs" });
    expect(titulos(r)).toEqual(["Desarrollador/a Frontend Junior"]);
  });

  it("% y _ se buscan tal cual, no como comodines", async () => {
    const r = await listarOfertas(db, { idiomas: [...todos], q: "%" });
    expect(r.ofertas).toHaveLength(0);
  });

  it("solo con salario publicado", async () => {
    const r = await listarOfertas(db, { idiomas: [...todos], conSalario: true });
    expect(titulos(r)).toEqual(["Backend Developer (Node.js)"]);
  });
});

describe("recuentos de cada filtro (facetas)", () => {
  it("cuentan solo lo que la persona puede ver", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"] });
    expect(r.facetas.area).toEqual({ desarrollo: 2, "datos-ia": 1, "soporte-it": 1 });
    expect(r.facetas.modalidad).toEqual({ hibrido: 1, remoto: 2, presencial: 1 });
  });

  it("cada grupo cuenta con los demás filtros puestos, pero no con el suyo", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"], seniority: ["junior"], modalidades: ["remoto"] });
    // Nivel: no se filtra por nivel, sí por remoto → junior 1 (data), mid 1 (backend).
    expect(r.facetas.seniority).toEqual({ junior: 1, mid: 1 });
    // Modalidad: no se filtra por modalidad, sí por junior → híbrido 1 (frontend), remoto 1 (data).
    expect(r.facetas.modalidad).toEqual({ hibrido: 1, remoto: 1 });
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

  it("el total cuenta todas las páginas, no solo la primera", async () => {
    const r = await listarOfertas(db, { idiomas: ["es", "en"], limite: 2 });
    expect(r.ofertas).toHaveLength(2);
    expect(r.total).toBe(4);
  });
});

describe("una oferta entera", () => {
  it("trae la descripción, el enlace para aplicar y la web de la empresa", async () => {
    const o = await obtenerOferta(db, "p3v8d2xe");
    expect(o?.titulo).toBe("Junior Data Engineer");
    expect(o?.descripcion).toContain("Python");
    expect(o?.urlOriginal).toBe("https://example.com/ofertas/2");
    expect(o?.empresa).toHaveProperty("web");
    expect(o?.idiomasRequeridos).toEqual([{ idioma: "en", nivel: "b2" }]);
  });

  it("no filtra por idiomas: con el enlace se puede ver", async () => {
    expect(await obtenerOferta(db, "m5r1k8vf")).not.toBeNull();
  });

  it("las pendientes de revisar y las que no existen no se ven", async () => {
    expect(await obtenerOferta(db, "b8t3y6np")).toBeNull();
    expect(await obtenerOferta(db, "no-existe")).toBeNull();
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

  it("desde=XX (país que no existe) responde 400", async () => {
    expect((await pedir("?idiomas=es&desde=XX")).status).toBe(400);
    expect((await pedir("?idiomas=es&desde=mx")).status).toBe(200);
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

  it("acepta q y salario", async () => {
    const res = await pedir("?idiomas=es,en&q=backend&salario=1");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { total: number }).total).toBe(1);
    expect((await pedir(`?idiomas=es&q=${"x".repeat(101)}`)).status).toBe(400);
  });

  it("GET /ofertas/:id devuelve la oferta, o 404", async () => {
    const res = await pedir("/k7x2m9qa");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { titulo: string }).titulo).toBe("Desarrollador/a Frontend Junior");

    const no = await pedir("/b8t3y6np");
    expect(no.status).toBe(404);
    expect(((await no.json()) as { error: { codigo: string } }).error.codigo).toBe("no_encontrado");
  });
});

describe("mapa del sitio y Google for Jobs", () => {
  it("GET /ofertas/mapa da las ofertas visibles con su ruta", async () => {
    const res = await crearApp({ db }).request("/ofertas/mapa", {}, { ORIGENES_PERMITIDOS: "http://localhost:3000", DATABASE_URL: "" } as never);
    const mapa = (await res.json()) as Array<{ ruta: string; actualizadaEn: string }>;
    expect(mapa.length).toBe(5); // las 5 publicadas; la pendiente no
    expect(mapa.map((m) => m.ruta)).toContain("frontend-junior-atlantica-labs-k7x2m9qa");
  });

  it("la oferta dice si está autorizada (por defecto no) y cuándo caduca", async () => {
    const oferta = await obtenerOferta(db, "k7x2m9qa");
    expect(oferta).toMatchObject({ autorizada: false });
    expect(oferta?.caducaEn).toBeTruthy();
  });
});
