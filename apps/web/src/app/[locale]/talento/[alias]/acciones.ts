"use server";

import { headers } from "next/headers";
import { ErrorDeApi, reportarPerfilEnApi } from "@/lib/api";

/** Reporta un perfil. Devuelve el código de error o null. */
export async function reportarPerfil(alias: string, motivo: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await reportarPerfilEnApi(cookie, alias, motivo);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "otro";
  }
}
