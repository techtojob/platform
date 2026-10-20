import {
  ATAJOS_POR_ESTADO,
  MOTIVO_DESAPARECIDA,
  POR_PAGINA_STAFF,
  type AtajoStaff,
  type FiltrosStaff,
  type ListaStaff,
  type SiguienteStaff,
} from "@techtojob/shared";
import { and, arrayContains, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, ne, not, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../db/esquema";
import { aStaff, columnasEmpresa, ErrorStaff } from "./ofertas-staff";

/**
 * La lista del panel de staff: pestañas por estado, atajos ("sin resumen", "caducan esta semana"…),
 * filtros, orden y páginas de 50. Y "la siguiente": para revisar en cadena sin volver a la lista.
 */

const DIA = 86_400_000;
const inicioDeHoy = (ahora: Date) => new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));

const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** La fecha que cuenta en cada pestaña: cuándo entró (pendientes), cuándo se publicó, o la última vez que se tocó. */
function fechaDe(estado: FiltrosStaff["estado"]) {
  if (estado === "pendiente") return ofertas.creadaEn;
  if (estado === "publicada") return ofertas.publicadaEn;
  return ofertas.actualizadaEn;
}

function condicionAtajo(atajo: AtajoStaff, ahora: Date): SQL {
  switch (atajo) {
    case "sin_resumen":
      // Automáticas sin autorización y sin un resumen nuestro: no se pueden publicar todavía.
      return and(eq(ofertas.origen, "automatica"), eq(ofertas.autorizada, false), or(isNull(ofertas.resumen), eq(ofertas.resumen, "")))!;
    case "sin_zona":
      return and(eq(ofertas.modalidad, "remoto"), eq(ofertas.remotoMundo, false), sql`cardinality(${ofertas.remotoPaises}) = 0`)!;
    case "hoy":
      return gte(ofertas.creadaEn, inicioDeHoy(ahora));
    case "caducan":
      return and(gte(ofertas.caducaEn, ahora), lte(ofertas.caducaEn, new Date(ahora.getTime() + 7 * DIA)))!;
    case "desaparecidas":
      return and(eq(ofertas.origen, "automatica"), eq(ofertas.motivoRechazo, MOTIVO_DESAPARECIDA))!;
  }
}

/** Todas las condiciones de los filtros (la pestaña incluida). */
export function condicionesStaff(db: Db, f: FiltrosStaff, ahora = new Date()): SQL[] {
  const c: SQL[] = [eq(ofertas.estado, f.estado)];
  if (f.q) {
    const patron = `%${escaparLike(f.q)}%`;
    c.push(
      or(
        ilike(ofertas.titulo, patron),
        inArray(ofertas.empresaId, db.select({ id: empresas.id }).from(empresas).where(ilike(empresas.nombre, patron))),
      )!,
    );
  }
  if (f.idioma === "otros") c.push(notInArray(ofertas.idioma, ["es", "en"]));
  else if (f.idioma) c.push(eq(ofertas.idioma, f.idioma));
  if (f.origen) c.push(eq(ofertas.origen, f.origen));
  if (f.fuente) c.push(eq(ofertas.fuenteAts, f.fuente));
  if (f.desde) {
    c.push(
      or(
        and(eq(ofertas.modalidad, "remoto"), or(eq(ofertas.remotoMundo, true), arrayContains(ofertas.remotoPaises, [f.desde]))),
        and(ne(ofertas.modalidad, "remoto"), eq(ofertas.pais, f.desde)),
      )!,
    );
  }
  if (f.areas.length) c.push(inArray(ofertas.area, f.areas));
  if (f.seniority.length) c.push(inArray(ofertas.seniority, f.seniority));
  if (f.fecha) {
    const desde = f.fecha === "hoy" ? inicioDeHoy(ahora) : new Date(ahora.getTime() - Number(f.fecha) * DIA);
    c.push(gte(fechaDe(f.estado), desde));
  }
  if (f.atajo) c.push(condicionAtajo(f.atajo, ahora));
  return c;
}

