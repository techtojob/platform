"use server";

import { headers } from "next/headers";
import { ErrorDeApi, megustaEnApi, megustaPortfolioEnApi } from "@/lib/api";

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
