import { detectarAts } from "@techtojob/shared";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../src/db/esquema";
import { ordenarPaises, REGIONES } from "@techtojob/shared";
import { dondeRemoto, esRemoto, esTecnica, filtrar, leerAts, type OfertaAts } from "../src/servicios/ats";
import type { Pedir } from "../src/servicios/importar";
import { configurarEmpresa, crearEmpresa, ErrorStaff, publicarOferta } from "../src/servicios/ofertas-staff";
import { obtenerOferta } from "../src/servicios/ofertas";
import { sincronizarEmpresa, sincronizarTodas } from "../src/servicios/sincronizar";
import { crearDbPrueba } from "./db";

/* Respuestas de ejemplo, con la misma forma que las APIs públicas de verdad. */

const DESCRIPCION_EN =
  "We are looking for a backend engineer to build our payments platform with TypeScript, Node.js and PostgreSQL. You will work with a small team across Europe. Fluent English is required.";

const greenhouse = {
  jobs: [
    {
      id: 4001,
      title: "Senior Backend Engineer",
      absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4001",
      location: { name: "Remote - Spain" },
      updated_at: "2026-10-01T10:00:00-04:00",
      content: `&lt;p&gt;${DESCRIPCION_EN}&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Docker&lt;/li&gt;&lt;/ul&gt;`,
    },
    { id: 4002, title: "Account Executive", absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4002", location: { name: "Remote - EMEA" }, content: "" },
    { id: 4003, title: "Frontend Developer", absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4003", location: { name: "Remote - India" }, content: "" },
    { id: 4004, title: "Data Engineer", absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4004", location: { name: "Madrid (Hybrid)" }, content: "" },
    { id: 4005, title: "Site Reliability Engineer", absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4005", location: { name: "Remote" }, content: "" },
  ],
};

const lever = [
  {
    id: "a1b2c3",
    text: "Machine Learning Engineer",
    hostedUrl: "https://jobs.lever.co/beta/a1b2c3",
    categories: { location: "Remote, LATAM", allLocations: ["Remote, LATAM"], team: "AI", commitment: "Full-time" },
    workplaceType: "remote",
    createdAt: 1_790_000_000_000,
    descriptionPlain: "Buscamos una persona para entrenar modelos con Python y PyTorch. Trabajarás con un equipo en toda Latinoamérica.",
    lists: [{ text: "Requisitos", content: "<li>Inglés B2</li>" }],
    additionalPlain: "",
  },
  {
    id: "d4e5f6",
    text: "Platform Engineer",
    hostedUrl: "https://jobs.lever.co/beta/d4e5f6",
    categories: { location: "Remote - Europe", allLocations: ["Remote - Europe"] },
    workplaceType: "hybrid",
    descriptionPlain: "Hybrid role.",
  },
];

const ashby = {
  jobs: [
    {
      id: "uuid-1",
      title: "Product Designer",
      location: "Remote",
      secondaryLocations: [{ location: "Anywhere" }],
      isRemote: true,
      workplaceType: "Remote",
      descriptionHtml: "<p>Design things.</p>",
      descriptionPlain: "Design our product with Figma for customers all around the world, with a lot of autonomy and care.",
      publishedAt: "2026-09-20T00:00:00.000+00:00",
      jobUrl: "https://jobs.ashbyhq.com/gamma/uuid-1",
      applyUrl: "https://jobs.ashbyhq.com/gamma/uuid-1/application",
    },
    { id: "uuid-2", title: "Recruiter", location: "Remote", isRemote: true, workplaceType: "Remote", descriptionPlain: "", jobUrl: "https://jobs.ashbyhq.com/gamma/uuid-2" },
  ],
};

/** Un `fetch` falso: devuelve lo que haya en `respuestas` para esa dirección. */
function falso(respuestas: Record<string, unknown>): Pedir & { pedidas: string[] } {
  const pedidas: string[] = [];
  const f = Object.assign(async (url: string) => {
    pedidas.push(url);
    const r = respuestas[url];
    if (r === undefined) return new Response("no", { status: 404 });
    if (r instanceof Response) return r;
    return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
  }, { pedidas });
  return f;
}

const URL_GH = "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true";
const URL_LEVER = "https://api.lever.co/v0/postings/beta?mode=json";
const URL_ASHBY = "https://api.ashbyhq.com/posting-api/job-board/gamma";

describe("detectarAts", () => {
  it("reconoce las páginas de empleo de los tres", () => {
    expect(detectarAts("https://boards.greenhouse.io/acme")).toEqual({ ats: "greenhouse", id: "acme" });
    expect(detectarAts("https://job-boards.eu.greenhouse.io/acme/jobs/123")).toEqual({ ats: "greenhouse", id: "acme" });
    expect(detectarAts("https://boards.greenhouse.io/embed/job_board?for=acme")).toEqual({ ats: "greenhouse", id: "acme" });
    expect(detectarAts("jobs.lever.co/beta/abc-123")).toEqual({ ats: "lever", id: "beta" });
    expect(detectarAts("https://jobs.eu.lever.co/beta")).toEqual({ ats: "lever", id: "beta", region: "eu" });
    expect(detectarAts("https://jobs.ashbyhq.com/gamma?utm_source=x")).toEqual({ ats: "ashby", id: "gamma" });
  });
  it("y nada más", () => {
    expect(detectarAts("https://example.com/jobs")).toBeNull();
    expect(detectarAts("https://greenhouse.io.evil.com/acme")).toBeNull();
    expect(detectarAts("https://jobs.lever.co/")).toBeNull();
    expect(detectarAts("no es un enlace")).toBeNull();
  });
});

describe("lectores de ATS", () => {
  it("Greenhouse: normaliza las ofertas y deshace el HTML escapado", async () => {
    const leidas = await leerAts({ ats: "greenhouse", atsId: "acme" }, falso({ [URL_GH]: greenhouse }));
    expect(leidas).toHaveLength(5);
    expect(leidas[0]).toMatchObject({
      idExterno: "4001",
      titulo: "Senior Backend Engineer",
      url: "https://job-boards.greenhouse.io/acme/jobs/4001",
      ubicaciones: ["Remote - Spain"],
      modalidad: null,
    });
    expect(leidas[0]!.descripcion).toContain("payments platform");
    expect(leidas[0]!.descripcion).toContain("• Docker");
    expect(leidas[0]!.descripcion).not.toContain("<p>");
  });

  it("Lever: une la descripción, las listas y la modalidad; usa el servidor europeo si toca", async () => {
    const pedir = falso({ "https://api.eu.lever.co/v0/postings/beta?mode=json": lever });
    const leidas = await leerAts({ ats: "lever", atsId: "beta", atsRegion: "eu" }, pedir);
    expect(pedir.pedidas).toEqual(["https://api.eu.lever.co/v0/postings/beta?mode=json"]);
    expect(leidas[0]).toMatchObject({ idExterno: "a1b2c3", modalidad: "remoto", ubicaciones: ["Remote, LATAM"] });
    expect(leidas[0]!.descripcion).toContain("Inglés B2");
    expect(leidas[1]!.modalidad).toBe("hibrido");
  });

  it("Ashby: ubicaciones secundarias y remoto", async () => {
    const leidas = await leerAts({ ats: "ashby", atsId: "gamma" }, falso({ [URL_ASHBY]: ashby }));
    expect(leidas[0]).toMatchObject({ idExterno: "uuid-1", ubicaciones: ["Remote", "Anywhere"], modalidad: "remoto" });
  });

  it("errores claros: 404, error del servidor y respuesta rara", async () => {
    await expect(leerAts({ ats: "ashby", atsId: "nadie" }, falso({}))).rejects.toThrow("404");
    await expect(leerAts({ ats: "ashby", atsId: "gamma" }, falso({ [URL_ASHBY]: new Response("", { status: 500 }) }))).rejects.toThrow("500");
    await expect(leerAts({ ats: "ashby", atsId: "gamma" }, falso({ [URL_ASHBY]: { hola: 1 } }))).rejects.toThrow("inesperado");
  });

  it("el identificador va escapado en la dirección", async () => {
    const pedir = falso({});
    await leerAts({ ats: "ashby", atsId: "a/../b" }, pedir).catch(() => {});
    expect(pedir.pedidas[0]).toBe("https://api.ashbyhq.com/posting-api/job-board/a%2F..%2Fb");
  });
});

describe("filtros", () => {
  it("puestos técnicos", () => {
    for (const t of ["Senior Backend Engineer", "Data Scientist", "SRE", "Product Designer", "Growth Engineer", "IT Support Specialist"]) {
      expect(esTecnica(t), t).toBe(true);
    }
    for (const t of ["Account Executive", "Sales Engineer", "Technical Recruiter", "Marketing Manager", "Legal Counsel", "Finance Analyst", "Office Manager", "CEO, AI Services - US-Based", "Chief Operating Officer", "VP of Sales, AI", "General Manager, Data Platform", "Head of Marketing (AI)"]) {
      expect(esTecnica(t), t).toBe(false);
    }
  });

  it("100 % remoto", () => {
    const o = (ubicaciones: string[], modalidad: OfertaAts["modalidad"] = null) => ({ titulo: "Dev", ubicaciones, modalidad });
    expect(esRemoto(o(["Remote - Spain"]))).toBe(true);
    expect(esRemoto(o(["Madrid (Hybrid)"]))).toBe(false);
    expect(esRemoto(o(["Remote / Hybrid - Berlin"]))).toBe(false);
    expect(esRemoto(o(["Barcelona"]))).toBe(false);
    expect(esRemoto(o(["Barcelona"], "remoto"))).toBe(true); // si el ATS lo dice, manda
    expect(esRemoto(o(["Remote"], "hibrido"))).toBe(false);
  });

  it("zona desde la que se puede trabajar", () => {
    const paises = (...p: string[]) => ({ mundo: false, paises: p });
    expect(dondeRemoto(["Remote - Spain"])).toEqual(paises("ES"));
    expect(dondeRemoto(["Remoto (España)"])).toEqual(paises("ES"));
    expect(dondeRemoto(["Remote - Mexico"])).toEqual(paises("MX"));
    expect(dondeRemoto(["Remote - Mexico", "Remote - Colombia"])).toEqual(paises("MX", "CO"));
    expect(dondeRemoto(["Remote - EMEA"])).toEqual(paises(...ordenarPaises(REGIONES.eu)));
    expect(dondeRemoto(["Remote, LATAM"])).toEqual(paises(...ordenarPaises(REGIONES.latam)));
    // España y Latinoamérica: se guarda tal cual (antes lo tenía que decidir el staff).
    expect(dondeRemoto(["Remote - Spain", "Remote - LATAM"])).toEqual(paises(...ordenarPaises(["ES", ...REGIONES.latam])));
    expect(dondeRemoto(["Remote", "Anywhere"])).toEqual({ mundo: true, paises: [] });
    expect(dondeRemoto(["Remote"])).toBeNull();
    // EE. UU., Canadá y Reino Unido solos: de momento no son nuestro público.
    expect(dondeRemoto(["Remote - US"])).toBe("fuera");
    expect(dondeRemoto(["United States (Remote)"])).toBe("fuera");
    expect(dondeRemoto(["Remote - Canada"])).toBe("fuera");
    expect(dondeRemoto(["Remote (US & Canada)"])).toBe("fuera");
    expect(dondeRemoto(["Remote - North America"])).toBe("fuera");
    expect(dondeRemoto(["Remote - Americas"])).toEqual(paises(...ordenarPaises([...REGIONES.latam, "US", "CA"])));
    expect(dondeRemoto(["Remote - Buenos Aires"])).toEqual(paises("AR"));
    expect(dondeRemoto(["Remote - United Kingdom"])).toBe("fuera");
    expect(dondeRemoto(["Remote - India"])).toBe("fuera");
    expect(dondeRemoto(["Remote - Germany"])).toBe("fuera");
    expect(dondeRemoto(["Remote - Spain", "Remote - Germany"])).toEqual(paises("ES", "DE"));
    // El título también cuenta, pero lo que no se entiende de él no deja la oferta fuera.
    expect(dondeRemoto(["Remote"], "CEO, AI Services - US-Based")).toBe("fuera");
    expect(dondeRemoto(["Remote"], "Backend Engineer - LATAM")).toEqual(paises(...ordenarPaises(REGIONES.latam)));
    expect(dondeRemoto(["Remote"], "Data Engineer (Remote, Spain)")).toEqual(paises("ES"));
    expect(dondeRemoto(["Remote"], "Senior Backend Engineer (Node.js)")).toBeNull();
    expect(dondeRemoto(["Anywhere"], "Frontend Developer - US-Based")).toBe("fuera");
    expect(dondeRemoto(["Remote - India"], "Platform Engineer - Spain")).toEqual(paises("ES", "IN"));
  });

  it("filtrar se queda con las técnicas, remotas y de nuestras zonas", async () => {
    const leidas = await leerAts({ ats: "greenhouse", atsId: "acme" }, falso({ [URL_GH]: greenhouse }));
    expect(filtrar(leidas).map((o) => [o.idExterno, o.remoto])).toEqual([
      ["4001", { mundo: false, paises: ["ES"] }],
      ["4005", null],
    ]);
  });
});

describe("sincronizar", () => {
  let db: Db;
  const respuestas = () => ({ [URL_GH]: structuredClone(greenhouse), [URL_LEVER]: lever, [URL_ASHBY]: ashby });
  const DIA = 86_400_000;
  const empresa = async (id: string) => (await db.select().from(empresas).where(eq(empresas.id, id)))[0]!;
  const automaticas = (empresaId: string) =>
    db.select().from(ofertas).where(and(eq(ofertas.empresaId, empresaId), eq(ofertas.origen, "automatica")));

  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it("crea las nuevas pendientes, sin texto público y con el original solo para el staff", async () => {
    const acme = await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    expect(acme).toMatchObject({ ats: "greenhouse", atsId: "acme", sincronizar: true });

    const r = await sincronizarEmpresa(db, await empresa(acme.id), falso(respuestas()));
    expect(r).toMatchObject({ nuevas: 2, vistas: 0, cerradas: 0, error: null });

    const [backend] = (await automaticas(acme.id)).filter((o) => o.idExterno === "4001");
    expect(backend).toMatchObject({
      estado: "pendiente",
      fuenteAts: "greenhouse",
      titulo: "Senior Backend Engineer",
      resumen: null,
      descripcion: null,
      modalidad: "remoto",
      remotoMundo: false,
      remotoPaises: ["ES"],
      area: "desarrollo",
      seniority: "senior",
      idioma: "en",
      urlOriginal: "https://job-boards.greenhouse.io/acme/jobs/4001",
    });
    expect(backend!.descripcionOriginal).toContain("payments platform");
    expect(backend!.tecnologias).toEqual(expect.arrayContaining(["typescript", "nodejs", "postgresql", "docker"]));
    const idiomas = await db.select().from(ofertaIdiomas).where(eq(ofertaIdiomas.ofertaId, backend!.id));
    expect(idiomas.map((i) => i.idioma)).toEqual(["en"]);

    const leida = await empresa(acme.id);
    expect(leida.ultimaLectura).not.toBeNull();
    expect(leida.ultimoError).toBeNull();
  });

  it("no duplica, no vuelve a meter las rechazadas y cierra las que desaparecen dos días", async () => {
    const acme = await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    const dia1 = new Date("2026-10-01T05:15:00Z");
    await sincronizarEmpresa(db, await empresa(acme.id), falso(respuestas()), dia1);
    const [sre] = (await automaticas(acme.id)).filter((o) => o.idExterno === "4005");
    await db.update(ofertas).set({ estado: "rechazada" }).where(eq(ofertas.id, sre!.id));

    // Día 2: igual. Nada nuevo, la rechazada sigue rechazada.
    const r2 = await sincronizarEmpresa(db, await empresa(acme.id), falso(respuestas()), new Date(dia1.getTime() + DIA));
    expect(r2).toMatchObject({ nuevas: 0, vistas: 2, cerradas: 0 });
    expect((await automaticas(acme.id)).find((o) => o.id === sre!.id)!.estado).toBe("rechazada");

    // Día 3: la 4001 ya no está. Un solo día sin verla no basta…
    const sin4001 = respuestas();
    sin4001[URL_GH].jobs = sin4001[URL_GH].jobs.filter((j) => j.id !== 4001);
    const r3 = await sincronizarEmpresa(db, await empresa(acme.id), falso(sin4001), new Date(dia1.getTime() + 2 * DIA));
    expect(r3.cerradas).toBe(0);
    // …pero el día 4, sí.
    const r4 = await sincronizarEmpresa(db, await empresa(acme.id), falso(sin4001), new Date(dia1.getTime() + 3 * DIA));
    expect(r4.cerradas).toBe(1);
    expect((await automaticas(acme.id)).find((o) => o.idExterno === "4001")!.estado).toBe("cerrada");
  });

  it("si la página de empleo falla, no cierra nada y apunta el error", async () => {
    const acme = await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    const dia1 = new Date("2026-10-01T05:15:00Z");
    await sincronizarEmpresa(db, await empresa(acme.id), falso(respuestas()), dia1);
    for (let d = 1; d <= 3; d++) {
      const r = await sincronizarEmpresa(db, await empresa(acme.id), falso({ [URL_GH]: new Response("", { status: 503 }) }), new Date(dia1.getTime() + d * DIA));
      expect(r.error).toContain("503");
    }
    expect((await automaticas(acme.id)).every((o) => o.estado === "pendiente")).toBe(true);
    expect((await empresa(acme.id)).ultimoError).toContain("503");
  });

  it("no duplica una oferta que el staff ya metió a mano con el mismo enlace", async () => {
    const acme = await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    await db.insert(ofertas).values({
      id: "manual01",
      slug: "senior-backend-engineer-acme",
      empresaId: acme.id,
      titulo: "Senior Backend Engineer",
      idioma: "en",
      urlOriginal: "https://job-boards.greenhouse.io/acme/jobs/4001?utm_source=linkedin",
      area: "desarrollo",
      seniority: "senior",
      modalidad: "remoto",
      remotoPaises: ["ES"],
      origen: "manual",
    });
    const r = await sincronizarEmpresa(db, await empresa(acme.id), falso(respuestas()));
    expect(r.nuevas).toBe(1);
  });

  it("sincronizarTodas: las tres, y nunca las bloqueadas ni las desactivadas", async () => {
    await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    await crearEmpresa(db, { nombre: "Beta", paginaEmpleo: "https://jobs.lever.co/beta" });
    const gamma = await crearEmpresa(db, { nombre: "Gamma", paginaEmpleo: "https://jobs.ashbyhq.com/gamma" });
    const pedir = falso(respuestas());
    const r = await sincronizarTodas(db, pedir);
    expect(r.map((x) => [x.empresa, x.nuevas])).toEqual([
      ["Acme", 2],
      ["Beta", 1],
      ["Gamma", 1],
    ]);
    const [ml] = await db.select().from(ofertas).where(eq(ofertas.idExterno, "a1b2c3"));
    expect(ml).toMatchObject({ remotoPaises: ordenarPaises(REGIONES.latam), area: "ia", idioma: "es" });
    const [disenio] = await db.select().from(ofertas).where(eq(ofertas.idExterno, "uuid-1"));
    expect(disenio).toMatchObject({ remotoMundo: true, remotoPaises: [], area: "producto-diseno" });

    // Gamma pide que no publiquemos: sus pendientes automáticas se descartan y no se vuelve a leer.
    const bloqueada = await configurarEmpresa(db, gamma.id, { bloqueada: true });
    expect(bloqueada).toMatchObject({ bloqueada: true, sincronizar: false });
    expect(disenio && (await db.select().from(ofertas).where(eq(ofertas.id, disenio.id)))[0]!.estado).toBe("rechazada");
    const pedir2 = falso(respuestas());
    await sincronizarTodas(db, pedir2);
    expect(pedir2.pedidas).not.toContain(URL_ASHBY);
  });
});

describe("empresas y publicar", () => {
  let db: Db;
  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it("solo acepta páginas de empleo de ATS conocidos", async () => {
    await expect(crearEmpresa(db, { nombre: "Nada", paginaEmpleo: "https://example.com/jobs" })).rejects.toThrow(ErrorStaff);
    const e = await crearEmpresa(db, { nombre: "Delta" });
    expect(e).toMatchObject({ ats: null, sincronizar: false });
    // Sin página de empleo no se puede activar.
    expect(await configurarEmpresa(db, e.id, { sincronizar: true })).toMatchObject({ sincronizar: false });
    expect(await configurarEmpresa(db, e.id, { paginaEmpleo: "jobs.eu.lever.co/delta" })).toMatchObject({
      ats: "lever",
      atsRegion: "eu",
      sincronizar: true,
    });
    expect(await configurarEmpresa(db, e.id, { sincronizar: false })).toMatchObject({ sincronizar: false });
    expect(await configurarEmpresa(db, e.id, { paginaEmpleo: "" })).toMatchObject({ ats: null, sincronizar: false });
  });

  it("una automática no se publica sin zona ni sin el resumen de la IA; el texto de la empresa nunca sale", async () => {
    const acme = await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://boards.greenhouse.io/acme" });
    await sincronizarEmpresa(db, (await db.select().from(empresas).where(eq(empresas.id, acme.id)))[0]!, falso({ [URL_GH]: greenhouse }));
    const todas = await db.select().from(ofertas).where(eq(ofertas.empresaId, acme.id));
    const sre = todas.find((o) => o.idExterno === "4005")!; // "Remote" sin más: falta la zona
    const backend = todas.find((o) => o.idExterno === "4001")!;
    const marcadas = ["empresa", "enlace", "idiomas"];
    const staff = "staff-1";

    await expect(publicarOferta(db, sre.id, staff, marcadas)).rejects.toMatchObject({ codigo: "incompleta" });

    // Sin resumen de la IA no se publica (no está autorizada: su texto no cuenta).
    await expect(publicarOferta(db, backend.id, staff, marcadas)).rejects.toMatchObject({ codigo: "resumen" });
    await db.update(ofertas).set({ resumen: "Backend para pagos." }).where(eq(ofertas.id, backend.id));
    await expect(publicarOferta(db, backend.id, staff, marcadas)).rejects.toMatchObject({ codigo: "resumen" });
    await db.update(ofertas).set({ responsabilidades: ["Construir la plataforma de pagos"] }).where(eq(ofertas.id, backend.id));
    await publicarOferta(db, backend.id, staff, marcadas);
    expect((await db.select().from(ofertas).where(eq(ofertas.id, backend.id)))[0]!.estado).toBe("publicada");
    const publica = await obtenerOferta(db, backend.id);
    expect(publica).toMatchObject({
      resumen: "Backend para pagos.",
      responsabilidades: ["Construir la plataforma de pagos"],
      descripcion: null,
      urlOriginal: "https://job-boards.greenhouse.io/acme/jobs/4001",
    });
    expect(JSON.stringify(publica)).not.toContain("payments platform");

    // Con la zona y el resumen de la IA, la otra también.
    await db
      .update(ofertas)
      .set({ remotoPaises: ["ES", "PT"], resumen: "SRE para Kubernetes.", responsabilidades: ["Mantener los clústeres"] })
      .where(eq(ofertas.id, sre.id));
    await publicarOferta(db, sre.id, staff, marcadas);
    expect((await db.select().from(ofertas).where(eq(ofertas.id, sre.id)))[0]!.estado).toBe("publicada");
  });
});
