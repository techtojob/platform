import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/cliente";
import { candidatas, empresas, ofertas } from "../src/db/esquema";
import { descubrir, identificadores, resumenCandidatas, sembrarCandidatas, sugerirCandidatas } from "../src/servicios/descubrir";
import type { Pedir } from "../src/servicios/importar";
import { configurarEmpresa, crearEmpresa, crearOferta } from "../src/servicios/ofertas-staff";
import { elegir, sincronizarTodas, tocaLeer } from "../src/servicios/sincronizar";
import { crearDbPrueba } from "./db";

const EN = (n: number) =>
  `We are hiring a backend engineer number ${n} to build our platform with TypeScript and PostgreSQL. You will join a friendly remote team and ship every week.`;
const ES = (n: number) =>
  `Buscamos una persona desarrolladora backend número ${n} para construir nuestra plataforma con Python y PostgreSQL. Trabajarás con un equipo en remoto y con mucha autonomía.`;
const DE = "Wir suchen eine Backend-Entwicklerin für unsere Plattform mit Python und PostgreSQL. Du arbeitest in einem kleinen Team und hast viel Freiheit bei der Arbeit.";

/** Una página de Ashby con `n` ofertas en cada idioma. */
const ashby = (prefijo: string, n: { en?: number; es?: number; de?: number }) => ({
  jobs: [
    ...Array.from({ length: n.en ?? 0 }, (_, i) => ({ id: `${prefijo}-en-${i}`, title: `Backend Engineer ${i}`, location: "Remote", secondaryLocations: [{ location: "Anywhere" }], isRemote: true, workplaceType: "Remote", descriptionPlain: EN(i), publishedAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z`, jobUrl: `https://jobs.ashbyhq.com/${prefijo}/en-${i}` })),
    ...Array.from({ length: n.es ?? 0 }, (_, i) => ({ id: `${prefijo}-es-${i}`, title: `Desarrollador Backend ${i}`, location: "Remoto (LATAM)", isRemote: true, workplaceType: "Remote", descriptionPlain: ES(i), publishedAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z`, jobUrl: `https://jobs.ashbyhq.com/${prefijo}/es-${i}` })),
    ...Array.from({ length: n.de ?? 0 }, (_, i) => ({ id: `${prefijo}-de-${i}`, title: `Backend Engineer DE ${i}`, location: "Remote", secondaryLocations: [{ location: "Anywhere" }], isRemote: true, workplaceType: "Remote", descriptionPlain: DE, jobUrl: `https://jobs.ashbyhq.com/${prefijo}/de-${i}` })),
  ],
});
const URL_ASHBY = (id: string) => `https://api.ashbyhq.com/posting-api/job-board/${id}`;

function falso(respuestas: Record<string, unknown>): Pedir & { pedidas: string[] } {
  const pedidas: string[] = [];
  return Object.assign(
    async (url: string) => {
      pedidas.push(url);
      const r = respuestas[url];
      if (r === undefined) return new Response("no", { status: 404 });
      if (r instanceof Response) return r.clone();
      return new Response(JSON.stringify(r));
    },
    { pedidas },
  );
}

let db: Db;
beforeEach(async () => {
  db = await crearDbPrueba();
});
const automaticas = () => db.select().from(ofertas).where(eq(ofertas.origen, "automatica"));

describe("cupo diario", () => {
  const r = (...paises: string[]) => ({ mundo: false, paises });
  const mundo = { mundo: true, paises: [] as string[] };
  const c = (id: string, remoto: { mundo: boolean; paises: string[] } | null, empresa = id, dia = 1) => ({
    id,
    empresa: { id: empresa },
    oferta: { publicadaEn: new Date(2026, 8, dia), remoto },
  });
  const ids = (l: Array<{ id: string }>) => l.map((x) => x.id);

  it("elegir: por turnos entre empresas y las más nuevas primero", () => {
    const lista = [c("a1", r("MX"), "a", 1), c("a5", r("MX"), "a", 5), c("a3", r("MX"), "a", 3), c("b2", r("MX"), "b", 2)];
    expect(ids(elegir(lista, { total: 3, espana: 0 }))).toEqual(["a5", "b2", "a3"]);
  });

  it("elegir: primero 3 de España (o desde cualquier país), el resto de Latinoamérica", () => {
    const lista = [
      ...Array.from({ length: 10 }, (_, i) => c(`mx${i}`, r("MX", "CO"))),
      c("es1", r("ES")),
      c("eu1", r("ES", "PT", "FR")),
      c("mundo1", mundo),
      c("mundo2", mundo),
      c("nada", null),
    ];
    const elegidas = ids(elegir(lista, { total: 10, espana: 3 }));
    expect(elegidas).toHaveLength(10);
    // Las que dicen España, antes que las de cualquier país.
    expect(elegidas.slice(0, 3)).toEqual(["es1", "eu1", "mundo1"]);
    expect(elegidas.slice(3).every((id) => id.startsWith("mx"))).toBe(true);
  });

  it("elegir: si no hay 3 de España, se completa con Latinoamérica; y al final, las que no dicen desde dónde", () => {
    const lista = [c("es1", r("ES")), ...Array.from({ length: 5 }, (_, i) => c(`ar${i}`, r("AR"))), c("nada", null)];
    expect(ids(elegir(lista, { total: 10, espana: 3 }))).toEqual(["es1", "ar0", "ar1", "ar2", "ar3", "ar4", "nada"]);
  });

  it("elegir: si no hay de Latinoamérica, más de España", () => {
    const lista = Array.from({ length: 12 }, (_, i) => c(`es${i}`, r("ES")));
    expect(elegir(lista, { total: 10, espana: 3 })).toHaveLength(10);
  });

  it("como mucho 10 al día; otros idiomas no entran; el resto espera", async () => {
    await crearEmpresa(db, { nombre: "Grande", paginaEmpleo: "https://jobs.ashbyhq.com/grande" });
    await crearEmpresa(db, { nombre: "Pequeña", paginaEmpleo: "https://jobs.ashbyhq.com/pequena" });
    // Las "en" son desde cualquier país; las "es", desde Latinoamérica.
    const pedir = falso({ [URL_ASHBY("grande")]: ashby("grande", { en: 30, es: 25, de: 5 }), [URL_ASHBY("pequena")]: ashby("pequena", { en: 2 }) });
    const dia1 = new Date("2026-10-01T05:15:00Z");
    const r1 = await sincronizarTodas(db, pedir, dia1);
    const todas = await automaticas();
    expect(todas).toHaveLength(10);
    // 3 "de España" (aquí, desde cualquier país) y 7 de Latinoamérica.
    expect(todas.filter((o) => o.remotoMundo)).toHaveLength(3);
    expect(todas.filter((o) => o.remotoPaises.includes("MX"))).toHaveLength(7);
    expect(todas.some((o) => o.titulo.includes("DE"))).toBe(false);
    // La pequeña no se queda fuera por culpa de la grande.
    expect(r1.find((x) => x.empresa === "Pequeña")).toMatchObject({ nuevas: 1, enEspera: 1 });
    expect(r1.find((x) => x.empresa === "Grande")).toMatchObject({ nuevas: 9, enEspera: 46 });

    // Si se lanza otra vez el mismo día, no entra ninguna más.
    const r2 = await sincronizarTodas(db, pedir, new Date(dia1.getTime() + 3_600_000));
    expect(r2.reduce((n, x) => n + x.nuevas, 0)).toBe(0);
    // Al día siguiente, otras 10 (y no se cierra ninguna).
    const r3 = await sincronizarTodas(db, pedir, new Date(dia1.getTime() + 86_400_000));
    expect(r3.reduce((n, x) => n + x.nuevas, 0)).toBe(10);
    expect(r3.reduce((n, x) => n + x.cerradas, 0)).toBe(0);
  });
});

describe("empresas que fallan o no tienen ofertas", () => {
  it("con 3 fallos seguidos se deja de leer; al reactivarla se empieza de cero", async () => {
    const e = await crearEmpresa(db, { nombre: "Rota", paginaEmpleo: "https://jobs.ashbyhq.com/rota" });
    const pedir = falso({ [URL_ASHBY("rota")]: new Response("", { status: 500 }) });
    for (let d = 0; d < 3; d++) await sincronizarTodas(db, pedir, new Date(Date.UTC(2026, 9, 1 + d, 5)));
    const [rota] = await db.select().from(empresas).where(eq(empresas.id, e.id));
    expect(rota).toMatchObject({ sincronizar: false, erroresSeguidos: 3 });
    expect(rota!.ultimoError).toContain("se ha dejado de leer");
    expect(await configurarEmpresa(db, e.id, { sincronizar: true })).toMatchObject({ sincronizar: true, ultimoError: null });
  });

  it("sin ofertas útiles en 60 días, se lee solo los lunes", () => {
    const empresa = { ultimaOfertaUtil: new Date("2026-07-01T00:00:00Z"), creadaEn: new Date("2026-06-01T00:00:00Z") } as never;
    expect(tocaLeer(empresa, new Date("2026-10-06T05:00:00Z"))).toBe(false); // martes
    expect(tocaLeer(empresa, new Date("2026-10-05T05:00:00Z"))).toBe(true); // lunes
    const activa = { ultimaOfertaUtil: new Date("2026-10-01T00:00:00Z"), creadaEn: new Date("2026-06-01T00:00:00Z") } as never;
    expect(tocaLeer(activa, new Date("2026-10-06T05:00:00Z"))).toBe(true);
  });
});

describe("aprender de las ofertas del staff", () => {
  it("si el enlace es de Greenhouse, Lever o Ashby, la empresa se lee sola a partir de entonces", async () => {
    const e = await crearEmpresa(db, { nombre: "Delta" });
    await crearOferta(db, {
      empresaId: e.id, titulo: "Data Engineer", resumen: null, descripcion: null, idioma: "es",
      urlOriginal: "https://jobs.lever.co/delta/123-abc", area: "datos", seniority: "mid", modalidad: "remoto",
      tecnologias: [], pais: null, ciudad: null, remotoMundo: false, remotoPaises: ["ES"], salarioMin: null, salarioMax: null, moneda: null,
      idiomasRequeridos: [{ idioma: "es", nivel: null }], autorizada: false,
    });
    const [delta] = await db.select().from(empresas).where(eq(empresas.id, e.id));
    expect(delta).toMatchObject({ ats: "lever", atsId: "delta", sincronizar: true });
  });
});

describe("descubrir empresas", () => {
  it("identificadores: juntos y con guiones", () => {
    expect(identificadores("Grafana Labs")).toEqual(["grafanalabs", "grafana-labs"]);
    expect(identificadores("Konfío")).toEqual(["konfio"]);
    expect(identificadores("Weights & Biases", ["wandb"])).toEqual(["wandb", "weightsbiases", "weights-biases"]);
  });

  it("prueba las candidatas y añade las que tienen ofertas útiles", async () => {
    await sembrarCandidatas(db, ["Grafana Labs", "Sin Página", "Solo Oficina", "Teide Software"]);
    expect(await sembrarCandidatas(db, ["Grafana Labs"])).toBe(0); // no se repiten
    const pedir = falso({
      [URL_ASHBY("grafanalabs")]: ashby("grafanalabs", { en: 2 }),
      // Tiene página, pero nada remoto.
      "https://boards-api.greenhouse.io/v1/boards/solooficina/jobs?content=true": {
        jobs: [{ id: 1, title: "Backend Engineer", absolute_url: "https://job-boards.greenhouse.io/solooficina/jobs/1", location: { name: "Madrid" }, content: "" }],
      },
    });
    const ahora = new Date("2026-10-01T05:00:00Z");
    const r = await descubrir(db, pedir, ahora);
    expect(r).toMatchObject({ probadas: 4, encontradas: ["Grafana Labs"], sinOfertas: 1, noExisten: 2, errores: 0 });

    const [grafana] = await db.select().from(empresas).where(eq(empresas.nombre, "Grafana Labs"));
    expect(grafana).toMatchObject({ ats: "ashby", atsId: "grafanalabs", sincronizar: true, origen: "descubierta" });
    expect(await resumenCandidatas(db)).toEqual({ pendiente: 0, encontrada: 1, sin_ofertas: 1, no_existe: 2 });

    // Mañana no se vuelve a probar nada; la "sin ofertas", dentro de 30 días.
    expect((await descubrir(db, pedir, new Date("2026-10-02T05:00:00Z"))).probadas).toBe(0);
    expect((await descubrir(db, pedir, new Date("2026-11-02T05:00:00Z"))).probadas).toBe(1);

    // Y en la lectura diaria ya entran sus ofertas.
    const leidas = await sincronizarTodas(db, pedir, ahora);
    expect(leidas.find((x) => x.empresa === "Grafana Labs")?.nuevas).toBe(2);
  });

  it("no añade las bloqueadas ni repite las que ya tenemos", async () => {
    const b = await crearEmpresa(db, { nombre: "Bloqueada SL" });
    await configurarEmpresa(db, b.id, { bloqueada: true });
    await sembrarCandidatas(db, ["Bloqueada", "Acme"]);
    await crearEmpresa(db, { nombre: "Acme", paginaEmpleo: "https://jobs.ashbyhq.com/acme" });
    const pedir = falso({ [URL_ASHBY("bloqueada")]: ashby("bloqueada", { en: 1 }), [URL_ASHBY("acme")]: ashby("acme", { en: 1 }) });
    const r = await descubrir(db, pedir);
    expect(r.encontradas).toEqual([]);
    expect(pedir.pedidas).toEqual([]); // ni siquiera hace falta probarlas
    expect((await db.select().from(candidatas)).every((c) => c.estado === "encontrada")).toBe(true);
  });

  it("si un ATS falla (500), se reintenta otro día", async () => {
    await sembrarCandidatas(db, ["Caída"]);
    const pedir = falso({ "https://boards-api.greenhouse.io/v1/boards/caida/jobs?content=true": new Response("", { status: 502 }) });
    expect((await descubrir(db, pedir)).errores).toBe(1);
    expect((await db.select().from(candidatas))[0]!.estado).toBe("pendiente");
  });

  it("el staff puede sugerir nombres, uno por línea", async () => {
    expect(await sugerirCandidatas(db, "Supabase\nPostHog, Linear\n\n")).toBe(3);
  });
});
