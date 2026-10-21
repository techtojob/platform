"use server";

import { revalidatePath } from "next/cache";
import { ErrorDeApi } from "@/lib/api";
import { accionRecruiterEnApi, type AccionRecruiter } from "@/lib/api-staff";

/** Bloquear, desbloquear o marcar como agencia a un recruiter. Devuelve el código de error o null. */
export async function accionRecruiter(userId: string, accion: AccionRecruiter): Promise<string | null> {
  try {
    await accionRecruiterEnApi(userId, accion);
  } catch (error) {
    return error instanceof ErrorDeApi ? error.codigo : "desconocido";
  }
  revalidatePath("/[locale]/staff", "layout");
  return null;
}
