import { detectarAts, enlaceAts } from "@techtojob/shared";
import { describe, expect, it } from "vitest";
import { filtrar, leerAts } from "../src/servicios/ats";
import type { Pedir } from "../src/servicios/importar";

/* Con la forma de los feeds públicos: el RSS de Teamtailor y el XML de Personio. */

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:tt="https://teamtailor.com/locations">
  <channel>
    <title>Empleos en Barkibu</title>
    <item>
      <title>Desarrollador/a Backend (Ruby)</title>
      <description><![CDATA[<p>Buscamos una persona para nuestro equipo de producto. Trabajarás con Ruby on Rails, PostgreSQL y AWS, en remoto desde España.</p><ul><li>3 años de experiencia</li></ul>]]></description>
      <pubDate>Mon, 12 Oct 2026 09:00:00 +0200</pubDate>
      <link>https://barkibu.teamtailor.com/jobs/123456-desarrollador-a-backend-ruby</link>
      <guid>abc-123</guid>
      <remoteStatus>fully</remoteStatus>
      <tt:locations>
        <tt:location><tt:name>Remoto</tt:name><tt:city>Madrid</tt:city><tt:country>Spain</tt:country></tt:location>
      </tt:locations>
      <tt:department>Tecnología</tt:department>
    </item>
    <item>
      <title>Data Analyst</title>
      <description>&lt;p&gt;Hybrid role in our Barcelona office.&lt;/p&gt;</description>
      <link>https://barkibu.teamtailor.com/jobs/7-data-analyst</link>
      <guid>def-7</guid>
      <remoteStatus>hybrid</remoteStatus>
      <tt:locations><tt:location><tt:name>Barcelona</tt:name><tt:city>Barcelona</tt:city><tt:country>Spain</tt:country></tt:location></tt:locations>
    </item>
  </channel>
</rss>`;

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<workzag-jobs>
  <position>
    <id>1500123</id>
    <subcompany>Kenmei</subcompany>
    <office>Madrid</office>
    <additionalOffices><office>Remote</office><office>Valencia</office></additionalOffices>
    <department>Engineering</department>
    <recruitingCategory>Tech</recruitingCategory>
    <name>Senior Frontend Engineer (React)</name>
    <jobDescriptions>
      <jobDescription>
        <name>Sobre el puesto</name>
        <value><![CDATA[<p>Construirás nuestra aplicación web con React, TypeScript y Next.js. Equipo distribuido en España, 100&nbsp;% en remoto.</p>]]></value>
      </jobDescription>
      <jobDescription>
        <name>Lo que buscamos</name>
        <value><![CDATA[<ul><li>5 años con React</li><li>Inglés B2</li></ul>]]></value>
      </jobDescription>
    </jobDescriptions>
    <employmentType>permanent</employmentType>
    <seniority>experienced</seniority>
    <createdAt>2026-10-05T10:00:00+00:00</createdAt>
  </position>
  <position>
    <id>1500124</id>
    <office>Madrid</office>
    <name>Office Manager</name>
    <jobDescriptions><jobDescription><name>Puesto</name><value>Gestión de la oficina.</value></jobDescription></jobDescriptions>
  </position>
</workzag-jobs>`;

const falso = (respuestas: Record<string, string | Response>): Pedir & { pedidas: string[] } => {
  const pedidas: string[] = [];
  return Object.assign(
    async (url: string) => {
      pedidas.push(url);
      const r = respuestas[url];
      if (r === undefined) return new Response("no", { status: 404 });
      return typeof r === "string" ? new Response(r, { headers: { "content-type": "application/xml" } }) : r;
    },
    { pedidas },
  );
};

