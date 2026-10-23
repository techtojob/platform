import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { LANDING_URL } from "@/lib/sitio";

type Href = Parameters<typeof getPathname>[0]["href"];

/** La imagen para compartir de la landing (techtojob.com/images/og-cover.png), la misma en toda la web. */
export const IMAGEN_COMPARTIR = { url: `${LANDING_URL}/images/og-cover.png`, width: 1200, height: 630, alt: "TechToJob" };
const LOCALES_OG: Record<string, string> = { es: "es_ES", en: "en_US" };

/** Dirección completa de una página en un idioma: https://techtojob.com/empleo/… o /jobs/… */
export const urlEn = (href: Href, locale: Locale) => `${LANDING_URL}${getPathname({ href, locale })}`;

/**
 * Metadatos de una página pública:
 * - canonical (sin los filtros de la dirección: una sola versión para Google),
 * - su versión en cada idioma (hreflang), con el español por defecto,
 * - y la tarjeta al compartir en LinkedIn, Discord, WhatsApp o X (título, texto e imagen).
 */
export function metadatos({
  titulo,
  descripcion,
  href,
  locale,
  imagen,
  tipo = "website",
}: {
  titulo: string;
  descripcion?: string;
  href: Href;
  locale: Locale;
  /** Una imagen propia (la portada de un proyecto); si no, la de TechToJob. */
  imagen?: string | null;
  tipo?: "website" | "article" | "profile";
}): Metadata {
  const imagenes = imagen ? [{ url: imagen }] : [IMAGEN_COMPARTIR];
  return {
    title: titulo,
    description: descripcion,
    alternates: {
      canonical: urlEn(href, locale),
      languages: { ...Object.fromEntries(locales.map((l) => [l, urlEn(href, l)])), "x-default": urlEn(href, defaultLocale) },
    },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: urlEn(href, locale),
      siteName: "TechToJob",
      locale: LOCALES_OG[locale] ?? locale,
      type: tipo,
      images: imagenes,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: imagenes.map((i) => i.url) },
  };
}
