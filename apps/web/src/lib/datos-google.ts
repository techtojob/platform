import type { OfertaDetalle } from "@techtojob/shared";

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
  // Países desde los que se puede trabajar en remoto; desde cualquier país, sin requisito.
  const paises = o.remotoMundo ? [] : o.remotoPaises;
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
