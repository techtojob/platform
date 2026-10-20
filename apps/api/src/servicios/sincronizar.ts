import {
  adivinarPuesto,
  detectarIdiomasPedidos,
  detectarIdiomaTexto,
  detectarTecnologias,
  LIMITES,
  slugOferta,
} from "@techtojob/shared";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../db/esquema";
import { ErrorAts, filtrar, leerAts, type OfertaFiltrada } from "./ats";
import { buscarRepetida, type Pedir } from "./importar";
import { nuevoId } from "./ofertas-staff";

/**
 * Ofertas automáticas: cada día se leen las páginas de empleo de las empresas que tienen
 * "sincronizar" activado (ver scripts/sincronizar.ts y .github/workflows/ofertas.yml).
 *
 * - Una oferta nueva (técnica y 100 % remota) entra PENDIENTE: el staff la revisa, escribe
 *   un resumen con sus palabras y la publica. El texto original se guarda solo para el staff.
 * - Una que ya teníamos: se apunta que sigue ahí (`vistaEn`).
 * - Una que ya no está (dos lecturas seguidas): se cierra.
 * - Si la página de empleo falla, no se toca nada: solo se apunta el error en la empresa.
 */

export type ResultadoEmpresa = {
  empresa: string;
  nuevas: number;
  vistas: number;
  cerradas: number;
  error: string | null;
};

/**
 * Una oferta que falta se cierra cuando lleva más de 36 horas sin verse, es decir,
 * cuando falta en dos lecturas diarias seguidas (por si un día la página falla a medias).
 */
const SIN_VERSE_MS = 36 * 3_600_000;

function datosNuevos(o: OfertaFiltrada) {
  const texto = `${o.titulo}\n${o.descripcion}`;
  const puesto = adivinarPuesto(o.titulo);
  const idioma = detectarIdiomaTexto(o.descripcion) ?? "en";
  const pedidos = detectarIdiomasPedidos(o.descripcion).slice(0, LIMITES.idiomas.max);
  return {
    titulo: o.titulo.slice(0, LIMITES.titulo.max),
    idioma,
    area: puesto.area ?? "desarrollo",
    seniority: puesto.seniority ?? "mid",
    tecnologias: detectarTecnologias(texto).slice(0, LIMITES.tecnologias.max),
    remotoDesde: o.remotoDesde,
    // Si no pide ningún idioma, al menos el de la oferta.
    idiomas: pedidos.length ? pedidos : [{ idioma, nivel: null }],
  };
}

/** Lee la página de empleo de una empresa y pone al día sus ofertas automáticas. */
export async function sincronizarEmpresa(
  db: Db,
  empresa: typeof empresas.$inferSelect,
  pedir: Pedir = fetch,
  ahora = new Date(),
): Promise<ResultadoEmpresa> {
  const resultado: ResultadoEmpresa = { empresa: empresa.nombre, nuevas: 0, vistas: 0, cerradas: 0, error: null };
  if (!empresa.ats || !empresa.atsId || empresa.bloqueada) return resultado;
  const fuente = empresa.ats;

  let leidas: OfertaFiltrada[];
  try {
    leidas = filtrar(await leerAts({ ats: fuente, atsId: empresa.atsId, atsRegion: empresa.atsRegion }, pedir));
  } catch (e) {
    resultado.error = e instanceof ErrorAts ? e.message : "Error inesperado al leer la página de empleo.";
    await db.update(empresas).set({ ultimaLectura: ahora, ultimoError: resultado.error }).where(eq(empresas.id, empresa.id));
    return resultado;
  }

  const existentes = await db
    .select({ id: ofertas.id, idExterno: ofertas.idExterno, estado: ofertas.estado, vistaEn: ofertas.vistaEn })
    .from(ofertas)
    .where(and(eq(ofertas.empresaId, empresa.id), eq(ofertas.fuenteAts, fuente), isNotNull(ofertas.idExterno)));
  const porId = new Map(existentes.map((o) => [o.idExterno!, o]));

  // Las que siguen ahí. Las rechazadas también cuentan: así no vuelven a entrar.
  const vistas = leidas.filter((o) => porId.has(o.idExterno));
  if (vistas.length) {
    await db
      .update(ofertas)
      .set({ vistaEn: ahora })
      .where(inArray(ofertas.id, vistas.map((o) => porId.get(o.idExterno)!.id)));
  }
  resultado.vistas = vistas.length;

  // Las nuevas, una a una.
  for (const o of leidas) {
    if (porId.has(o.idExterno)) continue;
    // Si el staff ya la metió a mano con el mismo enlace, no se duplica.
    if (await buscarRepetida(db, o.url)) continue;
    const d = datosNuevos(o);
    const id = nuevoId();
    await db.insert(ofertas).values({
      id,
      slug: slugOferta(d.titulo, empresa.slug),
      empresaId: empresa.id,
      titulo: d.titulo,
      // Lo público (resumen) lo escribe el staff. La descripción solo si la empresa lo autoriza.
      resumen: null,
      descripcion: null,
      descripcionOriginal: o.descripcion.slice(0, 50_000) || null,
      idioma: d.idioma,
      urlOriginal: o.url,
      area: d.area,
      seniority: d.seniority,
      modalidad: "remoto",
      tecnologias: d.tecnologias,
      remotoDesde: d.remotoDesde,
      origen: "automatica",
      fuenteAts: fuente,
      idExterno: o.idExterno,
      vistaEn: ahora,
      estado: "pendiente",
    });
    await db.insert(ofertaIdiomas).values(d.idiomas.map((i) => ({ ofertaId: id, idioma: i.idioma, nivel: i.nivel })));
    resultado.nuevas++;
  }

  // Las que ya no están: se cierran (las pendientes y las publicadas).
  const leidasIds = new Set(leidas.map((o) => o.idExterno));
  const limite = new Date(ahora.getTime() - SIN_VERSE_MS);
  const desaparecidas = existentes.filter(
    (o) =>
      !leidasIds.has(o.idExterno!) &&
      (o.estado === "pendiente" || o.estado === "publicada") &&
      (!o.vistaEn || o.vistaEn < limite),
  );
  if (desaparecidas.length) {
    await db
      .update(ofertas)
      .set({ estado: "cerrada" })
      .where(inArray(ofertas.id, desaparecidas.map((o) => o.id)));
  }
  resultado.cerradas = desaparecidas.length;

  await db.update(empresas).set({ ultimaLectura: ahora, ultimoError: null }).where(eq(empresas.id, empresa.id));
  return resultado;
}

/** Todas las empresas con "sincronizar" activado, una detrás de otra (para no cargar a nadie). */
export async function sincronizarTodas(db: Db, pedir: Pedir = fetch, ahora = new Date()): Promise<ResultadoEmpresa[]> {
  const lista = await db
    .select()
    .from(empresas)
    .where(and(eq(empresas.sincronizar, true), eq(empresas.bloqueada, false), isNotNull(empresas.ats)));
  const resultados: ResultadoEmpresa[] = [];
  for (const empresa of lista) resultados.push(await sincronizarEmpresa(db, empresa, pedir, ahora));
  return resultados;
}
