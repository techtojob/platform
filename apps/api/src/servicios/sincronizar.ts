import {
  adivinarPuesto,
  detectarIdiomasPedidos,
  detectarIdiomaTexto,
  detectarTecnologias,
  LIMITES,
  MOTIVO_DESAPARECIDA,
  MOTIVO_SIN_REVISAR,
  REGIONES,
  type Remoto,
  slugOferta,
} from "@techtojob/shared";
import { and, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertaIdiomas, ofertas } from "../db/esquema";
import { ErrorAts, filtrar, leerAts, type OfertaFiltrada } from "./ats";
import { buscarRepetida, type Pedir } from "./importar";
import { nuevoId } from "./ofertas-staff";

/**
 * Ofertas automáticas: cada día se leen las páginas de empleo de las empresas que tienen
 * "sincronizar" activado (ver scripts/sincronizar.ts y .github/workflows/ofertas.yml).
 *
 * - Una oferta nueva (técnica, 100 % remota, en español o inglés) entra PENDIENTE: el staff la revisa,
 *   escribe un resumen con sus palabras y la publica. El texto original se guarda solo para el staff.
 * - Como mucho entran 40 ofertas nuevas al día (CUPO_DIARIO): 20 reservadas para cada idioma y,
 *   lo que uno no use, para el otro. Repartidas entre empresas.
 *   Las que no caben se quedan para el día siguiente (siguen en la página de la empresa).
 * - Una que ya teníamos: se apunta que sigue ahí (`vistaEn`).
 * - Una que ya no está (dos lecturas seguidas): se cierra.
 * - Si la página de empleo falla, no se toca nada. Con 3 fallos seguidos se deja de leer.
 * - Una empresa que lleva 60 días sin ninguna oferta que nos sirva se lee solo los lunes.
 */

/**
 * Ofertas nuevas al día: 40, con 20 reservadas para las escritas en español y 20 para las escritas
 * en inglés. Lo que un idioma no use, lo usa el otro. Las de otros idiomas no entran.
 */
export const CUPO_DIARIO = { total: 40, reservas: { es: 20, en: 20 } } as const;
export type IdiomaCupo = keyof typeof CUPO_DIARIO.reservas;

export type ResultadoEmpresa = {
  empresa: string;
  nuevas: number;
  /** Nuevas que no han cabido en el cupo de hoy: entrarán otro día. */
  enEspera: number;
  vistas: number;
  cerradas: number;
  error: string | null;
};

const HORA = 3_600_000;
const DIA = 24 * HORA;
/**
 * Una oferta que falta se cierra cuando lleva más de 36 horas sin verse, es decir,
 * cuando falta en dos lecturas diarias seguidas (por si un día la página falla a medias).
 */
const SIN_VERSE_MS = 36 * HORA;
/** Fallos seguidos antes de dejar de leer una empresa. */
const MAXIMO_ERRORES = 3;
/** Sin ofertas útiles en este tiempo, se lee solo los lunes. */
const SIN_OFERTAS_MS = 60 * DIA;

type Empresa = typeof empresas.$inferSelect;
type Candidata = { empresa: Empresa; oferta: OfertaFiltrada; idioma: IdiomaCupo; resultado: ResultadoEmpresa };

export function idiomaDe(o: OfertaFiltrada): IdiomaCupo | null {
  const idioma = detectarIdiomaTexto(o.descripcion) ?? detectarIdiomaTexto(`${o.titulo} ${o.descripcion}`) ?? "en";
  return idioma === "es" || idioma === "en" ? idioma : null;
}

/** ¿Toca leerla hoy? Las que llevan mucho sin ofertas útiles, solo los lunes. */
export function tocaLeer(empresa: Empresa, ahora: Date): boolean {
  const desde = (empresa.ultimaOfertaUtil ?? empresa.creadaEn).getTime();
  return ahora.getTime() - desde < SIN_OFERTAS_MS || ahora.getUTCDay() === 1;
}

