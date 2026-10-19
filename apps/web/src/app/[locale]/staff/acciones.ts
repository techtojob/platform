"use server";

import { COMPROBACIONES, validarOferta, type Comprobacion } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { ErrorDeApi } from "@/lib/api";
import { accionOferta, crearEmpresa, guardarOfertaEnApi, type AccionStaff } from "@/lib/api-staff";
import { datosParaApi, EMPRESA_NUEVA, valoresDeFormulario, type ValoresOferta } from "@/lib/formulario-oferta";

/** Lo que vuelve al formulario: lo escrito (para no perderlo) y qué está mal. */
export type EstadoFormulario = {
  valores?: ValoresOferta;
  errores?: Record<string, string>;
  /** Error general (sin permiso, el API no responde…). */
  error?: string;
  /** Sube en cada envío: el formulario se vuelve a pintar con lo escrito. */
  intento: number;
};

/** Crear (id null) o editar una oferta. Si sale bien, lleva a la oferta en el panel. */
export async function guardarOferta(id: string | null, previo: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const valores = valoresDeFormulario(formulario);
  const intento = previo.intento + 1;
  const nueva = valores.empresaId === EMPRESA_NUEVA;

  // Primero se comprueba todo aquí (con las mismas reglas que el API) para no crear empresas de más.
  const errores: Record<string, string> = {};
  if (nueva && valores.empresaNombre.length < 2) errores.empresaNombre = "falta";
  const comprobada = validarOferta(datosParaApi(valores, nueva ? "pendiente" : valores.empresaId));
  Object.assign(errores, comprobada.errores);
  if (Object.keys(errores).length) return { valores, errores, intento };

  let guardadaId: string;
  try {
    const empresaId = nueva ? (await crearEmpresa(valores.empresaNombre, valores.empresaWeb)).id : valores.empresaId;
    guardadaId = (await guardarOfertaEnApi(id, datosParaApi(valores, empresaId))).id;
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { valores, errores: error.campos, intento };
    return { valores, error: error instanceof ErrorDeApi ? error.codigo : "desconocido", intento };
  }
  revalidatePath("/[locale]/staff", "layout");
  // El idioma llega del formulario: en una acción de servidor no se puede leer de la dirección.
  const pedido = String(formulario.get("locale"));
  const locale = (locales as string[]).includes(pedido) ? (pedido as Locale) : locales[0]!;
  redirect({ href: { pathname: "/staff/ofertas/[id]", params: { id: guardadaId } }, locale });
  return { intento };
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
