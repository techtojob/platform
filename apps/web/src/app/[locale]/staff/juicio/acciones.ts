"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeApi } from "@/lib/api";
import { marcarJuicioEnApi } from "@/lib/api-staff";

/** Marca un portfolio como revisado en "Tu portfolio a juicio" (fecha del directo y vídeo). Devuelve el error o null. */
export async function marcarJuicio(alias: string, fecha: string, video: string): Promise<string | null> {
  try {
    await marcarJuicioEnApi(alias, fecha, video);
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
  revalidatePath("/[locale]/staff", "layout");
  revalidatePath("/[locale]/proyectos", "layout");
  revalidatePath("/[locale]/talento", "layout");
  return null;
}
