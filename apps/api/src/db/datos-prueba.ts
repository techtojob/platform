import { REGIONES } from "@techtojob/shared";
import type { Db } from "./cliente";
import { like } from "drizzle-orm";
import { emblemas, empresas, estadoDiscord, ofertaIdiomas, ofertas, perfiles, usuarios, type NuevaOferta } from "./esquema";

/**
 * Datos de prueba: empresas inventadas, ofertas en varios idiomas y perfiles de talento.
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

// Fechas relativas a hoy: así las ofertas de prueba nunca caducan solas.
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);

export const OFERTAS_PRUEBA: OfertaPrueba[] = [
  {
    id: "k7x2m9qa", slug: "frontend-junior-atlantica-labs", empresaId: "emp-atlantica",
    titulo: "Desarrollador/a Frontend Junior", idioma: "es", urlOriginal: "https://example.com/ofertas/1",
    descripcion: "Somos un equipo de seis personas que hace una app de reservas para alojamientos rurales de Canarias.\n\nQué harás: maquetar pantallas nuevas en React a partir de los diseños de Figma, arreglar errores y escribir pruebas de los componentes que toques.\n\nQué pedimos: haber hecho algún proyecto con React (aunque sea de clase o personal), conocer lo básico de TypeScript y Git.\n\nQué ofrecemos: contrato indefinido, dos días de oficina a la semana y una persona del equipo que te acompaña los primeros meses.",
    resumen: "Equipo pequeño que hace una app de reservas. Buscan a alguien con React y ganas de aprender.",
    area: "desarrollo", seniority: "junior", modalidad: "hibrido", tecnologias: ["react", "typescript"],
    pais: "ES", ciudad: "Las Palmas de Gran Canaria", publicadaEn: hace(0), pide: [{ idioma: "es" }],
  },
  {
    id: "p3v8d2xe", slug: "data-engineer-junior-volcan-data", empresaId: "emp-volcan",
    titulo: "Junior Data Engineer", idioma: "en", urlOriginal: "https://example.com/ofertas/2",
    descripcion: "Volcán Data builds the data platform behind a renewable energy marketplace.\n\nWhat you will do: write and maintain Python pipelines that load meter readings into our warehouse, model tables in SQL and help keep data quality checks green.\n\nWhat we ask: solid Python and SQL basics, curiosity about how data moves, and English good enough for daily written communication (B2).\n\nWhat we offer: fully remote within Spain, a senior mentor for your first six months and a yearly training budget.",
    resumen: "Build data pipelines for an energy platform. Python and SQL; mentoring during the first months.",
    area: "datos", seniority: "junior", modalidad: "remoto", tecnologias: ["python", "sql"],
    pais: "ES", remotoPaises: ["ES"], publicadaEn: hace(1), pide: [{ idioma: "en", nivel: "b2" }],
  },
  {
    id: "w9n4c6rt", slug: "soporte-it-n1-teide-software", empresaId: "emp-teide",
    titulo: "Técnico/a de soporte IT N1", idioma: "es", urlOriginal: "https://example.com/ofertas/3",
    descripcion: "Damos soporte a oficinas y comercios de Tenerife.\n\nQué harás: atender incidencias por teléfono y en persona, preparar equipos nuevos y llevar el inventario.\n\nQué pedimos: ganas de aprender y trato amable. No hace falta experiencia: te formamos.",
    area: "soporte-it", seniority: "sin-experiencia", modalidad: "presencial", tecnologias: [],
    pais: "ES", ciudad: "Santa Cruz de Tenerife", publicadaEn: hace(2), pide: [{ idioma: "es" }],
  },
  {
    id: "h2q7z5ub", slug: "backend-developer-marea-cloud", empresaId: "emp-marea",
    titulo: "Backend Developer (Node.js)", idioma: "en", urlOriginal: "https://example.com/ofertas/4",
    descripcion: "Marea Cloud runs managed hosting for online shops across Europe.\n\nWhat you will do: design and build Node.js services in TypeScript, review code and take part in the on-call rota once a month.\n\nWhat we ask: at least three years building backends with Node.js, fluent English (C1) and Spanish, since half of our customers are in Spain.",
    area: "desarrollo", seniority: "mid", modalidad: "remoto", tecnologias: ["javascript", "typescript"],
    remotoPaises: [...REGIONES.eu], salarioMin: 38000, salarioMax: 46000, moneda: "EUR", publicadaEn: hace(3),
    pide: [{ idioma: "en", nivel: "c1" }, { idioma: "es" }],
  },
  {
    id: "m5r1k8vf", slug: "devops-engineer-norden-systems", empresaId: "emp-norden",
    titulo: "DevOps Engineer", idioma: "en", urlOriginal: "https://example.com/ofertas/5",
    descripcion: "Norden Systems builds logistics software for warehouses in Germany and the Nordics.\n\nWhat you will do: keep our Kubernetes clusters healthy, write tooling in Go and improve our CI pipelines.\n\nWhat we ask: experience running production systems, English for work and German at B1 level for meetings with local customers.",
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

/**
 * Personas inventadas con perfil de talento, para ver el buscador con contenido.
 * Son usuarios de prueba (ids "usr-prueba-…", emails @example.com): no pueden iniciar sesión.
 */
