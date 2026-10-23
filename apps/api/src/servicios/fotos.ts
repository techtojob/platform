import type { FotosCuenta } from "@techtojob/shared";
import { and, inArray } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { cuentas, usuarios } from "../db/esquema";

/**
 * Las fotos de Google y GitHub de cada persona, para que elija cuál enseñar en su perfil.
 * - GitHub: su avatar público, a partir del id de la cuenta (siempre el actual).
 * - Google: la foto que viene en el id_token de Google (se renueva en cada inicio de sesión).
 *   Si no estuviera, la de la cuenta si es de Google.
 */

/** La foto ("picture") del id_token de Google (un JWT: se lee la parte del medio, sin comprobar la firma). */
export function fotoDelIdToken(idToken: string | null): string | null {
  const medio = idToken?.split(".")[1];
  if (!medio) return null;
  try {
    const datos = JSON.parse(atob(medio.replace(/-/g, "+").replace(/_/g, "/"))) as { picture?: unknown };
    return typeof datos.picture === "string" && datos.picture.startsWith("https://") ? datos.picture : null;
  } catch {
    return null;
  }
}

// A 192 px (lo más grande que se enseña son 96 px, x2 para pantallas retina): GitHub la da a 460 si no se pide tamaño.
export const fotoGithub = (accountId: string) => `https://avatars.githubusercontent.com/u/${encodeURIComponent(accountId)}?v=4&s=192`;

export async function fotosDe(db: Db, userIds: string[]): Promise<Map<string, FotosCuenta>> {
  const r = new Map<string, FotosCuenta>(userIds.map((id) => [id, { google: null, github: null }]));
  if (!userIds.length) return r;
  const [filas, usus] = await Promise.all([
    db
      .select({ userId: cuentas.userId, proveedor: cuentas.providerId, accountId: cuentas.accountId, idToken: cuentas.idToken })
      .from(cuentas)
      .where(and(inArray(cuentas.userId, userIds), inArray(cuentas.providerId, ["google", "github"]))),
    db.select({ id: usuarios.id, imagen: usuarios.image }).from(usuarios).where(inArray(usuarios.id, userIds)),
  ]);
  const imagenDe = new Map(usus.map((u) => [u.id, u.imagen]));
  for (const f of filas) {
    const fotos = r.get(f.userId)!;
    if (f.proveedor === "github") fotos.github = fotoGithub(f.accountId);
    if (f.proveedor === "google") {
      const cuenta = imagenDe.get(f.userId);
      fotos.google = fotoDelIdToken(f.idToken) ?? (cuenta?.includes("googleusercontent") ? cuenta : null);
    }
  }
  return r;
}
