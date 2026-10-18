import { defineRouting } from "next-intl/routing";
import config from "./idiomas.json";

/**
 * Idiomas de la web.
 *
 * Todo sale de `idiomas.json`: para añadir un idioma se añade allí su entrada
 * (base y rutas traducidas) y su archivo `messages/<código>.json`. Nada más.
 * Ver "Añadir un idioma" en apps/web/README.md.
 */

type Idiomas = typeof config.idiomas;
export type Locale = keyof Idiomas;
/** Rutas internas (las carpetas de src/app). Las define el español, idioma de referencia. */
type RutaInterna = keyof Idiomas["es"]["rutas"];

export const locales = Object.keys(config.idiomas) as Locale[];
export const defaultLocale = config.porDefecto as Locale;

export const nombresIdiomas = Object.fromEntries(
  locales.map((l) => [l, config.idiomas[l].nombre]),
) as Record<Locale, string>;

/** Dirección base de cada idioma: /empleo, /jobs… */
export const basesIdiomas = Object.fromEntries(
  locales.map((l) => [l, config.idiomas[l].base]),
) as Record<Locale, string>;

/** Rutas traducidas: para cada ruta interna, cómo se escribe en cada idioma. */
const pathnames = Object.fromEntries(
  (Object.keys(config.idiomas.es.rutas) as RutaInterna[]).map((ruta) => [
    ruta,
    Object.fromEntries(locales.map((l) => [l, config.idiomas[l].rutas[ruta]])),
  ]),
) as Record<RutaInterna, Record<Locale, string>>;

export const COOKIE_IDIOMA = "TTJ_IDIOMA";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Cada idioma vive en su propia dirección: techtojob.com/empleo, techtojob.com/jobs…
  localePrefix: { mode: "always", prefixes: basesIdiomas },
  pathnames,
  // Recuerda el idioma elegido a mano durante un año.
  localeCookie: { name: COOKIE_IDIOMA, maxAge: 60 * 60 * 24 * 365 },
});
