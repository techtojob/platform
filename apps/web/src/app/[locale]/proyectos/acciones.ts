"use server";

import { headers } from "next/headers";
import { ErrorDeApi, megustaEnApi, megustaPortfolioEnApi, reportarPortfolioEnApi, reportarProyectoEnApi } from "@/lib/api";

/** Un proyecto (por su id) o un portfolio (por el alias de su autor). */
export type QueCosa = { tipo: "proyecto" | "portfolio"; id: string };

/** Da o quita el me gusta. Devuelve cómo queda, o el código de error. */
export async function darMegusta({ tipo, id }: QueCosa, dar: boolean): Promise<{ megusta: number; meGusta: boolean } | { error: string }> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return { error: "sin_sesion" };
  try {
    return tipo === "portfolio" ? await megustaPortfolioEnApi(cookie, id, dar) : await megustaEnApi(cookie, id, dar);
  } catch (error) {
    return { error: error instanceof ErrorDeApi ? error.codigo : "otro" };
  }
}

/** Reporta un proyecto o un portfolio. Devuelve el código de error o null. */
export async function reportarProyecto({ tipo, id }: QueCosa, motivo: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    if (tipo === "portfolio") await reportarPortfolioEnApi(cookie, id, motivo);
    else await reportarProyectoEnApi(cookie, id, motivo);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "otro";
  }
}