/** Lee una empresa, pone al día lo que ya teníamos y devuelve las nuevas candidatas. */
async function leerEmpresa(db: Db, empresa: Empresa, pedir: Pedir, ahora: Date) {
  const resultado: ResultadoEmpresa = { empresa: empresa.nombre, nuevas: 0, enEspera: 0, vistas: 0, cerradas: 0, error: null };
  const candidatas: Candidata[] = [];
  if (!empresa.ats || !empresa.atsId || empresa.bloqueada) return { resultado, candidatas };
  const fuente = empresa.ats;

  let leidas: OfertaFiltrada[];
  try {
    leidas = filtrar(await leerAts({ ats: fuente, atsId: empresa.atsId, atsRegion: empresa.atsRegion }, pedir));
  } catch (e) {
    resultado.error = e instanceof ErrorAts ? e.message : "Error inesperado al leer la página de empleo.";
    const errores = empresa.erroresSeguidos + 1;
    const parar = errores >= MAXIMO_ERRORES;
    await db
      .update(empresas)
      .set({
        ultimaLectura: ahora,
        erroresSeguidos: errores,
        ultimoError: parar ? `${resultado.error} (${errores} veces seguidas: se ha dejado de leer)` : resultado.error,
        ...(parar && { sincronizar: false }),
      })
      .where(eq(empresas.id, empresa.id));
    return { resultado, candidatas };
  }
  // Solo cuentan las que están en español o inglés.
  const utiles = leidas.flatMap((o) => {
    const idioma = idiomaDe(o);
    return idioma ? [{ oferta: o, idioma }] : [];
  });

  const existentes = await db
    .select({ id: ofertas.id, idExterno: ofertas.idExterno, estado: ofertas.estado, vistaEn: ofertas.vistaEn })
    .from(ofertas)
    .where(and(eq(ofertas.empresaId, empresa.id), eq(ofertas.fuenteAts, fuente), isNotNull(ofertas.idExterno)));
  const porId = new Map(existentes.map((o) => [o.idExterno!, o]));

  // Las que siguen ahí. Las rechazadas también cuentan: así no vuelven a entrar.
  const vistas = utiles.filter(({ oferta }) => porId.has(oferta.idExterno));
  if (vistas.length) {
    await db
      .update(ofertas)
      .set({ vistaEn: ahora })
      .where(inArray(ofertas.id, vistas.map(({ oferta }) => porId.get(oferta.idExterno)!.id)));
  }
  resultado.vistas = vistas.length;

  // Las nuevas: candidatas para el cupo del día. Si el staff ya la metió a mano con el mismo enlace, no.
  for (const { oferta, idioma } of utiles) {
    if (porId.has(oferta.idExterno)) continue;
    if (await buscarRepetida(db, oferta.url)) continue;
    candidatas.push({ empresa, oferta, idioma, resultado });
  }

  // Las que ya no están: se cierran (las pendientes y las publicadas).
  const leidasIds = new Set(utiles.map(({ oferta }) => oferta.idExterno));
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
      .set({ estado: "cerrada", motivoRechazo: MOTIVO_DESAPARECIDA })
      .where(inArray(ofertas.id, desaparecidas.map((o) => o.id)));
  }
  resultado.cerradas = desaparecidas.length;

  await db
    .update(empresas)
    .set({
      ultimaLectura: ahora,
      ultimoError: null,
      erroresSeguidos: 0,
      ...(utiles.length && { ultimaOfertaUtil: ahora }),
    })
    .where(eq(empresas.id, empresa.id));
  return { resultado, candidatas };
}

export type Cupos = { total: number; reservas: Record<IdiomaCupo, number> };

/** España y Latinoamérica: la mayor parte de la comunidad. */
const NUESTRO_PUBLICO = new Set(["ES", ...REGIONES.latam]);

/**
 * Qué ofertas entran antes en el cupo:
 * 0. las que se pueden hacer desde España o Latinoamérica (o desde cualquier país);
 * 1. las que aún no dicen desde dónde (las rellena el staff);
 * 2. las que son solo para otros sitios (EE. UU., Canadá, Reino Unido…): con lo que sobre.
 */
export function prioridad(remoto: Remoto | null | undefined): 0 | 1 | 2 {
  if (!remoto) return 1;
  if (remoto.mundo || remoto.paises.some((p) => NUESTRO_PUBLICO.has(p))) return 0;
  return 2;
}