type PerfilPrueba = Omit<typeof perfiles.$inferInsert, "userId"> & { id: string; email: string; verificado?: boolean; emblema?: string };
const PERFILES_PRUEBA: PerfilPrueba[] = [
  {
    id: "usr-prueba-1", email: "nayra@example.com", alias: "nayra-dev", nombre: "Nayra Hernández",
    titular: "Desarrolladora frontend junior", area: "desarrollo", seniority: "junior",
    sobreMi: "Terminé el DAW este año y llevo seis meses haciendo webs con React y TypeScript. Me encanta cuidar la accesibilidad y los detalles de diseño.\n\nGané el torneo de landing de TechToJob.",
    ciudad: "La Laguna", pais: "ES", modalidades: ["remoto", "hibrido"], disponibilidad: "buscando",
    tecnologias: ["react", "typescript", "nextjs", "tailwind"], idiomas: [{ idioma: "es", nivel: "nativo" }, { idioma: "en", nivel: "b2" }],
    github: "https://github.com/ejemplo", linkedin: "https://linkedin.com/in/ejemplo", visibilidad: "publico", verificado: true, emblema: "Torneo #2 · Landing",
  },
  {
    id: "usr-prueba-2", email: "diego@example.com", alias: "diego-datos", nombre: "Diego Morales",
    titular: "Data engineer con PySpark y Airflow", area: "datos", seniority: "mid",
    sobreMi: "Tres años construyendo pipelines de datos en una consultora. Busco un equipo de producto donde los datos importen.",
    ciudad: "Bogotá", pais: "CO", modalidades: ["remoto"], disponibilidad: "abierto",
    tecnologias: ["python", "spark", "airflow", "sql", "aws"], idiomas: [{ idioma: "es", nivel: "nativo" }, { idioma: "en", nivel: "c1" }],
    portfolio: "https://example.com/diego", visibilidad: "publico", verificado: true,
  },
  {
    id: "usr-prueba-3", email: "laura@example.com", alias: "laura-sec", nombre: "Laura Pérez",
    titular: "Analista de ciberseguridad (SOC N1)", area: "ciberseguridad", seniority: "junior",
    ciudad: "Madrid", pais: "ES", modalidades: ["hibrido", "presencial"], disponibilidad: "buscando",
    tecnologias: ["siem", "linux", "python"], idiomas: [{ idioma: "es", nivel: "nativo" }, { idioma: "en", nivel: "b1" }],
    visibilidad: "registrados",
  },
  {
    id: "usr-prueba-4", email: "joao@example.com", alias: "joao-cloud", nombre: "João Silva",
    titular: "Senior DevOps · Kubernetes y Terraform", area: "infra-devops", seniority: "senior",
    ciudad: "Lisboa", pais: "PT", modalidades: ["remoto"], disponibilidad: "freelance",
    tecnologias: ["kubernetes", "terraform", "aws", "docker", "go"], idiomas: [{ idioma: "pt", nivel: "nativo" }, { idioma: "en", nivel: "c1" }, { idioma: "es", nivel: "b2" }],
    github: "https://github.com/ejemplo", visibilidad: "registrados", verificado: true,
  },
  {
    id: "usr-prueba-5", email: "marta@example.com", alias: "marta-ux", nombre: "Marta Ruiz",
    titular: "Diseñadora de producto UX/UI", area: "producto-diseno", seniority: "mid",
    ciudad: "Valencia", pais: "ES", modalidades: ["hibrido"], disponibilidad: "no-busca",
    tecnologias: ["figma"], idiomas: [{ idioma: "es", nivel: "nativo" }],
    visibilidad: "oculto",
  },
];

/** Borra y vuelve a crear los datos de prueba. */
export async function cargarDatosPrueba(db: Db) {
  await db.delete(ofertaIdiomas);
  await db.delete(ofertas);
  await db.delete(empresas);
  await db.insert(empresas).values(EMPRESAS);
  await cargarPerfilesPrueba(db);
  for (const { pide, estado, ...o } of OFERTAS_PRUEBA) {
    const publicada = (estado ?? "publicada") === "publicada";
    await db.insert(ofertas).values({
      ...o,
      origen: "manual",
      estado: estado ?? "publicada",
      publicadaEn: publicada ? o.publicadaEn : null,
      revisadaEn: publicada ? o.publicadaEn : null,
      caducaEn: publicada && o.publicadaEn ? new Date(o.publicadaEn.getTime() + 45 * 86_400_000) : null,
    });
    await db.insert(ofertaIdiomas).values(
      pide.map((p) => ({ ofertaId: o.id, idioma: p.idioma, nivel: p.nivel ?? null }) as typeof ofertaIdiomas.$inferInsert),
    );
  }
}

async function cargarPerfilesPrueba(db: Db) {
  // Borrar los usuarios de prueba borra también sus perfiles, emblemas y reportes (en cascada).
  await db.delete(usuarios).where(like(usuarios.id, "usr-prueba-%"));
  for (const [i, { id, email, verificado, emblema, ...perfil }] of PERFILES_PRUEBA.entries()) {
    await db.insert(usuarios).values({ id, name: perfil.nombre, email, emailVerified: true, createdAt: hace(60 - i) });
    await db.insert(perfiles).values({ userId: id, ...perfil, actualizadaEn: hace(i) });
    if (verificado) await db.insert(estadoDiscord).values({ userId: id, discordId: `discord-${id}`, nombre: perfil.alias, enServidor: true });
    if (emblema) await db.insert(emblemas).values({ id: `emb-${id}`, userId: id, tipo: "torneo", nombre: emblema, otorgadoEn: hace(30) });
  }
}
