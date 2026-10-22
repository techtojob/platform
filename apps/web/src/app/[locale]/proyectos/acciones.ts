"use server";

import { headers } from "next/headers";
import { ErrorDeApi, megustaEnApi, reportarProyectoEnApi } from "@/lib/api";

/** Da o quita el me gusta. Devuelve cómo queda, o el código de error. */
export async function darMegusta(id: string, dar: boolean): Promise<{ megusta: number; meGusta: boolean } | { error: string }> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    return await megustaEnApi(cookie, id, dar);
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "otro" };
  }
}

/** Reporta un proyecto. Devuelve el código de error o null. */
export async function reportarProyecto(id: string, motivo: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await reportarProyectoEnApi(cookie, id, motivo);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "otro";
  }
}
