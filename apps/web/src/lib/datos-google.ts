import { PAISES, type OfertaDetalle, type PerfilPublico, type ProyectoListado } from "@techtojob/shared";

/**
 * Datos de una oferta para Google for Jobs (JobPosting de schema.org).
 * Solo para ofertas autorizadas por la empresa y con la descripción completa (lo piden las
 * normas de Google). Se aplica en la web de la empresa: directApply false.
 * Guía: https://developers.google.com/search/docs/data-types/job-posting
 */

const escaparHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** La descripción en HTML sencillo: un <p> por párrafo (Google pide HTML). */
function descripcionHtml(o: OfertaDetalle): string {
  const parrafos = [o.resumen, ...(o.descripcion ?? "").split(/\n\s*\n/)].map((p) => p?.trim()).filter(Boolean) as string[];
  return parrafos.map((p) => `<p>${escaparHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** null si la oferta no debe salir en Google for Jobs. */
export function jobPosting(o: OfertaDetalle, url: string): Record<string, unknown> | null {
  if (!o.autorizada || !o.descripcion?.trim()) return null;
  const remoto = o.modalidad === "remoto";
  // Países desde los que se puede trabajar en remoto. Google pide al menos uno: si vale cualquier
  // país, van todos los que conoce la bolsa (si no, Google descarta la oferta).
  const paises = o.remotoMundo ? [...PAISES] : o.remotoPaises;
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: o.titulo,
    description: descripcionHtml(o),
    datePosted: o.publicadaEn,
    ...(o.caducaEn && { validThrough: o.caducaEn }),
    url,
    directApply: false,
    identifier: { "@type": "PropertyValue", name: "TechToJob", value: o.id },
    hiringOrganization: {
      "@type": "Organization",
      name: o.empresa.nombre,
      ...(o.empresa.web && { sameAs: o.empresa.web }),
      ...(o.empresa.logoUrl && { logo: o.empresa.logoUrl }),
    },
    ...(remoto
      ? {
          jobLocationType: "TELECOMMUTE",
          ...(paises.length && { applicantLocationRequirements: paises.map((p) => ({ "@type": "Country", name: p })) }),
        }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              ...(o.ciudad && { addressLocality: o.ciudad }),
              ...(o.pais && { addressCountry: o.pais }),
            },
          },
        }),
    ...(o.salario?.moneda &&
      (o.salario.min || o.salario.max) && {
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: o.salario.moneda,
          value: {
            "@type": "QuantitativeValue",
            ...(o.salario.min && { minValue: o.salario.min }),
            ...(o.salario.max && { maxValue: o.salario.max }),
            unitText: "YEAR",
          },
        },
      }),
  };
}

/** JSON listo para meter en un <script>: sin "<" para que nadie pueda cerrar el script desde un texto. */
export function jsonSeguro(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}

/**
 * La misma organización que declara la landing (techtojob.com/#organization): así Google y los
 * asistentes de IA entienden que la bolsa y la landing son el mismo TechToJob.
 */
export const ID_ORGANIZACION = "https://techtojob.com/#organization";

/** Un perfil público de Talento: ProfilePage con la persona (puesto, tecnologías, idiomas, enlaces). */
export function paginaPerfil(
  p: Pick<PerfilPublico, "nombre" | "titular" | "sobreMi" | "imagen" | "tecnologias" | "idiomas" | "enlaces">,
  url: string,
  nombresTec: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const sameAs = [p.enlaces.linkedin, p.enlaces.github, p.enlaces.portfolio].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    isPartOf: { "@type": "WebSite", url: "https://techtojob.com", publisher: { "@id": ID_ORGANIZACION } },
    mainEntity: {
      "@type": "Person",
      name: p.nombre,
      jobTitle: p.titular,
      ...(p.sobreMi && { description: p.sobreMi.slice(0, 500) }),
      ...(p.imagen && { image: p.imagen }),
      ...(p.tecnologias.length && { knowsAbout: p.tecnologias.map((id) => nombresTec.get(id) ?? id) }),
      ...(p.idiomas.length && { knowsLanguage: p.idiomas.map((i) => i.idioma) }),
      ...(sameAs.length && { sameAs }),
    },
  };
}

/** Un proyecto: código (si tiene repositorio) u obra creativa, con su autor y sus me gusta. */
export function datosProyecto(
  p: Pick<ProyectoListado, "titulo" | "descripcion" | "repo" | "demo" | "portada" | "tecnologias" | "creadoEn" | "megusta" | "autor">,
  url: string,
  urlAutor: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": p.repo ? "SoftwareSourceCode" : "CreativeWork",
    name: p.titulo,
    description: p.descripcion.slice(0, 500),
    url,
    dateCreated: p.creadoEn,
    author: { "@type": "Person", name: p.autor.nombre, url: urlAutor },
    ...(p.repo && { codeRepository: p.repo }),
    ...(p.demo && { sameAs: p.demo }),
    ...(p.portada && { image: p.portada }),
    ...(p.tecnologias.length && { keywords: p.tecnologias.join(", ") }),
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: p.megusta },
  };
}