/**
 * Elige las que entran hoy.
 *
 * 1. Cada idioma tiene su reserva (20 en español, 20 en inglés).
 * 2. Lo que un idioma no use, lo puede usar el otro, hasta el total (40).
 *
 * Dentro de cada idioma, una de cada empresa por turnos (para que una empresa grande
 * no se coma el cupo) y, dentro de cada empresa, las más nuevas primero.
 */
export function elegir<
  T extends { empresa: { id: string }; oferta: { publicadaEn: Date | null; remoto?: Remoto | null }; idioma: IdiomaCupo },
>(candidatas: T[], cupos: Cupos): T[] {
  const idiomas = Object.keys(cupos.reservas) as IdiomaCupo[];
  // Una cola por idioma, ya en el orden en que entrarían: primero las que se pueden hacer desde España
  // o Latinoamérica; dentro de eso, por turnos entre empresas y las más nuevas primero.
  const colas = new Map<IdiomaCupo, T[]>();
  for (const idioma of idiomas) {
    const cola: T[] = [];
    for (const nivel of [0, 1, 2]) {
      const porEmpresa = new Map<string, T[]>();
      for (const c of candidatas.filter((c) => c.idioma === idioma && prioridad(c.oferta.remoto) === nivel)) {
        porEmpresa.set(c.empresa.id, [...(porEmpresa.get(c.empresa.id) ?? []), c]);
      }
      const listas = [...porEmpresa.values()].map((l) =>
        l.sort((a, b) => (b.oferta.publicadaEn?.getTime() ?? 0) - (a.oferta.publicadaEn?.getTime() ?? 0)),
      );
      while (listas.some((l) => l.length)) for (const l of listas) if (l.length) cola.push(l.shift()!);
    }
    colas.set(idioma, cola);
  }

  const elegidas: T[] = [];
  let total = Math.max(0, cupos.total);
  // 1. Las reservas de cada idioma.
  for (const idioma of idiomas) {
    const n = Math.min(Math.max(0, cupos.reservas[idioma]), total);
    const tomadas = colas.get(idioma)!.splice(0, n);
    elegidas.push(...tomadas);
    total -= tomadas.length;
  }
  // 2. Lo que sobre, para quien tenga más: un idioma y otro por turnos.
  while (total > 0 && idiomas.some((i) => colas.get(i)!.length)) {
    for (const idioma of idiomas) {
      const siguiente = colas.get(idioma)!.shift();
      if (!siguiente) continue;
      elegidas.push(siguiente);
      if (--total === 0) break;
    }
  }
  return elegidas;
}

async function crearOfertaAutomatica(db: Db, { empresa, oferta: o, idioma }: Candidata, ahora: Date) {
  const puesto = adivinarPuesto(o.titulo);
  const pedidos = detectarIdiomasPedidos(o.descripcion).slice(0, LIMITES.idiomas.max);
  const titulo = o.titulo.slice(0, LIMITES.titulo.max);
  const id = nuevoId();
  await db.insert(ofertas).values({
    id,
    slug: slugOferta(titulo, empresa.slug),
    empresaId: empresa.id,
    titulo,
    // Lo público (resumen) lo escribe el staff. La descripción solo si la empresa lo autoriza.
    resumen: null,
    descripcion: null,
    descripcionOriginal: o.descripcion.slice(0, 50_000) || null,
    idioma,
    urlOriginal: o.url,
    area: puesto.area ?? "desarrollo",
    seniority: puesto.seniority ?? "mid",
    modalidad: "remoto",
    tecnologias: detectarTecnologias(`${o.titulo}\n${o.descripcion}`).slice(0, LIMITES.tecnologias.max),
    remotoMundo: o.remoto?.mundo ?? false,
    remotoPaises: o.remoto?.paises ?? [],
    origen: "automatica",
    fuenteAts: empresa.ats,
    idExterno: o.idExterno,
    vistaEn: ahora,
    estado: "pendiente",
    creadaEn: ahora,
  });
  // Si no pide ningún idioma, al menos el de la oferta.
  const idiomas = pedidos.length ? pedidos : [{ idioma, nivel: null }];
  await db.insert(ofertaIdiomas).values(idiomas.map((i) => ({ ofertaId: id, idioma: i.idioma, nivel: i.nivel })));
}

