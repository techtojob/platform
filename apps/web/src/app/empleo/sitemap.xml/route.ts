import type { EntradaMapa } from "@techtojob/shared";
import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { pedir } from "@/lib/api";
import { LANDING_URL } from "@/lib/sitio";

/**
 * Mapa del sitio de la bolsa: techtojob.com/empleo/sitemap.xml
 * (no en la raíz: techtojob.com/sitemap.xml es de la landing).
 * Cada página va con su versión en cada idioma (hreflang). Solo lo que Google puede ver:
 * portadas, privacidad, ofertas publicadas, perfiles públicos y proyectos visibles.
 * Se rehace como mucho cada hora.
 */
export const revalidate = 3600;

type Href = Parameters<typeof getPathname>[0]["href"];

function entrada(href: Href, actualizada?: string): string {
  const urls = locales.map((l) => ({ l, url: `${LANDING_URL}${getPathname({ href, locale: l as Locale })}` }));
  const alternativas = urls.map(({ l, url }) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url}"/>`).join("");
  return urls
    .map(({ url }) => `<url><loc>${url}</loc>${actualizada ? `<lastmod>${actualizada}</lastmod>` : ""}${alternativas}</url>`)
    .join("");
}

export async function GET() {
  const [ofertas, perfiles, proyectos] = await Promise.all([
    pedir<EntradaMapa[]>("/ofertas/mapa").catch(() => []),
    pedir<EntradaMapa[]>("/talento/mapa").catch(() => []),
    pedir<EntradaMapa[]>("/proyectos/mapa").catch(() => []),
  ]);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entrada("/"),
    entrada("/talento"),
    entrada("/proyectos"),
    entrada("/privacidad"),
    ...ofertas.map((o) => entrada({ pathname: "/ofertas/[slug]", params: { slug: o.ruta } }, o.actualizadaEn)),
    ...perfiles.map((p) => entrada({ pathname: "/talento/[alias]", params: { alias: p.ruta } }, p.actualizadaEn)),
    ...proyectos.map((p) => entrada({ pathname: "/proyectos/[slug]", params: { slug: p.ruta } }, p.actualizadaEn)),
    "</urlset>",
  ].join("");
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
