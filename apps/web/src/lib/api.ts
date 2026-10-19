import "server-only";
import type { Area, Cuenta, ErrorApi, Idioma, Modalidad, OfertaDetalle, ResultadoOfertas, Seniority } from "@techtojob/shared";
import { cache } from "react";

/**
 * Llamadas al API desde el servidor de la web. Las páginas no usan `fetch`
 * directamente: llaman a estas funciones.
 */

/** Dirección del API. En local, el de `pnpm dev:api`. */
const API_URL = process.env.API_URL ?? "http://localhost:8787";

export class ErrorDeApi extends Error {
  constructor(
    public readonly estado: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, { cache: "no-store", ...init });
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as ErrorApi | null;
    throw new ErrorDeApi(res.status, cuerpo?.error.codigo ?? "desconocido", cuerpo?.error.mensaje ?? res.statusText);
  }
  return (await res.json()) as T;
}

export type FiltrosListado = {
  idiomas: Idioma[];
  areas?: Area[];
  seniority?: Seniority[];
  modalidades?: Modalidad[];
  tecnologias?: string[];
  q?: string;
  conSalario?: boolean;
  limite?: number;
  despues?: string;
};

export function obtenerOfertas(f: FiltrosListado): Promise<ResultadoOfertas> {
  const q = new URLSearchParams({ idiomas: f.idiomas.join(",") });
  if (f.areas?.length) q.set("area", f.areas.join(","));
  if (f.seniority?.length) q.set("nivel", f.seniority.join(","));
  if (f.modalidades?.length) q.set("modalidad", f.modalidades.join(","));
  if (f.tecnologias?.length) q.set("tec", f.tecnologias.join(","));
  if (f.q) q.set("q", f.q);
  if (f.conSalario) q.set("salario", "1");
  if (f.limite) q.set("limite", String(f.limite));
  if (f.despues) q.set("despues", f.despues);
  return pedir<ResultadoOfertas>(`/ofertas?${q}`);
}

/**
 * Una oferta entera, o null si no existe o no está publicada.
 * Con `cache`, la página y sus metadatos (título de la pestaña) hacen una sola llamada.
 */
export const obtenerOferta = cache(async (id: string): Promise<OfertaDetalle | null> => {
  try {
    return await pedir<OfertaDetalle>(`/ofertas/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ErrorDeApi && error.estado === 404) return null;
    throw error;
  }
});

/**
 * "Mi cuenta" de quien visita, o null si no ha iniciado sesión.
 * Se le pasa la cabecera Cookie de la visita: el API reconoce la sesión por ella.
 */
export const obtenerCuenta = cache(async (cookie: string | null): Promise<Cuenta | null> => {
  if (!cookie || !tieneCookieDeSesion(cookie)) return null;
  try {
    return await pedir<Cuenta>("/cuenta", { headers: { cookie } });
  } catch (error) {
    if (error instanceof ErrorDeApi && error.estado === 401) return null;
    throw error;
  }
});

/** Vuelve a preguntar al bot si está en el servidor de Discord. */
export function comprobarDiscordEnApi(cookie: string): Promise<Cuenta> {
  return pedir<Cuenta>("/cuenta/discord/comprobar", { method: "POST", headers: { cookie } });
}

/** ¿Lleva la cookie de sesión de Better Auth? Si no, ni se pregunta al API. */
export function tieneCookieDeSesion(cookie: string): boolean {
  return /(^|;\s*)(__Secure-)?better-auth\.session_token=/.test(cookie);
}
