"use server";

import { validarPerfil } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { borrarMiPerfilEnApi, ErrorDeApi, guardarMiPerfilEnApi } from "@/lib/api";
import { perfilParaApi, type ValoresPerfil } from "@/lib/formulario-perfil";

export type ResultadoPerfil = { errores?: Record<string, string>; error?: string; guardado?: { alias: string; actualizadoEn: string } };

/** Guarda (o crea) mi perfil de talento. */
export async function guardarMiPerfil(valores: ValoresPerfil): Promise<ResultadoPerfil> {
  const datos = perfilParaApi(valores);
  const comprobado = validarPerfil(datos);
  if (comprobado.errores) return { errores: comprobado.errores };
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    const r = await guardarMiPerfilEnApi(cookie, comprobado.datos);
    revalidatePath("/[locale]/talento", "layout");
    return { guardado: { alias: r.perfil!.alias, actualizadoEn: r.perfil!.actualizadoEn } };
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

/** Borra mi perfil de talento (la cuenta sigue). */
export async function borrarMiPerfil(): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await borrarMiPerfilEnApi(cookie);
    revalidatePath("/[locale]/talento", "layout");
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
}
