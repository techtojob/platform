"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { borrarCuentaEnApi, comprobarDiscordEnApi, ErrorDeApi, exportarDatosEnApi } from "@/lib/api";

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

/** Todo lo que guardamos de la persona, en JSON (para que lo descargue). */
export async function descargarMisDatos(): Promise<{ json: string } | { error: string }> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    return { json: JSON.stringify(await exportarDatosEnApi(cookie), null, 2) };
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "desconocido" };
  }
}

/**
 * Borra la cuenta y todo lo suyo. Hay que escribir el email de la cuenta para confirmar.
 * Después quita la cookie de sesión, que ya no vale.
 */
export async function borrarMiCuenta(confirmacion: string, idioma: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await borrarCuentaEnApi(cookie, confirmacion);
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
  const almacen = await cookies();
  for (const nombre of ["better-auth.session_token", "__Secure-better-auth.session_token", "better-auth.session_data", "__Secure-better-auth.session_data"]) {
    almacen.delete(nombre);
  }
  // A la portada de la bolsa, ya sin sesión. (El idioma llega del navegador: aquí no se puede leer de la dirección.)
  const locale = (locales as string[]).includes(idioma) ? (idioma as Locale) : locales[0]!;
  redirect({ href: "/", locale });
  return null;
}
