"use server";

import { headers } from "next/headers";
import { ErrorDeApi, reportarOfertaEnApi, reportarPerfilEnApi, reportarPortfolioEnApi, reportarProyectoEnApi } from "@/lib/api";

/**
 * Qué se reporta: una oferta o a quien la publicó (por el id de la oferta), un perfil o un portfolio
 * (por el alias de su autor) o un proyecto (por su id).
 */
export type CosaReportable = { tipo: "oferta" | "recruiter" | "perfil" | "proyecto" | "portfolio"; id: string };

/** Envía el reporte. Devuelve el código de error o null. */
export async function reportar({ tipo, id }: CosaReportable, motivo: string): Promise<string | null> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) return "sin_sesion";
  try {
    if (tipo === "oferta" || tipo === "recruiter") await reportarOfertaEnApi(cookie, id, motivo, tipo);
    else if (tipo === "perfil") await reportarPerfilEnApi(cookie, id, motivo);
    else if (tipo === "proyecto") await reportarProyectoEnApi(cookie, id, motivo);
    else await reportarPortfolioEnApi(cookie, id, motivo);
    return null;
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "otro";
  }
}
