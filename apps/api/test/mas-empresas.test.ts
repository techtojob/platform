import { detectarAts, enlaceAts } from "@techtojob/shared";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { candidatas, empresas } from "../src/db/esquema";
import { filtrar, leerAts } from "../src/servicios/ats";
import { buscarEnCommonCrawl, paginasDeLineas } from "../src/servicios/common-crawl";
import { descubrir, nombreDesdeId, sembrarPaginasConocidas } from "../src/servicios/descubrir";
import type { Pedir } from "../src/servicios/importar";
import { crearEmpresa } from "../src/servicios/ofertas-staff";
import { crearDbPrueba } from "./db";

const falso = (respuestas: Record<string, unknown>): Pedir & { pedidas: string[] } => {
  const pedidas: string[] = [];
  return Object.assign(
    async (url: string) => {
      pedidas.push(url);
      const r = respuestas[url];
      if (r === undefined) return new Response("no", { status: 404 });
      if (r instanceof Response) return r.clone();
      return new Response(typeof r === "string" ? r : JSON.stringify(r));
    },
    { pedidas },
  );
};

const TEXTO = "We are hiring an engineer to build our data platform with Python, Kafka and PostgreSQL. You will join a small remote team.";

describe("detectar Workable, Recruitee y SmartRecruiters", () => {
  it("reconoce sus enlaces", () => {
    expect(detectarAts("https://apply.workable.com/acme/j/ABC123/")).toEqual({ ats: "workable", id: "acme" });
    expect(detectarAts("https://acme.workable.com")).toEqual({ ats: "workable", id: "acme" });
    expect(detectarAts("https://apply.workable.com/j/ABC123")).toBeNull(); // no dice la empresa
    expect(detectarAts("https://acme.recruitee.com/o/backend-developer")).toEqual({ ats: "recruitee", id: "acme" });
    expect(detectarAts("https://jobs.smartrecruiters.com/VisaInc/7440001-engineer")).toEqual({ ats: "smartrecruiters", id: "VisaInc" });
    expect(detectarAts("https://www.recruitee.com/")).toBeNull();
    expect(enlaceAts("smartrecruiters", "VisaInc")).toBe("https://jobs.smartrecruiters.com/VisaInc");
  });
});

describe("lectores nuevos", () => {
  it("Workable", async () => {
    const pedir = falso({
      "https://apply.workable.com/api/v1/widget/accounts/acme?details=true": {
        name: "Acme",
        jobs: [
          { title: "Data Engineer", shortcode: "AB12", url: "https://apply.workable.com/acme/j/AB12/", telecommuting: true, country: "Spain", city: "Madrid", published_on: "2026-10-01", description: `<p>${TEXTO}</p>` },
          { title: "Office Manager", shortcode: "CD34", telecommuting: false, country: "Spain", city: "Madrid", description: "" },
        ],
      },
    });
    const leidas = await leerAts({ ats: "workable", atsId: "acme" }, pedir);
    expect(leidas[0]).toMatchObject({ idExterno: "AB12", modalidad: "remoto", ubicaciones: ["Madrid, Spain"] });
    expect(leidas[0]!.descripcion).toContain("Kafka");
    expect(leidas[1]).toMatchObject({ url: "https://apply.workable.com/acme/j/CD34/" });
    expect(filtrar(leidas).map((o) => [o.titulo, o.remoto?.paises])).toEqual([["Data Engineer", ["ES"]]]);
  });

  it("Recruitee", async () => {
    const pedir = falso({
      "https://acme.recruitee.com/api/offers/": {
        offers: [
          { id: 99, slug: "backend", title: "Backend Developer", careers_url: "https://acme.recruitee.com/o/backend", remote: true, hybrid: false, on_site: false, location: "Remote - LATAM", country_code: "MX", city: "", published_at: "2026-08-14 08:23:10 UTC", description: `<p>${TEXTO}</p>` },
          { id: 100, slug: "qa", title: "QA Engineer", careers_url: "https://acme.recruitee.com/o/qa", remote: false, hybrid: true, on_site: false, location: "Amsterdam", description: "" },
        ],
      },
    });
    const leidas = await leerAts({ ats: "recruitee", atsId: "acme" }, pedir);
    expect(leidas[0]).toMatchObject({ idExterno: "99", modalidad: "remoto", publicadaEn: new Date("2026-08-14T08:23:10Z") });
    expect(leidas[1]!.modalidad).toBe("hibrido");
    expect(filtrar(leidas)).toHaveLength(1);
  });

  it("SmartRecruiters: la lista por páginas y el texto solo de las que pueden entrar", async () => {
    const base = "https://api.smartrecruiters.com/v1/companies/VisaInc/postings";
    const pedir = falso({
      [`${base}?limit=100&offset=0`]: {
        totalFound: 2,
        content: [
          { id: "744001", name: "Senior Software Engineer", releasedDate: "2026-10-02T10:00:00.000Z", location: { city: "Austin", region: "TX", country: "us", remote: true } },
          { id: "744002", name: "Sales Director", location: { city: "Austin", country: "us", remote: true } },
        ],
      },
      [`${base}/744001`]: {
        postingUrl: "https://jobs.smartrecruiters.com/VisaInc/744001-senior-software-engineer",
        jobAd: { sections: { jobDescription: { title: "Job Description", text: `<p>${TEXTO}</p>` }, qualifications: { title: "Qualifications", text: "<ul><li>Go</li></ul>" } } },
      },
    });
    const leidas = await leerAts({ ats: "smartrecruiters", atsId: "VisaInc" }, pedir);
    expect(leidas).toHaveLength(2);
    expect(leidas[0]).toMatchObject({ modalidad: "remoto", url: "https://jobs.smartrecruiters.com/VisaInc/744001-senior-software-engineer" });
    expect(leidas[0]!.descripcion).toContain("Kafka");
    // No se abre el detalle de la de ventas.
    expect(pedir.pedidas).not.toContain(`${base}/744002`);
    // Para descubrir empresas, ni siquiera el de las técnicas.
    const pedir2 = falso({ [`${base}?limit=100&offset=0`]: { totalFound: 1, content: [{ id: "744001", name: "Senior Software Engineer", location: { remote: true, country: "us" } }] } });
    await leerAts({ ats: "smartrecruiters", atsId: "VisaInc" }, pedir2, { conTexto: false });
    expect(pedir2.pedidas).toHaveLength(1);
  });
});

