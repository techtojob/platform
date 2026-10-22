"use server";

import { validarPortfolio, validarProyecto } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { borrarPortfolioEnApi, borrarProyectoEnApi, ErrorDeApi, fijarProyectoEnApi, guardarPortfolioEnApi, guardarProyectoEnApi } from "@/lib/api";

export type ResultadoProyecto = { errores?: Record<string, string>; error?: string; id?: string };

const recargar = () => {
  revalidatePath("/[locale]/proyectos", "layout");
  revalidatePath("/[locale]/talento", "layout");
  revalidatePath("/[locale]/cuenta/proyectos", "layout");
};

/** Sube un proyecto (sin `id`) o guarda los cambios de uno mío. */
export async function guardarProyecto(id: string | null, valores: unknown): Promise<ResultadoProyecto> {
  const comprobado = validarProyecto(valores);
  if (comprobado.errores) return { errores: comprobado.errores };
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    const r = await guardarProyectoEnApi(cookie, id, comprobado.datos);
    recargar();
    return { id: r.id ?? id! };
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

export async function borrarProyecto(id: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await borrarProyectoEnApi(cookie, id);
    recargar();
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
}

/** Fija (o quita de fijado) un proyecto en mi perfil. Como mucho 3. */
export async function fijarProyecto(id: string, fijado: boolean): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await fijarProyectoEnApi(cookie, id, fijado);
    recargar();
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
}

export type ResultadoPortfolio = { errores?: Record<string, string>; error?: string; ok?: true };

/** Pone o cambia mi portfolio (y si quiero "Tu portfolio a juicio"). */
export async function guardarPortfolio(valores: unknown): Promise<ResultadoPortfolio> {
  const comprobado = validarPortfolio(valores);
  if (comprobado.errores) return { errores: comprobado.errores };
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    await guardarPortfolioEnApi(cookie, comprobado.datos);
    recargar();
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

export async function borrarPortfolio(): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await borrarPortfolioEnApi(cookie);
    recargar();
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
}
