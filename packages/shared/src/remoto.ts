import type { Pais } from "./paises";

/**
 * Desde dónde se puede trabajar en una oferta en remoto.
 *
 * Se guarda la lista de países (códigos ISO: ["ES", "MX"]) o "cualquier país" (`mundo`).
 * Las regiones (Europa, Latinoamérica) son solo atajos para rellenarla y para enseñarla corta:
 * si están todos sus países, se dice "Latinoamérica" en vez de 20 nombres.
 */

export type Remoto = { mundo: boolean; paises: string[] };

/** Unión Europea. */
export const UE = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const satisfies readonly Pais[];

export const REGIONES = {
  /** "Europa" en una oferta: la UE más Reino Unido, Suiza y Noruega (lo que suelen querer decir con "Europe/EMEA"). */
  eu: [...UE, "GB", "CH", "NO"],
  latam: [
    "MX", "GT", "HN", "SV", "NI", "CR", "PA", "CU", "DO", "PR",
    "CO", "VE", "EC", "PE", "BO", "CL", "AR", "UY", "PY", "BR",
  ],
} as const satisfies Record<string, readonly Pais[]>;

export type Region = keyof typeof REGIONES;

/**
 * Países de la gente a la que va la bolsa (de momento): España y Latinoamérica.
 * Una oferta automática solo entra si se puede hacer desde alguno de ellos (o desde cualquier país).
 */
export const PAISES_PUBLICO: readonly string[] = ["ES", ...REGIONES.latam];

/** Lista limpia: sin repetidos, en mayúsculas y en el orden de siempre (España primero). */
export function ordenarPaises(paises: Iterable<string>): string[] {
  const unicos = [...new Set([...paises].map((p) => p.toUpperCase()))];
  const orden = (p: string) => (p === "ES" ? -1 : ORDEN.has(p) ? ORDEN.get(p)! : 999);
  return unicos.sort((a, b) => orden(a) - orden(b) || a.localeCompare(b));
}
const ORDEN = new Map<string, number>(
  [...REGIONES.latam, "US", "CA", ...REGIONES.eu].map((p, i) => [p, i] as [string, number]),
);

export type ParteRemoto =
  | { tipo: "region"; region: Region; /** Países de la región que no están ("Europa salvo Reino Unido"). */ salvo: string[] }
  | { tipo: "pais"; pais: string };

/** Como mucho, cuántos países pueden faltar para seguir diciendo la región ("Europa salvo Reino Unido y Suiza"). */
export const MAXIMO_SALVO = 3;

/**
 * Cómo enseñar "desde dónde" en corto:
 * - { mundo: true } → cualquier país;
 * - si están todos los países de una región, la región ("Latinoamérica");
 * - si faltan pocos (hasta 3), la región con sus excepciones ("Europa salvo Reino Unido");
 * - si no, los países sueltos.
 * España va primero, luego las regiones y luego el resto de países.
 */
export function describirRemoto(r: Remoto): { mundo: true } | { mundo: false; partes: ParteRemoto[] } {
  if (r.mundo) return { mundo: true };
  const quedan = new Set(r.paises);
  const regiones: ParteRemoto[] = [];
  for (const region of Object.keys(REGIONES) as Region[]) {
    const suyos = REGIONES[region] as readonly string[];
    const faltan = suyos.filter((p) => !quedan.has(p));
    // Hace falta que estén la mayoría: con 3 países de 30 no se dice "Europa salvo 27".
    if (faltan.length <= MAXIMO_SALVO && faltan.length < suyos.length / 2) {
      regiones.push({ tipo: "region", region, salvo: ordenarPaises(faltan) });
      for (const p of suyos) quedan.delete(p);
    }
  }
  const sueltos = ordenarPaises(quedan).map((pais): ParteRemoto => ({ tipo: "pais", pais }));
  const espana = sueltos.filter((p) => p.tipo === "pais" && p.pais === "ES");
  const otros = sueltos.filter((p) => !(p.tipo === "pais" && p.pais === "ES"));
  return { mundo: false, partes: [...espana, ...regiones, ...otros] };
}

/** ¿Se puede hacer esta oferta (en remoto) desde este país? */
export function puedeTrabajarDesde(r: Remoto, pais: string | null | undefined): boolean {
  if (r.mundo) return true;
  return !!pais && r.paises.includes(pais.toUpperCase());
}
