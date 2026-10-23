import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/cliente";
import { buscarRepetida, htmlATexto, importarOferta, leerHasta, type Pedir } from "../src/servicios/importar";
import { crearDbPrueba } from "./db";

let db: Db;
beforeAll(async () => {
  db = await crearDbPrueba();
});

const pagina = (html: string, tipo = "text/html; charset=utf-8"): Pedir => async () =>
  new Response(html, { headers: { "content-type": tipo } });

const jobPosting = (datos: object) =>
  `<html><head><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...datos })}</script></head><body></body></html>`;

describe("importar una oferta desde su enlace", () => {
  it("lee el JobPosting y adivina tecnologías, idiomas, área y nivel", async () => {
    const html = jobPosting({
      "@type": "JobPosting",
      title: "Junior Data Engineer",
      hiringOrganization: { "@type": "Organization", name: "Volcán Data, S.L.", sameAs: "https://volcan.example.com" },
      description:
        "<p>Únete a nuestro equipo de datos en Tenerife.</p><ul><li>Experiencia con Python y SQL</li><li>Valorable Apache Airflow y dbt</li></ul><p>Imprescindible inglés B2. Buscamos personas con ganas de aprender y crecer con nosotros.</p>",
      jobLocation: { "@type": "Place", address: { addressLocality: "Santa Cruz de Tenerife", addressCountry: "ES" } },
      baseSalary: { "@type": "MonetaryAmount", currency: "EUR", value: { "@type": "QuantitativeValue", minValue: 2000, maxValue: 2500, unitText: "MONTH" } },
    });
    const r = await importarOferta(db, "https://volcan.example.com/empleo/data", pagina(html));
    expect(r).toMatchObject({
      fuente: "datos",
      repetida: null,
      titulo: "Junior Data Engineer",
      empresa: { id: "emp-volcan", nombre: "Volcán Data" },
      ciudad: "Santa Cruz de Tenerife",
      pais: "ES",
      modalidad: "presencial",
      salarioMin: 24000,
      salarioMax: 30000,
      moneda: "EUR",
      idioma: "es",
      area: "datos",
      seniority: "junior",
      resumen: "Únete a nuestro equipo de datos en Tenerife.",
    });
    expect(r.tecnologias).toEqual(["python", "sql", "airflow", "dbt"]);
    expect(r.idiomasRequeridos).toEqual([
      { idioma: "es", nivel: null },
      { idioma: "en", nivel: "b2" },
    ]);
    expect(r.descripcion).toContain("• Experiencia con Python y SQL");
  });

  it("entiende el remoto y el JobPosting dentro de @graph", async () => {
    const html = jobPosting({
      "@graph": [
        { "@type": "WebPage", name: "Empleo" },
        {
          "@type": "JobPosting",
          title: "Senior Backend Developer",
          hiringOrganization: { name: "Nueva Empresa Inc" },
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: { "@type": "Country", name: "Spain" },
          description: "We are looking for a backend developer with Go and Kubernetes experience. Fluent English is required for this role.",
        },
      ],
    });
    const r = await importarOferta(db, "https://nueva.example.com/jobs/1", pagina(html));
    expect(r).toMatchObject({
      fuente: "datos",
      modalidad: "remoto",
      remoto: { mundo: false, paises: ["ES"] },
      empresa: { id: null, nombre: "Nueva Empresa Inc" },
      idioma: "en",
      seniority: "senior",
      area: "desarrollo",
    });
    expect(r.tecnologias).toEqual(["go", "kubernetes"]);
    expect(r.idiomasRequeridos).toEqual([{ idioma: "en", nivel: "c1" }]);
  });

  it("sin JobPosting, usa el título y la descripción de la página", async () => {
    const html = `<html><head><title>QA Tester | Teide Software</title><meta name="description" content="Buscamos QA con Playwright y TypeScript"></head></html>`;
    const r = await importarOferta(db, "https://teide.example.com/qa", pagina(html));
    expect(r).toMatchObject({ fuente: "pagina", titulo: "QA Tester | Teide Software", tecnologias: ["typescript"] });
  });

  it("si la página no abre, no es HTML o es una dirección interna, fuente 'nada'", async () => {
    const falla: Pedir = async () => {
      throw new Error("sin red");
    };
    expect((await importarOferta(db, "https://x.example.com/a", falla)).fuente).toBe("nada");
    expect((await importarOferta(db, "https://x.example.com/a", pagina("{}", "application/json"))).fuente).toBe("nada");
    let llamada = false;
    const espia: Pedir = async () => {
      llamada = true;
      return new Response("");
    };
    expect((await importarOferta(db, "http://localhost:8787/staff", espia)).fuente).toBe("nada");
    expect((await importarOferta(db, "http://192.168.1.1/", espia)).fuente).toBe("nada");
    expect(llamada).toBe(false);
  });
});

