"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeApi } from "@/lib/api";
import { resolverReporteEnApi } from "@/lib/api-staff";

/** Descartar un reporte (el perfil está bien) u ocultar el perfil. Devuelve el error, si lo hay. */
export async function resolverReporte(id: string, accion: "descartar" | "ocultar"): Promise<string | null> {
  try {
    await resolverReporteEnApi(id, accion);
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
  revalidatePath("/[locale]/staff", "layout");
  return null;
}
