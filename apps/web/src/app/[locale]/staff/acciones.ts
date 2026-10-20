"use server";

import { COMPROBACIONES, validarOferta, type Comprobacion, type OfertaImportada, type OfertaRepetida } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { ErrorDeApi } from "@/lib/api";
import {
  accionOferta,
  buscarRepetidaEnApi,
  crearEmpresa,
  guardarOfertaEnApi,
  importarEnApi,
  type AccionStaff,
} from "@/lib/api-staff";
import { datosParaApi, type ValoresOferta } from "@/lib/formulario-oferta";

/** Lo que vuelve al formulario si algo está mal (si sale bien, se va a la oferta). */
export type ResultadoGuardar = { errores?: Record<string, string>; error?: string };

/**
 * Crear (id null) o editar una oferta. Con `publicar` (las comprobaciones marcadas),
 * además la publica en el mismo paso.
 */
export async function guardarOferta(
  id: string | null,
  valores: ValoresOferta,
  publicar: Comprobacion[] | null,
  idioma: string,
): Promise<ResultadoGuardar> {
  // Primero se comprueba aquí, con las mismas reglas que el API, para no crear empresas de más.
  const errores: Record<string, string> = {};
  const nueva = !!valores.empresa && !valores.empresa.id;
  if (!valores.empresa) errores.empresaId = "falta";
  else if (nueva && valores.empresa.nombre.trim().length < 2) errores.empresaId = "falta";
  Object.assign(errores, validarOferta(datosParaApi(valores, valores.empresa?.id ?? "pendiente")).errores);
  if (publicar && !COMPROBACIONES.every((c) => publicar.includes(c))) errores.comprobaciones = "faltan";
  if (Object.keys(errores).length) return { errores };

  let guardadaId: string;
  try {
    const empresaId = nueva ? (await crearEmpresa(valores.empresa!.nombre.trim(), valores.empresa!.web.trim())).id : valores.empresa!.id!;
    guardadaId = (await guardarOfertaEnApi(id, datosParaApi(valores, empresaId))).id;
    if (publicar) await accionOferta(guardadaId, { accion: "publicar", comprobaciones: publicar });
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    // Se guardó, pero no se pudo publicar: una automática necesita un resumen propio.
    if (error instanceof ErrorDeApi && error.codigo === "resumen") return { errores: { resumen: "propio" } };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
  revalidatePath("/[locale]/staff", "layout");
  // El idioma llega del formulario: en una acción de servidor no se puede leer de la dirección.
  const locale = (locales as string[]).includes(idioma) ? (idioma as Locale) : locales[0]!;
  redirect({ href: { pathname: "/staff/ofertas/[id]", params: { id: guardadaId } }, locale });
  return {};
}

/** Lee la página de la oferta y devuelve lo que se pueda para el formulario. */
export async function importarDesdeEnlace(url: string): Promise<OfertaImportada | { error: string }> {
  try {
    return await importarEnApi(url);
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

/** ¿Ya hay una oferta con este enlace? (sin contar la que se está editando) */
export async function comprobarEnlace(url: string, sin: string | null): Promise<OfertaRepetida | null> {
  try {
    return await buscarRepetidaEnApi(url, sin);
  } catch {
    return null;
  }
}

export type EstadoAccion = { error?: string; hecho?: AccionStaff["accion"] };

/** Publicar, rechazar, cerrar o alargar. Devuelve el error, si lo hay. */
export async function hacerAccion(id: string, _previo: EstadoAccion, formulario: FormData): Promise<EstadoAccion> {
  const accion = String(formulario.get("accion"));
  let peticion: AccionStaff;
  if (accion === "publicar") {
    const marcadas = formulario.getAll("comprobaciones").map(String) as Comprobacion[];
    if (!COMPROBACIONES.every((c) => marcadas.includes(c))) return { error: "comprobaciones" };
    peticion = { accion, comprobaciones: marcadas };
  } else if (accion === "rechazar") {
    peticion = { accion, motivo: String(formulario.get("motivo") ?? "") };
  } else if (accion === "cerrar" || accion === "alargar") {
    peticion = { accion };
  } else {
    return { error: "desconocido" };
  }
  try {
    await accionOferta(id, peticion);
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
  revalidatePath("/[locale]/staff", "layout");
  return { hecho: peticion.accion };
}