/**
 * Cuánto queda del cupo: se descuentan las automáticas creadas hoy (día UTC). Así, si un día
 * GitHub lanza la tarea un poco más tarde, al siguiente no se queda sin cupo.
 */
async function cuposRestantes(db: Db, ahora: Date, cupos: Cupos): Promise<Cupos> {
  const filas = await db
    .select({ idioma: ofertas.idioma, n: sql<number>`count(*)` })
    .from(ofertas)
    .where(and(eq(ofertas.origen, "automatica"), gte(ofertas.creadaEn, new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())))))
    .groupBy(ofertas.idioma);
  const hechas = new Map(filas.map((f) => [f.idioma, Number(f.n)]));
  const es = hechas.get("es") ?? 0;
  const en = hechas.get("en") ?? 0;
  return { total: cupos.total - es - en, reservas: { es: cupos.reservas.es - es, en: cupos.reservas.en - en } };
}

/** Cuántas empresas se leen a la vez. */
const A_LA_VEZ = 6;

/** Como Promise.all, pero con `n` a la vez como mucho. Devuelve los resultados en el mismo orden. */
export async function enParalelo<T, R>(lista: T[], n: number, hacer: (x: T) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(lista.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < lista.length) {
      const i = siguiente++;
      resultados[i] = await hacer(lista[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, trabajador));
  return resultados;
}

/** Días que una automática puede estar pendiente sin que nadie la revise: después se descarta sola. */
export const DIAS_SIN_REVISAR = 14;

/**
 * Descarta las automáticas que llevan más de 14 días pendientes: así la cola del staff nunca se
 * desborda. Quedan como rechazadas (con su motivo), así que no vuelven a entrar. Devuelve cuántas.
 */
export async function descartarPendientesViejas(db: Db, ahora = new Date()): Promise<number> {
  const descartadas = await db
    .update(ofertas)
    .set({ estado: "rechazada", motivoRechazo: MOTIVO_SIN_REVISAR, revisadaEn: ahora })
    .where(
      and(
        eq(ofertas.estado, "pendiente"),
        eq(ofertas.origen, "automatica"),
        lt(ofertas.creadaEn, new Date(ahora.getTime() - DIAS_SIN_REVISAR * DIA)),
      ),
    )
    .returning({ id: ofertas.id });
  return descartadas.length;
}

/** Lee estas empresas y crea las nuevas que quepan en el cupo. */
export async function sincronizarLista(
  db: Db,
  lista: Empresa[],
  pedir: Pedir = fetch,
  ahora = new Date(),
  cupos: Cupos = CUPO_DIARIO,
): Promise<ResultadoEmpresa[]> {
  // Varias empresas a la vez (pocas: casi todas están en el mismo puñado de servidores), en el mismo orden.
  const leidas = await enParalelo(lista, A_LA_VEZ, (empresa) => leerEmpresa(db, empresa, pedir, ahora));
  const resultados = leidas.map((l) => l.resultado);
  const candidatas = leidas.flatMap((l) => l.candidatas);
  const elegidas = new Set(elegir(candidatas, await cuposRestantes(db, ahora, cupos)));
  for (const c of candidatas) {
    if (elegidas.has(c)) {
      await crearOfertaAutomatica(db, c, ahora);
      c.resultado.nuevas++;
    } else {
      c.resultado.enEspera++;
    }
  }
  return resultados;
}

/** Una sola empresa (por ejemplo, al añadirla). */
export async function sincronizarEmpresa(db: Db, empresa: Empresa, pedir: Pedir = fetch, ahora = new Date(), cupos: Cupos = CUPO_DIARIO) {
  return (await sincronizarLista(db, [empresa], pedir, ahora, cupos))[0]!;
}

/** Todas las empresas con "sincronizar" activado a las que les toca hoy. */
export async function sincronizarTodas(db: Db, pedir: Pedir = fetch, ahora = new Date(), cupos: Cupos = CUPO_DIARIO) {
  const lista = await db
    .select()
    .from(empresas)
    .where(and(eq(empresas.sincronizar, true), eq(empresas.bloqueada, false), isNotNull(empresas.ats)));
  return sincronizarLista(db, lista.filter((e) => tocaLeer(e, ahora)), pedir, ahora, cupos);
}
