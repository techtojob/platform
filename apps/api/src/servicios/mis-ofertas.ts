import { LIMITE_OFERTAS_USUARIO, type DatosOfertaUsuario, type MiOferta, type MisOfertas, type OfertaImportada } from "@techtojob/shared";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertas } from "../db/esquema";
import { buscarRepetida, importarOferta, type Pedir } from "./importar";
import { crearEmpresa, crearOferta } from "./ofertas-staff";

/**
 * Ofertas que sube cualquiera con su cuenta. Entran pendientes (origen "usuario") y las revisa
 * el staff como las demás. Cada cuenta puede tener LIMITE_OFERTAS_USUARIO a la vez: las pendientes
 * y las publicadas que no han caducado. Las rechazadas, caducadas o retiradas no cuentan.
 */

export class ErrorMisOfertas extends Error {
  constructor(
    public readonly codigo: "limite" | "repetida" | "empresa" | "no_encontrada" | "estado",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Motivo que se guarda al retirar una publicada (así se distingue de una cerrada por el staff). */
export const MOTIVO_RETIRADA = "Retirada por quien la subió.";

const enMarcha = (ahora: Date) =>
  or(eq(ofertas.estado, "pendiente"), and(eq(ofertas.estado, "publicada"), or(isNull(ofertas.caducaEn), gt(ofertas.caducaEn, ahora))));

export async function contarEnMarcha(db: Db, userId: string, ahora = new Date()): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(ofertas)
    .where(and(eq(ofertas.autorId, userId), enMarcha(ahora)));
  return Number(n);
}

function estadoParaAutor(o: { estado: string; caducaEn: Date | null; motivoRechazo: string | null }, ahora: Date): MiOferta["estado"] {
  if (o.estado === "publicada") return o.caducaEn && o.caducaEn <= ahora ? "caducada" : "publicada";
  if (o.estado === "cerrada") return o.motivoRechazo === MOTIVO_RETIRADA ? "retirada" : "caducada";
  return o.estado as MiOferta["estado"];
}

export async function listarMisOfertas(db: Db, userId: string, ahora = new Date()): Promise<MisOfertas> {
  const filas = await db
    .select({
      id: ofertas.id,
      slug: ofertas.slug,
      titulo: ofertas.titulo,
      empresa: empresas.nombre,
      estado: ofertas.estado,
      motivoRechazo: ofertas.motivoRechazo,
      creadaEn: ofertas.creadaEn,
      publicadaEn: ofertas.publicadaEn,
      caducaEn: ofertas.caducaEn,
    })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(eq(ofertas.autorId, userId))
    .orderBy(desc(ofertas.creadaEn), desc(ofertas.id));
  const lista: MiOferta[] = filas.map((o) => {
    const estado = estadoParaAutor(o, ahora);
    return {
      id: o.id,
      slug: o.slug,
      titulo: o.titulo,
      empresa: o.empresa,
      estado,
      // El motivo solo se enseña si la rechazó el staff.
      motivoRechazo: estado === "rechazada" ? o.motivoRechazo : null,
      creadaEn: o.creadaEn.toISOString(),
      publicadaEn: o.publicadaEn?.toISOString() ?? null,
      caducaEn: o.caducaEn?.toISOString() ?? null,
    };
  });
  return {
    ofertas: lista,
    limite: LIMITE_OFERTAS_USUARIO,
    enMarcha: lista.filter((o) => o.estado === "pendiente" || o.estado === "publicada").length,
  };
}

/** Sube una oferta (ya validada con validarOfertaUsuario). Devuelve su id. */
export async function subirOferta(db: Db, userId: string, d: DatosOfertaUsuario): Promise<string> {
  if ((await contarEnMarcha(db, userId)) >= LIMITE_OFERTAS_USUARIO) {
    throw new ErrorMisOfertas("limite", `Puedes tener ${LIMITE_OFERTAS_USUARIO} ofertas a la vez. Retira una o espera a que caduque.`);
  }
  // Si esa oferta ya está en la bolsa (o pendiente de revisar), no se repite.
  const repetida = await buscarRepetida(db, d.urlOriginal);
  if (repetida && repetida.estado !== "rechazada" && repetida.estado !== "cerrada") {
    throw new ErrorMisOfertas("repetida", "Esa oferta ya está en TechToJob.");
  }
  // La empresa: si ya existe (mismo nombre sin contar "S.L.", mayúsculas ni acentos), esa.
  const empresa = await crearEmpresa(db, { nombre: d.empresa.nombre, web: d.empresa.web });
  if (empresa.bloqueada) throw new ErrorMisOfertas("empresa", "Esa empresa nos ha pedido que no publiquemos sus ofertas.");
  const { empresa: _e, ...resto } = d;
  return crearOferta(db, { ...resto, empresaId: empresa.id, autorizada: false }, { autorId: userId });
}

/**
 * Quitar una oferta propia. Si aún no la había revisado nadie, se borra (y deja hueco).
 * Si ya estaba publicada, deja de salir ("cerrada", con el motivo MOTIVO_RETIRADA).
 */
export async function retirarOferta(db: Db, userId: string, id: string) {
  const [o] = await db
    .select({ estado: ofertas.estado })
    .from(ofertas)
    .where(and(eq(ofertas.id, id), eq(ofertas.autorId, userId)))
    .limit(1);
  if (!o) throw new ErrorMisOfertas("no_encontrada", "Esa oferta no existe.");
  if (o.estado === "pendiente") {
    await db.delete(ofertas).where(eq(ofertas.id, id));
    return;
  }
  if (o.estado !== "publicada") throw new ErrorMisOfertas("estado", "Esa oferta ya no está en marcha.");
  await db.update(ofertas).set({ estado: "cerrada", motivoRechazo: MOTIVO_RETIRADA }).where(eq(ofertas.id, id));
}

/**
 * "Rellenar desde el enlace" para quien sube una oferta. Como el del staff, pero sin datos internos:
 * de la repetida solo se dice si ya está en la bolsa (no su id ni si está pendiente o rechazada).
 */
export async function importarParaUsuario(db: Db, url: string, pedir?: Pedir): Promise<OfertaImportada> {
  const r = await importarOferta(db, url, pedir);
  const repetida = r.repetida && (r.repetida.estado === "publicada" || r.repetida.estado === "pendiente") ? r.repetida : null;
  return {
    ...r,
    repetida: repetida ? { id: "", titulo: repetida.titulo, empresa: repetida.empresa, estado: "publicada" } : null,
    ...(r.empresa && { empresa: { id: null, nombre: r.empresa.nombre, web: r.empresa.web } }),
  };
}
