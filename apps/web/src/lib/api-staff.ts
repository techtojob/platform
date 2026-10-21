import "server-only";
import {
  parametrosStaff,
  type Comprobacion,
  type EmpresaStaff,
  type EstadoRecruiter,
  type ListaRecruiters,
  type FiltrosStaff,
  type ListaStaff,
  type OfertaImportada,
  type OfertaRepetida,
  type OfertaStaff,
  type ReportePerfil,
  type ResumenCandidatas,
  type SiguienteStaff,
} from "@techtojob/shared";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ErrorDeApi, obtenerCuenta, pedir } from "./api";

/**
 * Llamadas del panel de staff. Todas llevan la cookie de quien visita:
 * el API decide si es staff (rol de moderador en Discord o STAFF_EMAILS).
 */

async function cookie(): Promise<string> {
  return (await headers()).get("cookie") ?? "";
}

/** Para las páginas del panel: si quien visita no es staff, la página "no existe". */
export async function exigirStaff(): Promise<void> {
  const cuenta = await obtenerCuenta((await headers()).get("cookie")).catch(() => null);
  if (!cuenta?.esStaff) notFound();
}

const conCookie = async (init: RequestInit = {}): Promise<RequestInit> => ({
  ...init,
  headers: { cookie: await cookie(), ...(init.body ? { "content-type": "application/json" } : {}) },
});

/** La lista del panel con sus filtros (ver packages/shared/src/filtros-staff.ts). */
export async function listarOfertasStaff(filtros: FiltrosStaff): Promise<ListaStaff> {
  const q = new URLSearchParams({ ...parametrosStaff(filtros), estado: filtros.estado });
  return pedir<ListaStaff>(`/staff/ofertas?${q}`, await conCookie());
}

/** La siguiente por revisar con los mismos filtros, sin la actual ni las saltadas. */
export async function siguienteStaff(filtros: FiltrosStaff, actual: string | null, saltadas: string[]): Promise<SiguienteStaff> {
  const q = new URLSearchParams({ ...parametrosStaff({ ...filtros, pagina: 1 }), estado: filtros.estado });
  if (actual) q.set("actual", actual);
  if (saltadas.length) q.set("saltadas", saltadas.join(","));
  return pedir<SiguienteStaff>(`/staff/ofertas/siguiente?${q}`, await conCookie());
}

export async function rechazarVariasEnApi(ids: string[], motivo: string): Promise<number> {
  const r = await pedir<{ rechazadas: number }>("/staff/ofertas/rechazar-varias", await conCookie({ method: "POST", body: JSON.stringify({ ids, motivo }) }));
  return r.rechazadas;
}

export async function obtenerOfertaStaff(id: string): Promise<OfertaStaff | null> {
  try {
    return await pedir<OfertaStaff>(`/staff/ofertas/${encodeURIComponent(id)}`, await conCookie());
  } catch (error) {
    if (error instanceof ErrorDeApi && error.estado === 404) return null;
    throw error;
  }
}

export async function listarEmpresas(): Promise<EmpresaStaff[]> {
  return pedir<EmpresaStaff[]>("/staff/empresas", await conCookie());
}

export async function crearEmpresa(nombre: string, web: string, paginaEmpleo?: string): Promise<EmpresaStaff> {
  return pedir<EmpresaStaff>(
    "/staff/empresas",
    await conCookie({ method: "POST", body: JSON.stringify({ nombre, web, ...(paginaEmpleo !== undefined && { paginaEmpleo }) }) }),
  );
}

export type CambiosEmpresa = { paginaEmpleo?: string; sincronizar?: boolean; bloqueada?: boolean };

/** Página de empleo, leer cada día y "no publicar". */
export async function configurarEmpresaEnApi(id: string, cambios: CambiosEmpresa): Promise<EmpresaStaff> {
  return pedir<EmpresaStaff>(`/staff/empresas/${encodeURIComponent(id)}`, await conCookie({ method: "PATCH", body: JSON.stringify(cambios) }));
}

/** Crea (sin id) o edita (con id). Si algo está mal, lanza ErrorDeApi con `campos`. */
export async function guardarOfertaEnApi(id: string | null, datos: unknown): Promise<OfertaStaff> {
  const ruta = id ? `/staff/ofertas/${encodeURIComponent(id)}` : "/staff/ofertas";
  return pedir<OfertaStaff>(ruta, await conCookie({ method: id ? "PUT" : "POST", body: JSON.stringify(datos) }));
}

export type AccionStaff =
  | { accion: "publicar"; comprobaciones: Comprobacion[] }
  | { accion: "rechazar"; motivo: string }
  | { accion: "cerrar" }
  | { accion: "alargar" };

export async function accionOferta(id: string, { accion, ...datos }: AccionStaff): Promise<OfertaStaff> {
  return pedir<OfertaStaff>(
    `/staff/ofertas/${encodeURIComponent(id)}/${accion}`,
    await conCookie({ method: "POST", body: JSON.stringify(datos) }),
  );
}

export async function importarEnApi(url: string): Promise<OfertaImportada> {
  return pedir<OfertaImportada>("/staff/importar", await conCookie({ method: "POST", body: JSON.stringify({ url }) }));
}

export async function buscarRepetidaEnApi(url: string, sin: string | null): Promise<OfertaRepetida | null> {
  const q = new URLSearchParams({ url });
  if (sin) q.set("sin", sin);
  return (await pedir<{ repetida: OfertaRepetida | null }>(`/staff/repetida?${q}`, await conCookie())).repetida;
}

export async function listarReportes(): Promise<ReportePerfil[]> {
  return pedir<ReportePerfil[]>("/staff/reportes", await conCookie());
}

export async function resolverReporteEnApi(id: string, accion: "descartar" | "ocultar"): Promise<ReportePerfil[]> {
  return pedir<ReportePerfil[]>(`/staff/reportes/${encodeURIComponent(id)}/${accion}`, await conCookie({ method: "POST" }));
}

export async function resumenCandidatas(): Promise<ResumenCandidatas> {
  return pedir<ResumenCandidatas>("/staff/candidatas", await conCookie());
}

/** Sugerir empresas para descubrir (una por línea). */
export async function sugerirCandidatasEnApi(nombres: string): Promise<{ anadidas: number; resumen: ResumenCandidatas }> {
  return pedir("/staff/candidatas", await conCookie({ method: "POST", body: JSON.stringify({ nombres }) }));
}

/* ── Recruiters ── */

export async function listarRecruitersStaff(estado: EstadoRecruiter): Promise<ListaRecruiters> {
  return pedir<ListaRecruiters>(`/staff/recruiters?estado=${estado}`, await conCookie());
}

export type AccionRecruiter = { accion: "bloquear"; motivo: string } | { accion: "desbloquear" } | { accion: "agencia"; agencia: boolean };

export async function accionRecruiterEnApi(userId: string, { accion, ...datos }: AccionRecruiter): Promise<void> {
  await pedir<{ ok: true }>(
    `/staff/recruiters/${encodeURIComponent(userId)}/${accion}`,
    await conCookie({ method: "POST", body: JSON.stringify(datos) }),
  );
}
