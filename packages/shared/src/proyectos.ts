import type { Area, Disponibilidad } from "./listas";
import { AREAS } from "./listas";
import { TECNOLOGIAS } from "./tecnologias";

/**
 * Proyectos de la comunidad: cada persona con perfil de talento (verificada) sube lo que ha construido
 * y la gente le da me gusta. Rankings: este mes, tendencia (7 días), de siempre y nuevos.
 */

export const ESTADOS_PROYECTO = ["en_curso", "terminado"] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export const ORDENES_PROYECTOS = ["mes", "tendencia", "siempre", "nuevos"] as const;
export type OrdenProyectos = (typeof ORDENES_PROYECTOS)[number];

/** porMes: proyectos nuevos al mes (hora de España; editar no cuenta). */
export const LIMITES_PROYECTO = { titulo: { min: 3, max: 80 }, descripcion: { min: 20, max: 600 }, tecnologias: 10, fijados: 3, porPersona: 30, porMes: 1 } as const;
export const PROYECTOS_POR_PAGINA = 24;
/** Una cuenta recién creada no cuenta en los me gusta hasta que tiene estos días (contra trampas). */
export const DIAS_PARA_CONTAR_MEGUSTA = 3;

export type DatosProyecto = {
  titulo: string;
  descripcion: string;
  area: Area;
  tecnologias: string[];
  repo: string | null;
  demo: string | null;
  video: string | null;
  estado: EstadoProyecto;
};

export type ProyectoListado = DatosProyecto & {
  id: string;
  slug: string;
  /** Imagen automática de GitHub (si el repositorio es de GitHub); si no, null. */
  portada: string | null;
  autor: { alias: string; nombre: string; imagen: string | null; disponibilidad: Disponibilidad };
  megusta: number;
  /** Con orden "mes" o "tendencia": los me gusta de ese periodo. */
  megustaPeriodo?: number;
  /** Lo ha ocultado el staff (solo lo ve su autor). */
  oculto: boolean;
  /** Quien mira ya le ha dado me gusta. */
  meGusta: boolean;
  /** Fijado en el perfil de su autor (los 3 mejores, arriba). */
  fijado: boolean;
  /** Es de quien lo está mirando. */
  esMio: boolean;
  creadoEn: string;
};

export type ResultadoProyectos = {
  proyectos: ProyectoListado[];
  total: number;
  pagina: number;
  hayMas: boolean;
  /** "2026-10": el mes del ranking (con orden "mes"). */
  mes: string;
};

export type FiltrosProyectos = {
  q?: string;
  areas: Area[];
  tecnologias: string[];
  orden: OrdenProyectos;
  /** "2026-09": ranking de un mes pasado (con orden "mes"). */
  mes?: string;
  pagina: number;
};

const idsTecnologias = new Set<string>(TECNOLOGIAS.map((t) => t.id));

/** "https://github.com/ana/mi-app" → "https://opengraph.githubassets.com/1/ana/mi-app" (la imagen que hace GitHub). */
export function portadaGithub(repo: string | null): string | null {
  if (!repo) return null;
  const m = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/?$/.exec(repo.replace(/\.git$/, ""));
  return m ? `https://opengraph.githubassets.com/1/${m[1]}/${m[2]}` : null;
}

/** "Mi app de datos" → "mi-app-de-datos". */
export function slugProyecto(titulo: string): string {
  return (
    titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "proyecto"
  );
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function enlace(valor: unknown): string | null | "mal" {
  let t = texto(valor);
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    return (u.protocol === "https:" || u.protocol === "http:") && t.length <= 300 && u.hostname.includes(".") ? t : "mal";
  } catch {
    return "mal";
  }
}

export function validarProyecto(entrada: unknown): { datos: DatosProyecto; errores?: undefined } | { datos?: undefined; errores: Record<string, string> } {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};
  const titulo = texto(e.titulo);
  if (!titulo) errores.titulo = "falta";
  else if (titulo.length < LIMITES_PROYECTO.titulo.min) errores.titulo = "corto";
  else if (titulo.length > LIMITES_PROYECTO.titulo.max) errores.titulo = "largo";
  const descripcion = texto(e.descripcion);
  if (!descripcion) errores.descripcion = "falta";
  else if (descripcion.length < LIMITES_PROYECTO.descripcion.min) errores.descripcion = "corto";
  else if (descripcion.length > LIMITES_PROYECTO.descripcion.max) errores.descripcion = "largo";
  const area = typeof e.area === "string" && (AREAS as readonly string[]).includes(e.area) ? (e.area as Area) : null;
  if (!area) errores.area = "falta";
  const tecnologias = Array.isArray(e.tecnologias) ? [...new Set(e.tecnologias.filter((t): t is string => typeof t === "string"))] : [];
  if (tecnologias.some((t) => !idsTecnologias.has(t))) errores.tecnologias = "desconocida";
  else if (tecnologias.length > LIMITES_PROYECTO.tecnologias) errores.tecnologias = "demasiadas";
  const repo = enlace(e.repo);
  const demo = enlace(e.demo);
  const video = enlace(e.video);
  if (repo === "mal") errores.repo = "url";
  if (demo === "mal") errores.demo = "url";
  if (video === "mal") errores.video = "url";
  // Hace falta algo que mirar: el repositorio o la demo.
  if (!repo && !demo && !errores.repo && !errores.demo) errores.repo = "repoODemo";
  const estado = e.estado === "en_curso" ? "en_curso" : "terminado";
  if (Object.keys(errores).length) return { errores };
  return {
    datos: { titulo: titulo!, descripcion: descripcion!, area: area!, tecnologias, repo: repo as string | null, demo: demo as string | null, video: video as string | null, estado },
  };
}

/** "2026-10" del momento dado (hora de España: el mes cambia a medianoche en Madrid). */
export function mesDe(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).formatToParts(fecha);
  return `${partes.find((p) => p.type === "year")!.value}-${partes.find((p) => p.type === "month")!.value}`;
}

export function leerFiltrosProyectos(q: Record<string, string | string[] | undefined>, ahora = new Date()): FiltrosProyectos {
  const uno = (v: unknown) => (Array.isArray(v) ? v[0] : v) ?? "";
  const varios = (v: unknown) => String(uno(v)).split(",").map((s) => s.trim()).filter(Boolean);
  const orden = (ORDENES_PROYECTOS as readonly string[]).includes(String(uno(q.orden))) ? (String(uno(q.orden)) as OrdenProyectos) : "mes";
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(uno(q.mes))) && String(uno(q.mes)) <= mesDe(ahora) ? String(uno(q.mes)) : undefined;
  const pagina = Number.parseInt(String(uno(q.pagina)), 10);
  return {
    ...(String(uno(q.q)).trim() && { q: String(uno(q.q)).trim().slice(0, 100) }),
    areas: varios(q.area).filter((a): a is Area => (AREAS as readonly string[]).includes(a)),
    tecnologias: varios(q.tec).filter((t) => idsTecnologias.has(t)),
    orden,
    ...(orden === "mes" && mes && { mes }),
    pagina: Number.isFinite(pagina) && pagina > 1 ? Math.min(pagina, 200) : 1,
  };
}
