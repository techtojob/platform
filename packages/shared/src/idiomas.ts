/**
 * Idiomas que habla una persona o que pide una oferta (no confundir con los
 * idiomas de la web, que están en apps/web/src/i18n/idiomas.json).
 *
 * Códigos ISO 639-1. El nombre en cada idioma lo pone el navegador:
 *   new Intl.DisplayNames(["es"], { type: "language" }).of("de") → "alemán"
 * así que esta lista puede crecer sin traducir nada.
 */
export const IDIOMAS = [
  "es", "en", "pt", "fr", "de", "it", "ca", "eu", "gl", "nl",
  "pl", "ro", "sv", "da", "no", "fi", "cs", "el", "tr", "ru",
  "uk", "ar", "he", "hi", "zh", "ja", "ko", "id", "vi", "th",
] as const;

export type Idioma = (typeof IDIOMAS)[number];

/** Nivel que pide una oferta. Si no lo dice, se deja vacío. */
export const NIVELES_IDIOMA = ["a1", "a2", "b1", "b2", "c1", "c2", "nativo"] as const;
export type NivelIdioma = (typeof NIVELES_IDIOMA)[number];

export function esIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}
