import {
  DIAS_PARA_CONTAR_MEGUSTA,
  dominioDe,
  fotoElegida,
  mesDe,
  PORTFOLIOS_POR_PAGINA,
  type DatosPortfolio,
  type FiltrosPortfolios,
  type JuicioPortfolio,
  type PortfolioJuicioStaff,
  type PortfolioListado,
  type ReportePortfolio,
  type ResultadoPortfolios,
} from "@techtojob/shared";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { emblemas, megustaPortfolios, perfiles, portfolios, reportes, usuarios } from "../db/esquema";
import { fotosDe } from "./fotos";
import { leerPagina, meta, type Pedir } from "./importar";
import { inicioMes, perfilVisible, verificado } from "./proyectos";
import type { Visitante } from "./talento";

/**
 * Portfolios de la comunidad (uno por persona) y "Tu portfolio a juicio".
 * Mismas reglas que los proyectos: hace falta perfil de talento y estar verificado; los me gusta de cuentas
 * recién creadas no cuentan; se ven si el perfil de su autor se ve y el staff no lo ha ocultado.
 */

export class ErrorPortfolio extends Error {
  constructor(
    public readonly codigo: "no_existe" | "sin_perfil" | "sin_verificar" | "propio" | "motivo" | "fecha" | "video",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

// La tabla va escrita entera: en las consultas de una sola tabla, drizzle no la pone y la columna
// se confundiría con la de dentro de la subconsulta.
function megustaQueCuentan(desde?: SQL, hasta?: SQL) {
  return sql<number>`(
    select count(*) from ${megustaPortfolios} m join ${usuarios} u on u.id = m.usuario_id
    where m.portfolio_id = "portfolios"."usuario_id"
      and u.creado_en <= now() - make_interval(days => ${DIAS_PARA_CONTAR_MEGUSTA})
      ${desde ? sql`and m.creado_en >= ${desde}` : sql``}
      ${hasta ? sql`and m.creado_en < ${hasta}` : sql``}
  )`;
}

const columnas = {
  p: portfolios,
  autor: {
    alias: perfiles.alias,
    nombre: perfiles.nombre,
    titular: perfiles.titular,
    area: perfiles.area,
    foto: perfiles.foto,
    disponibilidad: perfiles.disponibilidad,
    visibilidad: perfiles.visibilidad,
  },
  megusta: megustaQueCuentan(),
};

type Fila = {
  p: typeof portfolios.$inferSelect;
  autor: {
    alias: string;
    nombre: string;
    titular: string;
    area: PortfolioListado["autor"]["area"];
    foto: "google" | "github" | "ninguna";
    disponibilidad: PortfolioListado["autor"]["disponibilidad"];
    visibilidad: string;
  };
  megusta: number;
  periodo?: number;
};

export function juicioDe(p: typeof portfolios.$inferSelect): JuicioPortfolio {
  if (p.juicioRevisadoEn) return { estado: "revisado", revisadoEn: p.juicioRevisadoEn.toISOString(), video: p.juicioVideo };
  if (p.juicioPedidoEn) return { estado: "pedido", pedidoEn: p.juicioPedidoEn.toISOString() };
  return { estado: "no" };
}

async function aListado(db: Db, filas: Fila[], visitante: Visitante): Promise<PortfolioListado[]> {
  if (!filas.length) return [];
  const ids = filas.map((f) => f.p.userId);
  const [fotos, mios] = await Promise.all([
    fotosDe(db, ids),
    visitante
      ? db.select({ id: megustaPortfolios.portfolioId }).from(megustaPortfolios).where(and(eq(megustaPortfolios.userId, visitante.id), inArray(megustaPortfolios.portfolioId, ids)))
      : Promise.resolve([]),
  ]);
  const gustados = new Set(mios.map((m) => m.id));
  return filas.map(({ p, autor, megusta, periodo }) => ({
    alias: autor.alias,
    url: p.url,
    dominio: dominioDe(p.url),
    descripcion: p.descripcion,
    imagen: p.imagen,
    autor: { nombre: autor.nombre, titular: autor.titular, area: autor.area, imagen: fotoElegida(autor.foto, fotos.get(p.userId)!), disponibilidad: autor.disponibilidad },
    megusta: Number(megusta),
    ...(periodo !== undefined && { megustaPeriodo: Number(periodo) }),
    meGusta: gustados.has(p.userId),
    oculto: p.oculto,
    esMio: visitante?.id === p.userId,
    juicio: juicioDe(p),
    creadoEn: p.creadaEn.toISOString(),
  }));
}

export async function listarPortfolios(db: Db, f: FiltrosPortfolios, visitante: Visitante, ahora = new Date()): Promise<ResultadoPortfolios> {
  const mes = f.mes ?? mesDe(ahora);
  const c: SQL[] = [eq(portfolios.oculto, false), perfilVisible(visitante)];
  if (f.areas.length) c.push(inArray(perfiles.area, f.areas));
  if (f.soloJuicio) c.push(isNotNull(portfolios.juicioRevisadoEn));
  if (f.q) {
    const patron = `%${f.q.replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    c.push(or(ilike(perfiles.nombre, patron), ilike(perfiles.titular, patron), ilike(portfolios.url, patron), ilike(portfolios.descripcion, patron))!);
  }
  const periodo =
    f.orden === "mes" ? megustaQueCuentan(inicioMes(mes), sql`${inicioMes(mes)} + interval '1 month'`) : f.orden === "tendencia" ? megustaQueCuentan(sql`now() - interval '7 days'`) : null;
  const orden =
    f.orden === "nuevos"
      ? [desc(portfolios.creadaEn), desc(portfolios.userId)]
      : [desc(periodo ?? columnas.megusta), desc(columnas.megusta), desc(portfolios.creadaEn), desc(portfolios.userId)];
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({ ...columnas, ...(periodo && { periodo }) })
      .from(portfolios)
      .innerJoin(perfiles, eq(perfiles.userId, portfolios.userId))
      .where(and(...c))
      .orderBy(...orden)
      .limit(PORTFOLIOS_POR_PAGINA + 1)
      .offset((f.pagina - 1) * PORTFOLIOS_POR_PAGINA),
    db.select({ total: count() }).from(portfolios).innerJoin(perfiles, eq(perfiles.userId, portfolios.userId)).where(and(...c)),
  ]);
  return {
    portfolios: await aListado(db, filas.slice(0, PORTFOLIOS_POR_PAGINA) as Fila[], visitante),
    total: Number(total),
    pagina: f.pagina,
    hayMas: filas.length > PORTFOLIOS_POR_PAGINA,
    mes,
  };
}

async function filaPorAlias(db: Db, alias: string): Promise<Fila | null> {
  const [f] = await db.select(columnas).from(portfolios).innerJoin(perfiles, eq(perfiles.userId, portfolios.userId)).where(eq(perfiles.alias, alias.toLowerCase())).limit(1);
  return (f as Fila | undefined) ?? null;
}

const puedeVer = (f: Fila, visitante: Visitante) =>
  visitante?.id === f.p.userId ||
  !!visitante?.esStaff ||
  (!f.p.oculto && (f.autor.visibilidad === "publico" || (f.autor.visibilidad === "registrados" && !!visitante)));

/** El portfolio de alguien (por su alias), si quien mira puede verlo. */
export async function obtenerPortfolio(db: Db, alias: string, visitante: Visitante): Promise<PortfolioListado> {
  const f = await filaPorAlias(db, alias);
  if (!f || !puedeVer(f, visitante)) throw new ErrorPortfolio("no_existe", "Este portfolio no existe.");
  return (await aListado(db, [f], visitante))[0]!;
}

/** Para su perfil (que ya se ha comprobado que se puede ver): su portfolio, o null. Oculto: solo para su autor. */
export async function portfolioDe(db: Db, userId: string, visitante: Visitante): Promise<PortfolioListado | null> {
  const [f] = await db.select(columnas).from(portfolios).innerJoin(perfiles, eq(perfiles.userId, portfolios.userId)).where(eq(portfolios.userId, userId)).limit(1);
  if (!f || (f.p.oculto && visitante?.id !== userId)) return null;
  return (await aListado(db, [f as Fila], visitante))[0]!;
}

/** Me gusta de los portfolios de cada persona (para sumarlos a los de sus proyectos). */
export async function megustaPortfoliosDe(db: Db, userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const filas = await db
    .select({ userId: portfolios.userId, n: columnas.megusta })
    .from(portfolios)
    .where(and(inArray(portfolios.userId, userIds), eq(portfolios.oculto, false)));
  return new Map(filas.map((f) => [f.userId, Number(f.n)]));
}

async function puedePoner(db: Db, userId: string) {
  const [perfil] = await db.select({ id: perfiles.userId }).from(perfiles).where(eq(perfiles.userId, userId)).limit(1);
  if (!perfil) throw new ErrorPortfolio("sin_perfil", "Para poner tu portfolio, crea antes tu perfil de talento.");
  const [{ ok }] = await db.select({ ok: verificado(userId) }).from(usuarios).where(eq(usuarios.id, userId));
  if (!ok) throw new ErrorPortfolio("sin_verificar", "Para poner tu portfolio tienes que estar verificado (Discord vinculado y en el servidor).");
}

/** La imagen que la web dice que la representa (og:image o twitter:image), si es https. */
export async function imagenDeLaWeb(url: string, pedir: Pedir = fetch): Promise<string | null> {
  let direccion: URL;
  try {
    direccion = new URL(url);
  } catch {
    return null;
  }
  const html = await leerPagina(direccion, pedir);
  if (!html) return null;
  const imagen = meta(html, "og:image") ?? meta(html, "og:image:url") ?? meta(html, "twitter:image");
  if (!imagen) return null;
  try {
    const u = new URL(imagen, direccion);
    return u.protocol === "https:" && u.toString().length <= 500 ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Mi portfolio (también si está oculto), o null. */
export async function miPortfolio(db: Db, userId: string): Promise<PortfolioListado | null> {
  return portfolioDe(db, userId, { id: userId, esStaff: false });
}

/**
 * Pone o cambia mi portfolio. Si cambia la dirección (o no tenía imagen), se vuelve a leer la imagen de la web.
 * "Tu portfolio a juicio": pedirlo apunta la fecha; quitarlo antes de que se revise lo cancela. Ya revisado, no cambia.
 */
export async function guardarPortfolio(db: Db, userId: string, d: DatosPortfolio, pedir: Pedir = fetch): Promise<void> {
  await puedePoner(db, userId);
  const [antes] = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
  const imagen = !antes || antes.url !== d.url || !antes.imagen ? await imagenDeLaWeb(d.url, pedir) : antes.imagen;
  const revisado = !!antes?.juicioRevisadoEn;
  const juicioPedidoEn = revisado ? antes!.juicioPedidoEn : d.quiereJuicio ? (antes?.juicioPedidoEn ?? new Date()) : null;
  const valores = { url: d.url, descripcion: d.descripcion, imagen, juicioPedidoEn, actualizadaEn: new Date() };
  await db
    .insert(portfolios)
    .values({ userId, ...valores })
    .onConflictDoUpdate({ target: portfolios.userId, set: valores });
}

export async function borrarPortfolio(db: Db, userId: string) {
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
}

export async function megustaPortfolio(db: Db, alias: string, visitante: NonNullable<Visitante>, dar: boolean) {
  const f = await filaPorAlias(db, alias);
  if (!f || !puedeVer(f, visitante)) throw new ErrorPortfolio("no_existe", "Este portfolio no existe.");
  if (f.p.userId === visitante.id) throw new ErrorPortfolio("propio", "No puedes dar me gusta a tu propio portfolio.");
  if (dar) await db.insert(megustaPortfolios).values({ portfolioId: f.p.userId, userId: visitante.id }).onConflictDoNothing();
  else await db.delete(megustaPortfolios).where(and(eq(megustaPortfolios.portfolioId, f.p.userId), eq(megustaPortfolios.userId, visitante.id)));
  const ahora = await obtenerPortfolio(db, alias, visitante);
  return { megusta: ahora.megusta, meGusta: ahora.meGusta };
}

/* ── Reportes ── */

export async function reportarPortfolio(db: Db, alias: string, visitante: NonNullable<Visitante>, motivo: unknown) {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 5 || texto.length > 500) throw new ErrorPortfolio("motivo", "Cuéntanos qué pasa (de 5 a 500 caracteres).");
  const f = await filaPorAlias(db, alias);
  if (!f || !puedeVer(f, visitante)) throw new ErrorPortfolio("no_existe", "Este portfolio no existe.");
  if (f.p.userId === visitante.id) throw new ErrorPortfolio("propio", "No puedes reportar tu propio portfolio.");
  await db.insert(reportes).values({ id: crypto.randomUUID(), portfolioId: f.p.userId, reportadoPor: visitante.id, motivo: texto }).onConflictDoNothing();
}

export async function listarReportesPortfolios(db: Db): Promise<ReportePortfolio[]> {
  const filas = await db
    .select({ r: reportes, url: portfolios.url, oculto: portfolios.oculto, alias: perfiles.alias, nombre: perfiles.nombre })
    .from(reportes)
    .innerJoin(portfolios, eq(portfolios.userId, reportes.portfolioId))
    .innerJoin(perfiles, eq(perfiles.userId, portfolios.userId))
    .where(eq(reportes.estado, "pendiente"))
    .orderBy(asc(reportes.creadoEn));
  return filas.map(({ r, url, oculto, alias, nombre }) => ({ id: r.id, portfolio: { alias, nombre, url, oculto }, motivo: r.motivo, creadoEn: r.creadoEn.toISOString() }));
}

export async function contarReportesPortfolios(db: Db): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(reportes).innerJoin(portfolios, eq(portfolios.userId, reportes.portfolioId)).where(eq(reportes.estado, "pendiente"));
  return Number(n);
}

export async function resolverReportePortfolio(db: Db, id: string, accion: "descartar" | "ocultar") {
  const [r] = await db.select().from(reportes).where(eq(reportes.id, id)).limit(1);
  if (!r?.portfolioId) throw new ErrorPortfolio("no_existe", "Ese reporte no existe.");
  if (accion === "ocultar") {
    await db.update(portfolios).set({ oculto: true }).where(eq(portfolios.userId, r.portfolioId));
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.portfolioId, r.portfolioId));
  } else {
    await db.update(reportes).set({ estado: "revisado" }).where(eq(reportes.id, id));
  }
}

/* ── Tu portfolio a juicio (staff) ── */

/** Los que lo han pedido y aún no se han revisado (el staff elige; van por fecha solo para tener un orden) y los ya revisados. */
export async function listarJuicio(db: Db): Promise<{ pendientes: PortfolioJuicioStaff[]; revisados: PortfolioJuicioStaff[] }> {
  const sel = { p: portfolios, alias: perfiles.alias, nombre: perfiles.nombre, megusta: columnas.megusta };
  const [pendientes, revisados] = await Promise.all([
    db
      .select(sel)
      .from(portfolios)
      .innerJoin(perfiles, eq(perfiles.userId, portfolios.userId))
      .where(and(isNotNull(portfolios.juicioPedidoEn), isNull(portfolios.juicioRevisadoEn), eq(portfolios.oculto, false)))
      .orderBy(asc(portfolios.juicioPedidoEn)),
    db
      .select(sel)
      .from(portfolios)
      .innerJoin(perfiles, eq(perfiles.userId, portfolios.userId))
      .where(isNotNull(portfolios.juicioRevisadoEn))
      .orderBy(desc(portfolios.juicioRevisadoEn))
      .limit(50),
  ]);
  const a = (f: (typeof pendientes)[number]): PortfolioJuicioStaff => ({
    alias: f.alias,
    nombre: f.nombre,
    url: f.p.url,
    descripcion: f.p.descripcion,
    juicio: juicioDe(f.p),
    megusta: Number(f.megusta),
  });
  return { pendientes: pendientes.map(a), revisados: revisados.map(a) };
}

/**
 * Marcar como revisado en "Tu portfolio a juicio" (o cambiar la fecha o el vídeo): da el emblema "juicio".
 * `fecha`: "2026-10-23" (el día del directo). `video`: el enlace, o vacío si aún no está subido.
 */
export async function marcarJuicio(db: Db, alias: string, staffId: string, fecha: unknown, video: string | null) {
  const f = await filaPorAlias(db, alias);
  if (!f) throw new ErrorPortfolio("no_existe", "Este portfolio no existe.");
  const dia = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T12:00:00Z`) : null;
  if (!dia || Number.isNaN(dia.getTime()) || dia.getTime() > Date.now() + 86_400_000) throw new ErrorPortfolio("fecha", "Pon el día del directo (hoy o antes).");
  await db
    .update(portfolios)
    .set({ juicioRevisadoEn: dia, juicioVideo: video, juicioRevisadoPor: staffId, juicioPedidoEn: f.p.juicioPedidoEn ?? dia })
    .where(eq(portfolios.userId, f.p.userId));
  await db
    .insert(emblemas)
    .values({ id: `juicio-${f.p.userId}`, userId: f.p.userId, tipo: "juicio", otorgadoEn: dia })
    .onConflictDoUpdate({ target: emblemas.id, set: { otorgadoEn: dia } });
}
