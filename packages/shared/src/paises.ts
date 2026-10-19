/**
 * Países que se pueden elegir en una oferta (código ISO de 2 letras).
 * El nombre en cada idioma lo pone el navegador (Intl.DisplayNames), igual que los idiomas.
 * Primero España y los que más salen; el resto, por orden alfabético al mostrarlos.
 */
export const PAISES = [
  "ES", "PT", "FR", "DE", "IT", "GB", "IE", "NL", "BE", "LU", "CH", "AT", "DK", "SE", "NO", "FI",
  "PL", "CZ", "RO", "GR", "EE", "LT", "LV", "MT", "CY", "HU", "SK", "SI", "HR", "BG",
  "US", "CA", "MX", "AR", "CO", "CL", "PE", "UY", "EC", "VE", "BO", "PY", "CR", "PA", "DO", "GT", "BR",
  "MA", "AE", "IL", "IN", "JP", "SG", "AU",
] as const;

export type Pais = (typeof PAISES)[number];

const quitarAcentos = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

let nombres: Map<string, string> | null = null;

/**
 * "España", "Spain", "ES" o "esp" → "ES". Para los datos que llegan de otras webs,
 * que a veces ponen el nombre del país y a veces el código. null si no lo reconoce.
 */
export function codigoPais(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  if (/^[A-Za-z]{2}$/.test(limpio)) return limpio.toUpperCase();
  if (!nombres) {
    nombres = new Map();
    for (const idioma of ["es", "en"]) {
      const nombresDe = new Intl.DisplayNames([idioma], { type: "region" });
      for (const codigo of PAISES) nombres.set(quitarAcentos(nombresDe.of(codigo) ?? codigo), codigo);
    }
    nombres.set("espana", "ES").set("spain", "ES").set("esp", "ES").set("usa", "US").set("uk", "GB");
  }
  return nombres.get(quitarAcentos(limpio)) ?? null;
}
