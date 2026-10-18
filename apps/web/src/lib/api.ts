import "server-only";
import type { Area, ErrorApi, Idioma, Modalidad, ResultadoOfertas, Seniority } from "@techtojob/shared";

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

async function pedir<T>(ruta: string): Promise<T> {
  const res = await fetch(`${API_URL}${ruta}`, { cache: "no-store" });
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
  despues?: string;
};

export function obtenerOfertas(f: FiltrosListado): Promise<ResultadoOfertas> {
  const q = new URLSearchParams({ idiomas: f.idiomas.join(",") });
  if (f.areas?.length) q.set("area", f.areas.join(","));
  if (f.seniority?.length) q.set("nivel", f.seniority.join(","));
  if (f.modalidades?.length) q.set("modalidad", f.modalidades.join(","));
  if (f.tecnologias?.length) q.set("tec", f.tecnologias.join(","));
  if (f.despues) q.set("despues", f.despues);
  return pedir<ResultadoOfertas>(`/ofertas?${q}`);
}
