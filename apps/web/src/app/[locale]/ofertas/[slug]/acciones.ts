"use server";

import { headers } from "next/headers";
import { ErrorDeApi, reportarOfertaEnApi } from "@/lib/api";

/** Reporta una oferta o a quien la publicó. Devuelve el código de error o null. */
export async function reportarOferta(id: string, motivo: string, sobre: "oferta" | "recruiter"): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    await reportarOfertaEnApi(cookie, id, motivo, sobre);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "otro";
  }
}
