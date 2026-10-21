"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ErrorDeApi, guardarUbicacionEnApi } from "@/lib/api";

/** Guarda el país y la región de la cuenta. Devuelve el campo que falla ("pais" o "region") o null si va bien. */
export async function guardarUbicacion(pais: string, region: string | null): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await guardarUbicacionEnApi(cookie, pais, region);
  } catch (error) {
    if (error instanceof ErrorDeApi) return Object.keys(error.campos)[0] ?? error.codigo;
    return "desconocido";
  }
  revalidatePath("/[locale]", "layout");
  return null;
}
