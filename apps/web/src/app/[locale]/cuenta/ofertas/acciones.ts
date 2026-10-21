"use server";

import { validarOfertaUsuario, type OfertaImportada } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { ErrorDeApi, importarComoUsuarioEnApi, retirarOfertaEnApi, subirOfertaEnApi } from "@/lib/api";
import { datosUsuarioParaApi, type ValoresOferta } from "@/lib/formulario-oferta";

export type ResultadoSubir = { errores?: Record<string, string>; error?: string };

const cookie = async () => (await headers()).get("cookie");

/** Sube la oferta (queda pendiente de revisar). Si va bien, lleva a "Mis ofertas". */
export async function subirOferta(valores: ValoresOferta, declaracion: boolean, idioma: string): Promise<ResultadoSubir> {
  const datos = datosUsuarioParaApi(valores, declaracion);
  const r = validarOfertaUsuario(datos);
  if (r.errores) return { errores: r.errores };
  const c = await cookie();
  if (!c) return { error: "sin_sesion" };
  try {
    await subirOfertaEnApi(c, datos);
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
  revalidatePath("/[locale]/cuenta/ofertas", "page");
  const locale = (locales as string[]).includes(idioma) ? (idioma as Locale) : locales[0]!;
  redirect({ href: { pathname: "/cuenta/ofertas", query: { enviada: "1" } }, locale });
  return {};
}

/** "Rellenar desde el enlace". */
export async function importarComoUsuario(url: string): Promise<OfertaImportada | { error: string }> {
  const c = await cookie();
  if (!c) return { error: "sin_sesion" };
  try {
    return await importarComoUsuarioEnApi(c, url);
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

/** Quitar una oferta propia. Devuelve el código de error o null. */
export async function retirarOferta(id: string): Promise<string | null> {
  const c = await cookie();
  if (!c) return "sin_sesion";
  try {
    await retirarOfertaEnApi(c, id);
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
  revalidatePath("/[locale]/cuenta/ofertas", "page");
  return null;
}