function ordenStaff(f: FiltrosStaff) {
  const fecha = fechaDe(f.estado);
  if (f.orden === "caducan") return [sql`${ofertas.caducaEn} asc nulls last`, asc(ofertas.id)];
  if (f.orden === "antiguas") return [asc(fecha), asc(ofertas.id)];
  return [sql`${fecha} desc nulls last`, desc(ofertas.id)];
}

export async function listarStaff(db: Db, f: FiltrosStaff, ahora = new Date()): Promise<Omit<ListaStaff, "reportes">> {
  const condiciones = condicionesStaff(db, f, ahora);
  const [filas, [{ total }], porEstado, atajos] = await Promise.all([
    db
      .select({ oferta: ofertas, empresa: columnasEmpresa })
      .from(ofertas)
      .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
      .where(and(...condiciones))
      .orderBy(...ordenStaff(f))
      .limit(POR_PAGINA_STAFF)
      .offset((f.pagina - 1) * POR_PAGINA_STAFF),
    db.select({ total: count() }).from(ofertas).where(and(...condiciones)),
    db.select({ estado: ofertas.estado, total: count() }).from(ofertas).groupBy(ofertas.estado),
    // Cada atajo de esta pestaña, contado sin los demás filtros: "Sin resumen 12".
    Promise.all(
      ATAJOS_POR_ESTADO[f.estado].map(async (atajo) => {
        const [{ n }] = await db
          .select({ n: count() })
          .from(ofertas)
          .where(and(eq(ofertas.estado, f.estado), condicionAtajo(atajo, ahora)));
        return [atajo, Number(n)] as const;
      }),
    ),
  ]);
  const ids = filas.map((x) => x.oferta.id);
  const idiomas = ids.length ? await db.select().from(ofertaIdiomas).where(inArray(ofertaIdiomas.ofertaId, ids)) : [];
  return {
    estado: f.estado,
    ofertas: filas.map((x) => aStaff(x.oferta, x.empresa, idiomas)),
    total: Number(total),
    cuentas: Object.fromEntries(porEstado.map((x) => [x.estado, Number(x.total)])),
    atajos: Object.fromEntries(atajos),
  };
}

/**
 * La siguiente oferta con los mismos filtros y orden, sin contar la que se está viendo
 * ni las que se han saltado. Para revisar en cadena.
 */
export async function siguienteStaff(db: Db, f: FiltrosStaff, actual: string | null, saltadas: string[], ahora = new Date()): Promise<SiguienteStaff> {
  const fuera = [...new Set([...(actual ? [actual] : []), ...saltadas])].slice(0, 200);
  const condiciones = [...condicionesStaff(db, f, ahora), ...(fuera.length ? [not(inArray(ofertas.id, fuera))] : [])];
  const [[primera], [{ quedan }]] = await Promise.all([
    db.select({ id: ofertas.id }).from(ofertas).where(and(...condiciones)).orderBy(...ordenStaff(f)).limit(1),
    db.select({ quedan: count() }).from(ofertas).where(and(...condiciones)),
  ]);
  return { id: primera?.id ?? null, quedan: Number(quedan) };
}

/** Rechazar varias pendientes de golpe, con el mismo motivo. Devuelve cuántas. */
export async function rechazarVarias(db: Db, ids: unknown, motivo: unknown, staffId: string): Promise<number> {
  const lista = Array.isArray(ids) ? [...new Set(ids.filter((i): i is string => typeof i === "string"))].slice(0, 200) : [];
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 3 || texto.length > 300) throw new ErrorStaff("motivo", "Escribe por qué se rechazan (3–300 caracteres).");
  if (!lista.length) return 0;
  const hechas = await db
    .update(ofertas)
    .set({ estado: "rechazada", motivoRechazo: texto, revisadaPor: staffId, revisadaEn: new Date() })
    .where(and(inArray(ofertas.id, lista), eq(ofertas.estado, "pendiente")))
    .returning({ id: ofertas.id });
  return hechas.length;
}
