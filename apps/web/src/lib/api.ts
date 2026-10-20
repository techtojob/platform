import "server-only";
import type { Area, Cuenta, ErrorValidacion, Idioma, MiPerfil, PerfilPublico, ResultadoTalento, Modalidad, OfertaDetalle, ResultadoOfertas, Seniority } from "@techtojob/shared";
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
    /** Si son datos mal puestos: qué campo y por qué ({ titulo: "corto" }). */
    public readonly campos: Record<string, string> = {},
  ) {
    super(mensaje);
  }
}

export async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, { cache: "no-store", ...init });
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as ErrorValidacion | null;
    throw new ErrorDeApi(
      res.status,
      cuerpo?.error.codigo ?? "desconocido",
      cuerpo?.error.mensaje ?? res.statusText,
      cuerpo?.error.campos ?? {},
    );
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
  /** País desde el que trabaja quien busca: solo las ofertas que puede hacer desde allí. */
  desde?: string | null;
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
  if (f.desde) q.set("desde", f.desde);
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

/** Todo lo que guardamos de la persona (para "Descargar mis datos"). */
export function exportarDatosEnApi(cookie: string): Promise<unknown> {
  return pedir("/cuenta/datos", { headers: { cookie } });
}

/** Borra la cuenta. `confirmacion` tiene que ser el email de la cuenta. */
export function borrarCuentaEnApi(cookie: string, confirmacion: string): Promise<{ ok: true }> {
  return pedir("/cuenta", { method: "DELETE", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ confirmacion }) });
}

/* ───────────── Talento ───────────── */

/** Perfiles para el buscador. Con la cookie, también los de "solo registrados". */
export function obtenerTalento(parametros: Record<string, string>, cookie: string | null): Promise<ResultadoTalento> {
  return pedir<ResultadoTalento>(`/talento?${new URLSearchParams(parametros)}`, { headers: conCookie(cookie) });
}

/** Un perfil: el perfil, "solo_registrados" si hay que entrar para verlo, o null si no existe. */
export const obtenerPerfilPublico = cache(
  async (alias: string, cookie: string | null): Promise<PerfilPublico | "solo_registrados" | null> => {
    try {
      return await pedir<PerfilPublico>(`/talento/${encodeURIComponent(alias)}`, { headers: conCookie(cookie) });
    } catch (error) {
      if (error instanceof ErrorDeApi && error.estado === 404) return null;
      if (error instanceof ErrorDeApi && error.codigo === "solo_registrados") return "solo_registrados";
      throw error;
    }
  },
);

export function obtenerMiPerfil(cookie: string): Promise<MiPerfil> {
  return pedir<MiPerfil>("/cuenta/perfil", { headers: { cookie } });
}

export function guardarMiPerfilEnApi(cookie: string, datos: unknown): Promise<MiPerfil> {
  return pedir<MiPerfil>("/cuenta/perfil", { method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(datos) });
}

export function borrarMiPerfilEnApi(cookie: string): Promise<{ ok: true }> {
  return pedir("/cuenta/perfil", { method: "DELETE", headers: { cookie } });
}

export function reportarPerfilEnApi(cookie: string, alias: string, motivo: string): Promise<{ ok: true }> {
  return pedir(`/talento/${encodeURIComponent(alias)}/reportar`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
}

/** Solo manda la cookie si es de sesión (si no, el API la ignoraría igual). */
function conCookie(cookie: string | null): Record<string, string> {
  return cookie && tieneCookieDeSesion(cookie) ? { cookie } : {};
}
