"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeApi } from "@/lib/api";
import { configurarEmpresaEnApi, crearEmpresa, type CambiosEmpresa } from "@/lib/api-staff";

const codigo = (error: unknown) => (error instanceof ErrorDeApi ? error.codigo : "desconocido");

/** Añade una empresa con su página de empleo. Devuelve el código de error, si lo hay. */
export async function anadirEmpresa(nombre: string, paginaEmpleo: string): Promise<string | null> {
  try {
    await crearEmpresa(nombre.trim(), "", paginaEmpleo.trim());
  } catch (error) {
    return codigo(error);
  }
  revalidatePath("/[locale]/staff", "layout");
  return null;
}

export async function configurarEmpresa(id: string, cambios: CambiosEmpresa): Promise<string | null> {
  try {
    await configurarEmpresaEnApi(id, cambios);
  } catch (error) {
    return codigo(error);
  }
  revalidatePath("/[locale]/staff", "layout");
  return null;
}
