import { ATS, type Ats } from "./ats";
import type { OfertaStaff } from "./contratos";
import { AREAS, ESTADOS_OFERTA, ORIGENES_OFERTA, SENIORITY, type Area, type EstadoOferta, type OrigenOferta, type Seniority } from "./listas";
import { PAISES } from "./paises";

/**
 * Filtros del panel de staff, guardados en la dirección:
 * /empleo/staff?estado=pendiente&atajo=sin_resumen&idioma=es&orden=antiguas
 * Los usan la web (para leer la dirección) y el API (para leer la petición): mismos nombres.
 */

/** Atajos de un clic: lo que más se busca al revisar. */
export const ATAJOS_STAFF = ["sin_resumen", "sin_zona", "hoy", "caducan", "desaparecidas"] as const;
export type AtajoStaff = (typeof ATAJOS_STAFF)[number];

/** Qué atajos tienen sentido en cada pestaña. */
export const ATAJOS_POR_ESTADO: Record<EstadoOferta, AtajoStaff[]> = {
  pendiente: ["sin_resumen", "sin_zona", "hoy"],
  publicada: ["caducan", "hoy"],
  rechazada: ["hoy"],
  cerrada: ["desaparecidas"],
};

export const FECHAS_STAFF = ["hoy", "7", "30"] as const;
export type FechaStaff = (typeof FECHAS_STAFF)[number];

export const ORDENES_STAFF = ["antiguas", "nuevas", "caducan"] as const;
export type OrdenStaff = (typeof ORDENES_STAFF)[number];

/** Idioma en que está escrita: español, inglés o cualquier otro. */
export const IDIOMAS_STAFF = ["es", "en", "otros"] as const;
export type IdiomaStaff = (typeof IDIOMAS_STAFF)[number];

/** Ofertas por página en el panel. */
export const POR_PAGINA_STAFF = 50;

/** Motivo que se pone a las automáticas que se cierran solas porque ya no están en la web de la empresa. */
export const MOTIVO_DESAPARECIDA = "Ya no está en la web de la empresa.";

/** Motivo de las automáticas que se descartan solas por llevar 14 días pendientes sin revisar. */
export const MOTIVO_SIN_REVISAR = "Sin revisar en 14 días: se ha descartado sola.";

export type FiltrosStaff = {
  estado: EstadoOferta;
  /** Título o empresa. */
  q?: string;
  idioma?: IdiomaStaff;
  origen?: OrigenOferta;
  fuente?: Ats;
  /** Se puede hacer desde este país (ISO). */
  desde?: string;
  areas: Area[];
  seniority: Seniority[];
  fecha?: FechaStaff;
  atajo?: AtajoStaff;
  orden: OrdenStaff;
  pagina: number;
};

/** Respuesta de GET /staff/ofertas. */
export type ListaStaff = {
  estado: EstadoOferta;
  ofertas: OfertaStaff[];
  /** Con los filtros puestos, cuántas hay en total (no solo en esta página). */
  total: number;
  /** Cuántas hay en cada pestaña (sin filtros). */
  cuentas: Partial<Record<EstadoOferta, number>>;
  /** Cuántas hay con cada atajo de esta pestaña (sin los demás filtros). */
  atajos: Partial<Record<AtajoStaff, number>>;
  /** Reportes sin revisar (perfiles, ofertas y recruiters). */
  reportes: number;
};

/** Respuesta de GET /staff/ofertas/siguiente: la siguiente por revisar con los mismos filtros. */
export type SiguienteStaff = { id: string | null; quedan: number };

/** Orden por defecto: las pendientes, primero lo que más lleva esperando; el resto, lo más nuevo. */
export const ordenPorDefecto = (estado: EstadoOferta): OrdenStaff => (estado === "pendiente" ? "antiguas" : "nuevas");

type Parametros = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const de = <T extends string>(lista: readonly T[], v: string | string[] | undefined): T | undefined =>
  (lista as readonly string[]).includes(uno(v)) ? (uno(v) as T) : undefined;
const varios = <T extends string>(lista: readonly T[], v: string | string[] | undefined): T[] =>
  [...new Set((Array.isArray(v) ? v.join(",") : (v ?? "")).split(","))].filter((x): x is T => (lista as readonly string[]).includes(x));

/** Lee los filtros de la dirección o de la petición. Lo que no se reconoce se ignora. */
export function leerFiltrosStaff(p: Parametros): FiltrosStaff {
  const estado = de(ESTADOS_OFERTA, p.estado) ?? "pendiente";
  const atajo = de(ATAJOS_STAFF, p.atajo);
  const desde = uno(p.desde).toUpperCase();
  const pagina = Number.parseInt(uno(p.pagina), 10);
  return {
    estado,
    ...(uno(p.q) && { q: uno(p.q).slice(0, 100) }),
    ...(de(IDIOMAS_STAFF, p.idioma) && { idioma: de(IDIOMAS_STAFF, p.idioma) }),
    ...(de(ORIGENES_OFERTA, p.origen) && { origen: de(ORIGENES_OFERTA, p.origen) }),
    ...(de(ATS, p.fuente) && { fuente: de(ATS, p.fuente) }),
    ...((PAISES as readonly string[]).includes(desde) && { desde }),
    areas: varios(AREAS, p.area),
    seniority: varios(SENIORITY, p.nivel),
    ...(de(FECHAS_STAFF, p.fecha) && { fecha: de(FECHAS_STAFF, p.fecha) }),
    ...(atajo && ATAJOS_POR_ESTADO[estado].includes(atajo) && { atajo }),
    orden: de(ORDENES_STAFF, p.orden) ?? ordenPorDefecto(estado),
    pagina: Number.isFinite(pagina) && pagina > 1 ? Math.min(pagina, 1000) : 1,
  };
}

/** Filtros → parámetros de la dirección, sin los que están por defecto (para que quede limpia). */
export function parametrosStaff(f: FiltrosStaff): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.estado !== "pendiente") q.estado = f.estado;
  if (f.q) q.q = f.q;
  if (f.idioma) q.idioma = f.idioma;
  if (f.origen) q.origen = f.origen;
  if (f.fuente) q.fuente = f.fuente;
  if (f.desde) q.desde = f.desde;
  if (f.areas.length) q.area = f.areas.join(",");
  if (f.seniority.length) q.nivel = f.seniority.join(",");
  if (f.fecha) q.fecha = f.fecha;
  if (f.atajo) q.atajo = f.atajo;
  if (f.orden !== ordenPorDefecto(f.estado)) q.orden = f.orden;
  if (f.pagina > 1) q.pagina = String(f.pagina);
  return q;
}

/** ¿Hay algún filtro puesto (además de la pestaña)? */
export function hayFiltrosStaff(f: FiltrosStaff): boolean {
  return !!(f.q || f.idioma || f.origen || f.fuente || f.desde || f.areas.length || f.seniority.length || f.fecha || f.atajo);
}