describe("detectar Teamtailor y Personio", () => {
  it("reconoce sus páginas de empleo", () => {
    expect(detectarAts("https://barkibu.teamtailor.com/jobs/123-backend")).toEqual({ ats: "teamtailor", id: "barkibu" });
    expect(detectarAts("https://acme.na.teamtailor.com/jobs")).toEqual({ ats: "teamtailor", id: "acme.na" });
    expect(detectarAts("https://kenmei.jobs.personio.de/job/1500123")).toEqual({ ats: "personio", id: "kenmei" });
    expect(detectarAts("https://kenmei.jobs.personio.com")).toEqual({ ats: "personio", id: "kenmei", region: "com" });
    expect(detectarAts("https://www.teamtailor.com/es/")).toBeNull();
    expect(detectarAts("https://teamtailor.com.evil.io/x")).toBeNull();
    expect(enlaceAts("personio", "kenmei", "com")).toBe("https://kenmei.jobs.personio.com");
    expect(enlaceAts("teamtailor", "barkibu")).toBe("https://barkibu.teamtailor.com/jobs");
  });
});

describe("Teamtailor", () => {
  it("lee el RSS: título, texto, enlace, remoto y ubicaciones", async () => {
    const pedir = falso({ "https://barkibu.teamtailor.com/jobs.rss?per_page=200": RSS });
    const leidas = await leerAts({ ats: "teamtailor", atsId: "barkibu" }, pedir);
    expect(leidas).toHaveLength(2);
    expect(leidas[0]).toMatchObject({
      idExterno: "abc-123",
      titulo: "Desarrollador/a Backend (Ruby)",
      url: "https://barkibu.teamtailor.com/jobs/123456-desarrollador-a-backend-ruby",
      modalidad: "remoto",
      ubicaciones: ["Remoto, Madrid, Spain"],
    });
    expect(leidas[0]!.descripcion).toContain("Ruby on Rails");
    expect(leidas[0]!.descripcion).toContain("• 3 años");
    expect(leidas[0]!.publicadaEn?.toISOString()).toBe("2026-10-12T07:00:00.000Z");
    expect(leidas[1]).toMatchObject({ modalidad: "hibrido", descripcion: "Hybrid role in our Barcelona office." });
    expect(filtrar(leidas).map((o) => [o.titulo, o.remoto?.paises])).toEqual([["Desarrollador/a Backend (Ruby)", ["ES"]]]);
  });

  it("una página que no es un RSS no cuenta", async () => {
    const pedir = falso({ "https://nadie.teamtailor.com/jobs.rss?per_page=200": "<html><body>Hola</body></html>" });
    await expect(leerAts({ ats: "teamtailor", atsId: "nadie" }, pedir)).rejects.toThrow("inesperado");
  });

  it("si redirige (la empresa no existe), es como un 404", async () => {
    const pedir = falso({ "https://nadie.teamtailor.com/jobs.rss?per_page=200": new Response(null, { status: 302, headers: { location: "https://www.teamtailor.com" } }) });
    await expect(leerAts({ ats: "teamtailor", atsId: "nadie" }, pedir)).rejects.toMatchObject({ estado: 404 });
  });
});

describe("Personio", () => {
  it("lee el XML: oficinas, descripción por trozos y enlace a la oferta", async () => {
    const pedir = falso({ "https://kenmei.jobs.personio.de/xml": XML });
    const leidas = await leerAts({ ats: "personio", atsId: "kenmei" }, pedir);
    expect(leidas[0]).toMatchObject({
      idExterno: "1500123",
      titulo: "Senior Frontend Engineer (React)",
      url: "https://kenmei.jobs.personio.de/job/1500123",
      ubicaciones: ["Madrid", "Remote", "Valencia"],
      modalidad: null,
    });
    expect(leidas[0]!.descripcion).toContain("Sobre el puesto\nConstruirás");
    expect(leidas[0]!.descripcion).toContain("• Inglés B2");
    // Es remota porque una de sus oficinas es "Remote"; la zona, por Madrid y Valencia: España.
    expect(filtrar(leidas).map((o) => [o.idExterno, o.remoto?.paises])).toEqual([["1500123", ["ES"]]]);
  });

  it("usa personio.com si la empresa está allí", async () => {
    const pedir = falso({ "https://kenmei.jobs.personio.com/xml": XML });
    expect(await leerAts({ ats: "personio", atsId: "kenmei", atsRegion: "com" }, pedir)).toHaveLength(2);
  });
});
