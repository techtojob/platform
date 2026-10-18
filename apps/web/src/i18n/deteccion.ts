import Negotiator from "negotiator";
import config from "./idiomas.json";
import { basesIdiomas, defaultLocale, locales, type Locale } from "./routing";

/**
 * Funciones puras para elegir idioma y pasar una dirección de un idioma a otro.
 * No dependen de Next: se pueden probar sin servidor.
 */

const rutas = config.idiomas as Record<Locale, { rutas: Record<string, string> }>;

/** Idioma de una dirección según su base (/empleo → es, /jobs → en), o null. */
export function idiomaDeRuta(pathname: string): Locale | null {
  return (
    locales.find((l) => pathname === basesIdiomas[l] || pathname.startsWith(`${basesIdiomas[l]}/`)) ??
    null
  );
}

/** Primer idioma disponible de la lista que manda el navegador (Accept-Language), o null. */
export function idiomaDelNavegador(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;
  const pedidos = new Negotiator({ headers: { "accept-language": acceptLanguage } }).languages();
  for (const pedido of pedidos) {
    const principal = pedido.toLowerCase().split("-")[0];
    if ((locales as string[]).includes(principal)) return principal as Locale;
  }
  return null;
}

/** Idioma según el país (cabecera CF-IPCountry de Cloudflare), o null si no hay país. */
export function idiomaDelPais(pais: string | null): Locale | null {
  if (!pais || pais === "XX" || pais === "T1") return null;
  const lista = config.paisesPorIdioma as Partial<Record<Locale, string[]>>;
  for (const l of locales) if (lista[l]?.includes(pais.toUpperCase())) return l;
  return config.idiomaParaOtrosPaises as Locale;
}

/** Orden: navegador → país → idioma por defecto. */
export function idiomaPreferido(acceptLanguage: string | null, pais: string | null): Locale {
  return idiomaDelNavegador(acceptLanguage) ?? idiomaDelPais(pais) ?? defaultLocale;
}

function encaja(plantilla: string, ruta: string): Record<string, string> | null {
  const p = plantilla.split("/").filter(Boolean);
  const r = ruta.split("/").filter(Boolean);
  if (p.length !== r.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const param = /^\[(.+)\]$/.exec(p[i]);
    if (param) params[param[1]] = r[i];
    else if (p[i] !== r[i]) return null;
  }
  return params;
}

/**
 * La misma página en otro idioma: /empleo/talento/lucia-m → /jobs/talent/lucia-m.
 * Si la ruta no se reconoce, lleva al inicio de ese idioma.
 */
export function traducirRuta(pathname: string, desde: Locale, hacia: Locale): string {
  const resto = pathname.slice(basesIdiomas[desde].length) || "/";
  for (const interna of Object.keys(rutas[desde].rutas)) {
    const params = encaja(rutas[desde].rutas[interna], resto);
    if (!params) continue;
    const destino = rutas[hacia].rutas[interna].replace(/\[(.+?)\]/g, (_, k: string) => params[k]);
    return destino === "/" ? basesIdiomas[hacia] : `${basesIdiomas[hacia]}${destino}`;
  }
  return basesIdiomas[hacia];
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless/i;

export function esBot(userAgent: string | null): boolean {
  return !!userAgent && BOTS.test(userAgent);
}