describe("Common Crawl", () => {
  it("de cada dirección guardada, la página de empleo de la empresa", () => {
    const lineas = [
      { url: "https://jobs.lever.co/mistral/abc-123" },
      { url: "https://jobs.lever.co/mistral/def-456" },
      { url: "https://acme.teamtailor.com/jobs/1-backend" },
      { url: "https://www.teamtailor.com/es/" },
      "esto no es json",
    ]
      .map((l) => (typeof l === "string" ? l : JSON.stringify(l)))
      .join("\n");
    expect(paginasDeLineas(lineas)).toEqual([
      { ats: "lever", id: "mistral" },
      { ats: "lever", id: "mistral" },
      { ats: "teamtailor", id: "acme" },
    ]);
  });

  it("recorre el índice más reciente, todas sus páginas, sin repetir; y aguanta un patrón que falla", async () => {
    const api = "https://index.commoncrawl.org/CC-MAIN-2026-40-index";
    const q = (patron: string) => `${api}?url=${encodeURIComponent(patron)}&output=json&fl=url`;
    const pedir = falso({
      "https://index.commoncrawl.org/collinfo.json": [{ id: "CC-MAIN-2026-40", "cdx-api": api }, { id: "CC-MAIN-2026-33", "cdx-api": "viejo" }],
      [`${q("jobs.lever.co/*")}&showNumPages=true`]: { pages: 2 },
      [`${q("jobs.lever.co/*")}&page=0`]: `${JSON.stringify({ url: "https://jobs.lever.co/mistral/1" })}\n${JSON.stringify({ url: "https://jobs.lever.co/beta/2" })}`,
      [`${q("jobs.lever.co/*")}&page=1`]: JSON.stringify({ url: "https://jobs.lever.co/mistral/3" }),
      [`${q("*.recruitee.com")}&showNumPages=true`]: new Response("", { status: 500 }),
    });
    const r = await buscarEnCommonCrawl(pedir, { esperaBase: 0 });
    expect(r.indice).toBe("CC-MAIN-2026-40");
    expect(r.paginas).toEqual([
      { ats: "lever", id: "mistral" },
      { ats: "lever", id: "beta" },
    ]);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toContain("recruitee");
  });
});

describe("descubrir las que vienen de Common Crawl", () => {
  it("una sola petición por empresa; se salta las que ya leemos", async () => {
    const db = await crearDbPrueba();
    await crearEmpresa(db, { nombre: "Beta Labs", paginaEmpleo: "https://jobs.lever.co/beta" });
    expect(await sembrarPaginasConocidas(db, [{ ats: "lever", id: "mistral" }, { ats: "lever", id: "beta" }, { ats: "lever", id: "nadie" }])).toBe(3);
    expect(await sembrarPaginasConocidas(db, [{ ats: "lever", id: "mistral" }])).toBe(0);
    const pedir = falso({
      "https://api.lever.co/v0/postings/mistral?mode=json": [
        { id: "x1", text: "Machine Learning Engineer", hostedUrl: "https://jobs.lever.co/mistral/x1", categories: { location: "Remote - Europe" }, workplaceType: "remote", descriptionPlain: TEXTO },
      ],
    });
    const r = await descubrir(db, pedir);
    expect(r.encontradas).toEqual(["Mistral"]);
    expect(r.noExisten).toBe(1);
    // Ni Greenhouse, ni Ashby…: solo Lever, y ni siquiera para "beta" (ya la leemos).
    expect(pedir.pedidas).toEqual(["https://api.lever.co/v0/postings/mistral?mode=json", "https://api.lever.co/v0/postings/nadie?mode=json"]);
    const [mistral] = await db.select().from(empresas).where(eq(empresas.nombre, "Mistral"));
    expect(mistral).toMatchObject({ ats: "lever", atsId: "mistral", sincronizar: true, origen: "descubierta" });
    expect((await db.select().from(candidatas).where(eq(candidatas.id, "lever:beta")))[0]!.estado).toBe("encontrada");
  });

  it("nombres a partir del identificador", () => {
    expect(nombreDesdeId("grafana-labs")).toBe("Grafana Labs");
    expect(nombreDesdeId("acme.na")).toBe("Acme");
    expect(nombreDesdeId("VisaInc")).toBe("VisaInc");
  });
});
