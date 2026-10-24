import type { Area, Disponibilidad } from "./listas";
import { leerFiltrosProyectos, type OrdenProyectos } from "./proyectos";

/**
 * Portfolios de la comunidad: cada persona con perfil de talento (verificada) puede poner su portfolio
 * (uno por persona). La gente le da me gusta y salen en rankings, como los proyectos.
 *
 * "Tu portfolio a juicio": el directo de los viernes en el que el staff revisa portfolios. Quien quiera lo pide;
 * el staff elige cuáles (sin orden) y, al revisarlo, apunta la fecha y el enlace al vídeo. Da el emblema "juicio".
 */

export const LIMITES_PORTFOLIO = { descripcion: { max: 500 } } as const;
export const PORTFOLIOS_POR_PAGINA = 24;

export type DatosPortfolio = {
  url: string;
  descripcion: string | null;
  /** Quiere que lo revisemos en "Tu portfolio a juicio". */
  quiereJuicio: boolean;
};

/** Cómo va su "Tu portfolio a juicio": sin pedir, pedido (esperando) o revisado (con fecha y vídeo). */
export type JuicioPortfolio =
  | { estado: "no" }
  | { estado: "pedido"; pedidoEn: string }
  | { estado: "revisado"; revisadoEn: string; video: string | null };

export type PortfolioListado = {
  /** El alias de su autor (un portfolio por persona). */
  alias: string;
  url: string;
  /** "ana.dev" (para enseñar). */
  dominio: string;
  descripcion: string | null;
  /** La imagen que la propia web dice que la representa (og:image), si tiene. */
  imagen: string | null;
  autor: { nombre: string; titular: string; area: Area; imagen: string | null; disponibilidad: Disponibilidad };
  megusta: number;
  megustaPeriodo?: number;
  meGusta: boolean;
  oculto: boolean;
  esMio: boolean;
  juicio: JuicioPortfolio;
  creadoEn: string;
};

export type ResultadoPortfolios = { portfolios: PortfolioListado[]; total: number; pagina: number; hayMas: boolean; mes: string };

export type FiltrosPortfolios = { q?: string; areas: Area[]; orden: OrdenProyectos; mes?: string; pagina: number; soloJuicio?: boolean };

/** Lo del staff: los que piden "Tu portfolio a juicio" y los ya revisados. */
export type PortfolioJuicioStaff = {
  alias: string;
  nombre: string;
  url: string;
  descripcion: string | null;
  juicio: JuicioPortfolio;
  megusta: number;
};

export type ReportePortfolio = {
  id: string;
  portfolio: { alias: string; nombre: string; url: string; oculto: boolean };
  motivo: string;
  creadoEn: string;
};

function enlace(valor: unknown): string | null | "mal" {
  let t = typeof valor === "string" ? valor.trim() : "";
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    return (u.protocol === "https:" || u.protocol === "http:") && t.length <= 300 && u.hostname.includes(".") ? t : "mal";
  } catch {
    return "mal";
  }
}

export function validarPortfolio(entrada: unknown): { datos: DatosPortfolio; errores?: undefined } | { datos?: undefined; errores: Record<string, string> } {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};
  const url = enlace(e.url);
  if (!url) errores.url = "falta";
  else if (url === "mal") errores.url = "url";
  const descripcion = typeof e.descripcion === "string" && e.descripcion.trim() ? e.descripcion.trim() : null;
  if (descripcion && descripcion.length > LIMITES_PORTFOLIO.descripcion.max) errores.descripcion = "largo";
  if (Object.keys(errores).length) return { errores };
  return { datos: { url: url as string, descripcion, quiereJuicio: e.quiereJuicio === true } };
}

/** "https://www.ana.dev/inicio" → "ana.dev/inicio" */
export function dominioDe(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

/** Enlace del vídeo de "Tu portfolio a juicio": https y de YouTube, Twitch, TikTok, Instagram o LinkedIn. */
export function validarVideoJuicio(valor: unknown): string | null | "mal" {
  const v = enlace(valor);
  if (!v || v === "mal") return v;
  const host = new URL(v).hostname.replace(/^www\.|^m\./, "");
  return /^(youtube\.com|youtu\.be|twitch\.tv|tiktok\.com|instagram\.com|linkedin\.com)$/.test(host) ? v : "mal";
}

/** Los filtros de la dirección: como los de proyectos (sin tecnologías), y "juicio=1" (solo los que pasaron por el directo). */
export function leerFiltrosPortfolios(q: Record<string, string | string[] | undefined>, ahora = new Date()): FiltrosPortfolios {
  const f: Partial<ReturnType<typeof leerFiltrosProyectos>> & Omit<ReturnType<typeof leerFiltrosProyectos>, "tecnologias"> = leerFiltrosProyectos(q, ahora);
  delete f.tecnologias;
  const juicio = Array.isArray(q.juicio) ? q.juicio[0] : q.juicio;
  return { ...f, ...(juicio === "1" && { soloJuicio: true }) };
}