describe("redirecciones", () => {
  it("sigue las de webs públicas, pero no deja que lleven a una dirección interna", async () => {
    const llamadas: string[] = [];
    const pedir: Pedir = async (url) => {
      llamadas.push(url);
      if (url === "https://corto.example.com/a") return new Response(null, { status: 301, headers: { location: "https://empleo.example.com/oferta" } });
      if (url === "https://empleo.example.com/oferta") return new Response(null, { status: 302, headers: { location: "http://127.0.0.1:8787/staff" } });
      return new Response("<title>Interna</title>", { headers: { "content-type": "text/html" } });
    };
    expect((await importarOferta(db, "https://corto.example.com/a", pedir)).fuente).toBe("nada");
    expect(llamadas).toEqual(["https://corto.example.com/a", "https://empleo.example.com/oferta"]);
  });

  it("una redirección normal sí se sigue", async () => {
    const pedir: Pedir = async (url) =>
      url.endsWith("/a")
        ? new Response(null, { status: 301, headers: { location: "/b" } })
        : new Response("<title>QA Tester</title>", { headers: { "content-type": "text/html" } });
    expect(await importarOferta(db, "https://corto.example.com/a", pedir)).toMatchObject({ fuente: "pagina", titulo: "QA Tester" });
  });

  it("tampoco usuarios en la dirección, puertos raros ni IPs escritas como número", async () => {
    let llamada = false;
    const espia: Pedir = async () => {
      llamada = true;
      return new Response("");
    };
    for (const url of ["https://user:pass@example.com/", "https://example.com:8443/", "http://2130706433/", "http://100.64.0.1/"]) {
      expect((await importarOferta(db, url, espia)).fuente).toBe("nada");
    }
    expect(llamada).toBe(false);
  });
});

describe("enlaces repetidos", () => {
  it("encuentra la oferta aunque el enlace lleve rastreo o www", async () => {
    const [una] = await db.query.ofertas.findMany({ limit: 1 });
    const u = new URL(una!.urlOriginal);
    const conRastreo = `${u.protocol}//www.${u.hostname.replace(/^www\./, "")}${u.pathname}/?utm_source=linkedin`;
    expect(await buscarRepetida(db, conRastreo)).toMatchObject({ id: una!.id });
    expect(await buscarRepetida(db, conRastreo, una!.id)).toBeNull();
    expect(await buscarRepetida(db, "https://otra.example.com/nada")).toBeNull();
  });
});

describe("htmlATexto", () => {
  it("convierte párrafos, listas y entidades", () => {
    expect(htmlATexto("<p>Hola &amp; adi&oacute;s</p><ul><li>Uno</li><li>Dos</li></ul>")).toBe("Hola & adiós\n\n• Uno\n• Dos");
    expect(htmlATexto("&lt;p&gt;Escapado&lt;/p&gt;")).toBe("Escapado");
  });
});

describe("leer páginas de fuera", () => {
  it("deja de leer al llegar al máximo (no carga entera una página enorme)", async () => {
    let trozosPedidos = 0;
    const enorme = new ReadableStream<Uint8Array>({
      pull(controlador) {
        trozosPedidos++;
        controlador.enqueue(new TextEncoder().encode("a".repeat(1000)));
      },
    });
    const texto = await leerHasta(new Response(enorme), 2500);
    expect(texto.length).toBe(2500);
    expect(trozosPedidos).toBeLessThan(10);
  });

  it("con una respuesta normal, la lee entera", async () => {
    expect(await leerHasta(new Response("<html>ñandú</html>"), 1000)).toBe("<html>ñandú</html>");
  });
});
