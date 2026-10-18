import type { Db } from "./cliente";
import { empresas, ofertaIdiomas, ofertas, type NuevaOferta } from "./esquema";

/**
 * Datos de prueba: empresas inventadas y ofertas en varios idiomas.
 * Se usan en las pruebas automáticas y para rellenar la rama `dev` de Neon
 * (`pnpm --filter api db:datos-prueba`). Nunca en producción.
 */

const EMPRESAS = [
  { id: "emp-atlantica", nombre: "Atlántica Labs", slug: "atlantica-labs" },
  { id: "emp-volcan", nombre: "Volcán Data", slug: "volcan-data" },
  { id: "emp-teide", nombre: "Teide Software", slug: "teide-software" },
  { id: "emp-marea", nombre: "Marea Cloud", slug: "marea-cloud" },
  { id: "emp-norden", nombre: "Norden Systems", slug: "norden-systems" },
];

type OfertaPrueba = Omit<NuevaOferta, "origen" | "estado"> & {
  estado?: NuevaOferta["estado"];
  pide: Array<{ idioma: string; nivel?: string }>;
};

const hace = (dias: number) => new Date(Date.UTC(2026, 9, 18, 10) - dias * 86_400_000);

export const OFERTAS_PRUEBA: OfertaPrueba[] = [
  {
    id: "k7x2m9qa", slug: "frontend-junior-atlantica-labs", empresaId: "emp-atlantica",
    titulo: "Desarrollador/a Frontend Junior", idioma: "es", urlOriginal: "https://example.com/ofertas/1",
    resumen: "Equipo pequeño que hace una app de reservas. Buscan a alguien con React y ganas de aprender.",
    area: "desarrollo", seniority: "junior", modalidad: "hibrido", tecnologias: ["react", "typescript"],
    pais: "ES", ciudad: "Las Palmas de Gran Canaria", publicadaEn: hace(0), pide: [{ idioma: "es" }],
  },
  {
    id: "p3v8d2xe", slug: "data-engineer-junior-volcan-data", empresaId: "emp-volcan",
    titulo: "Junior Data Engineer", idioma: "en", urlOriginal: "https://example.com/ofertas/2",
    resumen: "Build data pipelines for an energy platform. Python and SQL; mentoring during the first months.",
    area: "datos-ia", seniority: "junior", modalidad: "remoto", tecnologias: ["python", "sql"],
    pais: "ES", remotoDesde: "es", publicadaEn: hace(1), pide: [{ idioma: "en", nivel: "b2" }],
  },
  {
    id: "w9n4c6rt", slug: "soporte-it-n1-teide-software", empresaId: "emp-teide",
    titulo: "Técnico/a de soporte IT N1", idioma: "es", urlOriginal: "https://example.com/ofertas/3",
    area: "soporte-it", seniority: "sin-experiencia", modalidad: "presencial", tecnologias: [],
    pais: "ES", ciudad: "Santa Cruz de Tenerife", publicadaEn: hace(2), pide: [{ idioma: "es" }],
  },
  {
    id: "h2q7z5ub", slug: "backend-developer-marea-cloud", empresaId: "emp-marea",
    titulo: "Backend Developer (Node.js)", idioma: "en", urlOriginal: "https://example.com/ofertas/4",
    area: "desarrollo", seniority: "mid", modalidad: "remoto", tecnologias: ["javascript", "typescript"],
    remotoDesde: "eu", salarioMin: 38000, salarioMax: 46000, moneda: "EUR", publicadaEn: hace(3),
    pide: [{ idioma: "en", nivel: "c1" }, { idioma: "es" }],
  },
  {
    id: "m5r1k8vf", slug: "devops-engineer-norden-systems", empresaId: "emp-norden",
    titulo: "DevOps Engineer", idioma: "en", urlOriginal: "https://example.com/ofertas/5",
    area: "infra-devops", seniority: "mid", modalidad: "hibrido", tecnologias: ["go"],
    pais: "DE", ciudad: "Berlin", publicadaEn: hace(4), pide: [{ idioma: "en" }, { idioma: "de", nivel: "b1" }],
  },
  {
    id: "b8t3y6np", slug: "analista-soc-junior-teide-software", empresaId: "emp-teide",
    titulo: "Analista SOC Junior", idioma: "es", urlOriginal: "https://example.com/ofertas/6",
    area: "ciberseguridad", seniority: "junior", modalidad: "hibrido", tecnologias: ["python"],
    pais: "ES", ciudad: "Madrid", estado: "pendiente", pide: [{ idioma: "es" }],
  },
];

/** Borra y vuelve a crear los datos de prueba. */
export async function cargarDatosPrueba(db: Db) {
  await db.delete(ofertaIdiomas);
  await db.delete(ofertas);
  await db.delete(empresas);
  await db.insert(empresas).values(EMPRESAS);
  for (const { pide, estado, ...o } of OFERTAS_PRUEBA) {
    const publicada = (estado ?? "publicada") === "publicada";
    await db.insert(ofertas).values({
      ...o,
      origen: "manual",
      estado: estado ?? "publicada",
      publicadaEn: publicada ? o.publicadaEn : null,
      revisadaEn: publicada ? o.publicadaEn : null,
    });
    await db.insert(ofertaIdiomas).values(
      pide.map((p) => ({ ofertaId: o.id, idioma: p.idioma, nivel: p.nivel ?? null }) as typeof ofertaIdiomas.$inferInsert),
    );
  }
}
