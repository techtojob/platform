import { PAISES, type OfertaDetalle } from "@techtojob/shared";
import { describe, expect, it } from "vitest";
import { jobPosting, jsonSeguro } from "./datos-google";

const oferta = (cambios: Partial<OfertaDetalle> = {}) =>
  ({
    id: "abc12345",
    titulo: "Backend Developer",
    resumen: "Equipo pequeño, producto propio.",
    descripcion: "Node y PostgreSQL.\n\nInglés B2.",
    autorizada: true,
    modalidad: "remoto",
    remotoMundo: false,
    remotoPaises: ["ES", "MX"],
    publicadaEn: "2026-10-20T10:00:00.000Z",
    caducaEn: null,
    ciudad: null,
    pais: null,
    salario: null,
    empresa: { nombre: "Guagua Tech", web: "https://guagua.example", logoUrl: null },
    ...cambios,
  }) as unknown as OfertaDetalle;

describe("Google for Jobs (JobPosting)", () => {
  it("solo con permiso de la empresa y con la descripción completa", () => {
    expect(jobPosting(oferta({ autorizada: false }), "https://techtojob.com/empleo/ofertas/x")).toBeNull();
    expect(jobPosting(oferta({ descripcion: " " }), "https://techtojob.com/empleo/ofertas/x")).toBeNull();
  });

  it("remoto: con los países desde los que se puede trabajar", () => {
    const d = jobPosting(oferta(), "https://techtojob.com/empleo/ofertas/x")!;
    expect(d.jobLocationType).toBe("TELECOMMUTE");
    expect(d.applicantLocationRequirements).toEqual([
      { "@type": "Country", name: "ES" },
      { "@type": "Country", name: "MX" },
    ]);
  });

  it("remoto desde cualquier país: Google pide al menos uno, así que van todos los de la bolsa", () => {
    const d = jobPosting(oferta({ remotoMundo: true, remotoPaises: [] }), "https://techtojob.com/empleo/ofertas/x")!;
    expect((d.applicantLocationRequirements as unknown[]).length).toBe(PAISES.length);
  });

  it("presencial: con la dirección, sin TELECOMMUTE", () => {
    const d = jobPosting(oferta({ modalidad: "presencial", ciudad: "La Laguna", pais: "ES" }), "https://techtojob.com/empleo/ofertas/x")!;
    expect(d.jobLocationType).toBeUndefined();
    expect(d.jobLocation).toMatchObject({ address: { addressLocality: "La Laguna", addressCountry: "ES" } });
  });

  it("el JSON no puede cerrar el <script>", () => {
    expect(jsonSeguro({ t: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
