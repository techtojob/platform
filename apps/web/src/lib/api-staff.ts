import "server-only";
import type { Comprobacion, EmpresaStaff, ReportePerfil, EstadoOferta, OfertaImportada, OfertaRepetida, OfertaStaff } from "@techtojob/shared";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ErrorDeApi, obtenerCuenta, pedir } from "./api";

/**
 * Llamadas del panel de staff. Todas llevan la cookie de quien visita:
 * el API decide si es staff (rol de moderador en Discord o STAFF_EMAILS).
 */

export type ListaStaff = {
  estado: EstadoOferta;
  ofertas: OfertaStaff[];
  cuentas: Partial<Record<EstadoOferta, number>>;
  /** Reportes de perfiles sin revisar. */
  reportes: number;
};

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

export async function listarOfertasStaff(estado: EstadoOferta): Promise<ListaStaff> {
  return pedir<ListaStaff>(`/staff/ofertas?estado=${estado}`, await conCookie());
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

export async function crearEmpresa(nombre: string, web: string): Promise<EmpresaStaff> {
  return pedir<EmpresaStaff>("/staff/empresas", await conCookie({ method: "POST", body: JSON.stringify({ nombre, web }) }));
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
