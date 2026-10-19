"use server";

import { headers } from "next/headers";
import { comprobarDiscordEnApi, ErrorDeApi } from "@/lib/api";

/** Vuelve a preguntar al bot si la persona está en el servidor. Devuelve un código de error o null. */
export async function comprobarDiscord(): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await comprobarDiscordEnApi(cookie);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
}
