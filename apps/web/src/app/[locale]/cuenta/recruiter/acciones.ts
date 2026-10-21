"use server";

import { validarSolicitudRecruiter } from "@techtojob/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ErrorDeApi, solicitarRecruiterEnApi } from "@/lib/api";

export type ResultadoSolicitud = { errores?: Record<string, string>; error?: string; ok?: true };

/** Pedir ser recruiter (o actualizar la solicitud pendiente). */
export async function solicitarRecruiter(datos: Record<string, string>): Promise<ResultadoSolicitud> {
  const r = validarSolicitudRecruiter(datos);
  if (r.errores) return { errores: r.errores };
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    await solicitarRecruiterEnApi(cookie, r.datos);
  } catch (error) {
    if (error instanceof ErrorDeApi && Object.keys(error.campos).length) return { errores: error.campos };
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}
