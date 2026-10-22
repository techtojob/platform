import { fotosDe } from "./fotos";
import { megustaPortfoliosDe, portfolioDe } from "./portfolios";
import { megustaDe, proyectosDe } from "./proyectos";
import {
  fotoElegida,
  type FotosCuenta,
  aliasDesde,
  buscarTecnologia,
  type Area,
  type DatosPerfil,
  type Disponibilidad,
  type Emblema,
  type EntradaMapa,
  type MiPerfil,
  type Modalidad,
  type PerfilListado,
  type PerfilPublico,
  type ReportePerfil,
  type ResultadoTalento,
  type Seniority,
} from "@techtojob/shared";
import { and, arrayOverlaps, asc, count, desc, eq, exists, gt, ilike, inArray, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { emblemas, estadoDiscord, perfiles, portfolios, proyectos, reportesPerfil, usuarios, type Perfil } from "../db/esquema";

/**
 * Talento: perfiles de la comunidad. Quién ve qué:
 * - "publico": cualquiera;
 * - "registrados": quien ha iniciado sesión (por defecto);
 * - "oculto": solo su dueño (y el staff, para revisar reportes).
 * Nunca se enseña el email.
 */

/** Los N primeros usuarios registrados tienen el emblema de Miembro fundador. */
export const FUNDADORES = 1000;
export const LIMITE_TALENTO = 24;

export class ErrorTalento extends Error {
  constructor(
    public readonly codigo: "alias_ocupado" | "no_existe" | "solo_registrados" | "motivo" | "propio" | "reporte" | "sin_verificar",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export type Visitante = { id: string; esStaff?: boolean } | null;

export type FiltrosTalento = {
  q?: string;
  disponibilidad?: Disponibilidad[];
  areas?: Area[];
  seniority?: Seniority[];
  modalidades?: Modalidad[];
  tecnologias?: string[];
  pais?: string;
  verificados?: boolean;
  despues?: string | null;
};

const codificar = (fecha: Date, id: string) => btoa(`${fecha.toISOString()}|${id}`).replace(/=+$/, "");
function leer(cursor: string): { fecha: Date; id: string } | null {
  try {
    const [f, id] = atob(cursor).split("|");
    const fecha = new Date(f!);
    return id && !Number.isNaN(fecha.getTime()) ? { fecha, id } : null;
  } catch {
    return null;
  }
}
const escaparLike = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

const verificadoSql = (userId: SQL | typeof perfiles.userId) =>
  exists(
    // Discord vinculado y dentro del servidor.
    sql`(select 1 from ${estadoDiscord} where ${estadoDiscord.userId} = ${userId} and ${estadoDiscord.enServidor} = true)`,
  );

/** Qué perfiles puede ver quien mira (en el buscador nunca salen los ocultos). */
const visiblesPara = (visitante: Visitante): SQL =>
  visitante ? inArray(perfiles.visibilidad, ["publico", "registrados"]) : eq(perfiles.visibilidad, "publico");

function condiciones(f: FiltrosTalento, sinPais = false): SQL[] {
  const c: SQL[] = [];
  if (f.q?.trim()) {
    const patron = `%${escaparLike(f.q.trim())}%`;
    const tec = buscarTecnologia(f.q);
    c.push(
      or(
        ilike(perfiles.nombre, patron),
        ilike(perfiles.titular, patron),
        ilike(perfiles.alias, patron),
        ilike(perfiles.sobreMi, patron),
        ...(tec ? [arrayOverlaps(perfiles.tecnologias, [tec.id])] : []),
      )!,
    );
  }
  if (f.disponibilidad?.length) c.push(inArray(perfiles.disponibilidad, f.disponibilidad));
  if (f.areas?.length) c.push(inArray(perfiles.area, f.areas));
  if (f.seniority?.length) c.push(inArray(perfiles.seniority, f.seniority));
  if (f.modalidades?.length) c.push(arrayOverlaps(perfiles.modalidades, f.modalidades));
  if (f.tecnologias?.length) c.push(arrayOverlaps(perfiles.tecnologias, f.tecnologias));
  if (f.pais && !sinPais) c.push(eq(perfiles.pais, f.pais));
  if (f.verificados) c.push(verificadoSql(perfiles.userId));
  return c;
}

/** Emblemas y verificación de varios usuarios de una vez. */
async function extras(db: Db, ids: string[]) {
  if (!ids.length) return { emblemasDe: () => [] as Emblema[], verificado: () => false, fotosDe: () => ({ google: null, github: null }), megustaDe: () => 0 };
  const [fundadores, ganados, discord, fotos, megusta, megustaPortfolio] = await Promise.all([
    db
      .select({ id: usuarios.id, creadoEn: usuarios.createdAt })
      .from(usuarios)
      .orderBy(asc(usuarios.createdAt), asc(usuarios.id))
      .limit(FUNDADORES),
    db
      .select()
      .from(emblemas)
      .where(and(inArray(emblemas.userId, ids), or(isNull(emblemas.caducaEn), gt(emblemas.caducaEn, sql`now()`))))
      .orderBy(desc(emblemas.otorgadoEn)),
    db.select({ id: estadoDiscord.userId }).from(estadoDiscord).where(and(inArray(estadoDiscord.userId, ids), eq(estadoDiscord.enServidor, true))),
    fotosDe(db, ids),
    megustaDe(db, ids),
    megustaPortfoliosDe(db, ids),
  ]);
  const fundador = new Map(fundadores.map((f) => [f.id, f.creadoEn]));
  const verificados = new Set(discord.map((d) => d.id));
  return {
    emblemasDe: (id: string): Emblema[] => [
      ...ganados.filter((e) => e.userId === id).map((e) => ({ tipo: e.tipo, nombre: e.nombre, fecha: e.otorgadoEn.toISOString() })),
      ...(fundador.has(id) ? [{ tipo: "fundador" as const, nombre: null, fecha: fundador.get(id)!.toISOString() }] : []),
    ],
    verificado: (id: string) => verificados.has(id),
    fotosDe: (id: string): FotosCuenta => fotos.get(id) ?? { google: null, github: null },
    // Los de sus proyectos y los de su portfolio.
    megustaDe: (id: string) => (megusta.get(id) ?? 0) + (megustaPortfolio.get(id) ?? 0),
  };
}

type Fila = { perfil: Perfil; imagen: string | null };

function aListado(f: Fila, x: Awaited<ReturnType<typeof extras>>): PerfilListado {
  const p = f.perfil;
  return {
    alias: p.alias,
    nombre: p.nombre,
    titular: p.titular,
    imagen: fotoElegida(p.foto, x.fotosDe(p.userId)),
    area: p.area,
    seniority: p.seniority,
    anosExperiencia: p.anosExperiencia,
    ciudad: p.ciudad,
    pais: p.pais,
    modalidades: p.modalidades,
    disponibilidad: p.disponibilidad,
    tecnologias: p.tecnologias,
    verificado: x.verificado(p.userId),
    megusta: x.megustaDe(p.userId),
    emblemas: x.emblemasDe(p.userId),
    actualizadoEn: p.actualizadaEn.toISOString(),
  };
}

export async function listarPerfiles(db: Db, f: FiltrosTalento, visitante: Visitante): Promise<ResultadoTalento> {
  const base = and(visiblesPara(visitante), ...condiciones(f));
  const cursor = f.despues ? leer(f.despues) : null;
  const pagina = cursor
    ? and(base, or(lt(perfiles.actualizadaEn, cursor.fecha), and(eq(perfiles.actualizadaEn, cursor.fecha), lt(perfiles.userId, cursor.id))))
    : base;

  const [filas, totales, ocultos, paises] = await Promise.all([
    db
      .select({ perfil: perfiles, imagen: usuarios.image })
      .from(perfiles)
      .innerJoin(usuarios, eq(usuarios.id, perfiles.userId))
      .where(pagina)
      .orderBy(desc(perfiles.actualizadaEn), desc(perfiles.userId))
      .limit(LIMITE_TALENTO + 1),
    db.select({ total: count() }).from(perfiles).where(base),
    visitante
      ? Promise.resolve([{ total: 0 }])
      : db.select({ total: count() }).from(perfiles).where(and(eq(perfiles.visibilidad, "registrados"), ...condiciones(f))),
    db
      .select({ pais: perfiles.pais, total: count() })
      .from(perfiles)
      .where(and(visiblesPara(visitante), ...condiciones(f, true), sql`${perfiles.pais} is not null`))
      .groupBy(perfiles.pais),
  ]);

  const hayMas = filas.length > LIMITE_TALENTO;
  const visibles = filas.slice(0, LIMITE_TALENTO);
  const x = await extras(db, visibles.map((v) => v.perfil.userId));
  const ultima = visibles.at(-1)?.perfil;
  return {
    perfiles: visibles.map((v) => aListado(v, x)),
    total: Number(totales[0]?.total ?? 0),
    siguiente: hayMas && ultima ? codificar(ultima.actualizadaEn, ultima.userId) : null,
    ocultosSinSesion: Number(ocultos[0]?.total ?? 0),
    paises: Object.fromEntries(paises.map((p) => [p.pais!, Number(p.total)])),
  };
}

/** Perfiles públicos, para el mapa del sitio (los demás no se enseñan a Google). */
export async function mapaPerfiles(db: Db): Promise<EntradaMapa[]> {
  const filas = await db
    .select({ alias: perfiles.alias, actualizadaEn: perfiles.actualizadaEn })
    .from(perfiles)
    .where(eq(perfiles.visibilidad, "publico"))
    .orderBy(desc(perfiles.actualizadaEn))
    .limit(5000);
  return filas.map((f) => ({ ruta: f.alias, actualizadaEn: f.actualizadaEn.toISOString() }));
}

/** Un perfil por su alias, si quien mira puede verlo. */
export async function obtenerPerfil(db: Db, alias: string, visitante: Visitante): Promise<PerfilPublico> {
  const [fila] = await db
    .select({ perfil: perfiles, imagen: usuarios.image })
    .from(perfiles)
    .innerJoin(usuarios, eq(usuarios.id, perfiles.userId))
    .where(eq(perfiles.alias, alias.toLowerCase()))
    .limit(1);
  if (!fila) throw new ErrorTalento("no_existe", "Este perfil no existe.");
  const p = fila.perfil;
  const esMio = visitante?.id === p.userId;
  if (!esMio && !visitante?.esStaff) {
    if (p.visibilidad === "oculto") throw new ErrorTalento("no_existe", "Este perfil no existe.");
    if (p.visibilidad === "registrados" && !visitante) throw new ErrorTalento("solo_registrados", "Inicia sesión para ver este perfil.");
  }
  const x = await extras(db, [p.userId]);
  return {
    ...aListado(fila, x),
    sobreMi: p.sobreMi,
    idiomas: p.idiomas,
    enlaces: { linkedin: p.linkedin, github: p.github, portfolio: p.portfolio },
    visibilidad: p.visibilidad,
    esMio,
    proyectos: await proyectosDe(db, p.userId, visitante),
    portfolio: await portfolioDe(db, p.userId, visitante),
  };
}

/** "Mi perfil": el que tiene (o null) y sugerencias para crearlo. */
export async function miPerfil(db: Db, usuario: { id: string; name: string; image?: string | null }): Promise<MiPerfil> {
  const [[p], [cuenta]] = await Promise.all([
    db.select().from(perfiles).where(eq(perfiles.userId, usuario.id)).limit(1),
    db.select({ pais: usuarios.pais }).from(usuarios).where(eq(usuarios.id, usuario.id)).limit(1),
  ]);
  let alias = aliasDesde(usuario.name) || "perfil";
  if (alias.length < 3) alias = `${alias}-ttj`;
  // Si el alias ya está cogido, se le añade un número.
  const usados = new Set(
    (await db.select({ alias: perfiles.alias }).from(perfiles).where(sql`${perfiles.alias} like ${`${alias}%`}`)).map((a) => a.alias),
  );
  let sugerido = alias;
  for (let n = 2; usados.has(sugerido) && sugerido !== p?.alias; n++) sugerido = `${alias}-${n}`;

  return {
    perfil: p
      ? {
          alias: p.alias,
          nombre: p.nombre,
          titular: p.titular,
          sobreMi: p.sobreMi,
          area: p.area,
          // Perfiles de antes de pedir los años: se queda vacío hasta que los ponga (el formulario lo pide).
          anosExperiencia: p.anosExperiencia ?? (null as unknown as number),
          lidera: p.lidera,
          seniority: p.seniority,
          ciudad: p.ciudad,
          pais: p.pais,
          modalidades: p.modalidades,
          disponibilidad: p.disponibilidad,
          tecnologias: p.tecnologias,
          idiomas: p.idiomas,
          linkedin: p.linkedin,
          github: p.github,
          portfolio: p.portfolio,
          foto: p.foto,
          visibilidad: p.visibilidad,
          actualizadoEn: p.actualizadaEn.toISOString(),
        }
      : null,
    // Al crear el perfil, el país ya viene puesto: el de su cuenta.
    sugerencias: { alias: sugerido, nombre: usuario.name, imagen: usuario.image ?? null, pais: cuenta?.pais ?? null },
    fotos: (await fotosDe(db, [usuario.id])).get(usuario.id)!,
  };
}

/**
 * Crea o actualiza el perfil. El alias no puede ser de otra persona.
 * Para crearlo hay que estar verificado (Discord vinculado y en el servidor); quien ya lo tenía puede editarlo.
 */
export async function guardarPerfil(db: Db, userId: string, d: DatosPerfil) {
  const [yaTiene] = await db.select({ id: perfiles.userId }).from(perfiles).where(eq(perfiles.userId, userId)).limit(1);
  if (!yaTiene) {
    const [discord] = await db.select({ enServidor: estadoDiscord.enServidor }).from(estadoDiscord).where(eq(estadoDiscord.userId, userId)).limit(1);
    if (!discord?.enServidor) throw new ErrorTalento("sin_verificar", "Para crear tu perfil tienes que estar verificado: vincula tu Discord y entra en el servidor.");
  }
  const [otro] = await db
    .select({ id: perfiles.userId })
    .from(perfiles)
    .where(and(eq(perfiles.alias, d.alias), ne(perfiles.userId, userId)))
    .limit(1);
  if (otro) throw new ErrorTalento("alias_ocupado", "Ese alias ya lo usa otra persona.");
  const valores = { ...d, actualizadaEn: new Date() };
  await db
    .insert(perfiles)
    .values({ userId, ...valores })
    .onConflictDoUpdate({ target: perfiles.userId, set: valores });
}

/** Borra el perfil y, con él, sus proyectos y su portfolio (sin perfil no se ven en ningún sitio). */
export async function borrarPerfil(db: Db, userId: string) {
  await db.delete(proyectos).where(eq(proyectos.userId, userId));
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
  await db.delete(perfiles).where(eq(perfiles.userId, userId));
}

/** Reportar un perfil. Una vez por persona; el propio no. */
export async function reportarPerfil(db: Db, alias: string, userId: string, motivo: unknown) {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < 5 || texto.length > 500) throw new ErrorTalento("motivo", "Cuéntanos qué pasa (de 5 a 500 caracteres).");
  const [p] = await db.select({ id: perfiles.userId }).from(perfiles).where(eq(perfiles.alias, alias.toLowerCase())).limit(1);
  if (!p) throw new ErrorTalento("no_existe", "Este perfil no existe.");
  if (p.id === userId) throw new ErrorTalento("propio", "No puedes reportar tu propio perfil.");
  await db
    .insert(reportesPerfil)
    .values({ id: crypto.randomUUID(), perfilUserId: p.id, reportadoPor: userId, motivo: texto })
    .onConflictDoNothing();
}

/** Reportes pendientes, del más antiguo al más nuevo. */
export async function listarReportes(db: Db): Promise<ReportePerfil[]> {
  const filas = await db
    .select({ r: reportesPerfil, p: { alias: perfiles.alias, nombre: perfiles.nombre, titular: perfiles.titular, visibilidad: perfiles.visibilidad } })
    .from(reportesPerfil)
    .innerJoin(perfiles, eq(perfiles.userId, reportesPerfil.perfilUserId))
    .where(eq(reportesPerfil.estado, "pendiente"))
    .orderBy(asc(reportesPerfil.creadoEn));
  return filas.map(({ r, p }) => ({ id: r.id, perfil: p, motivo: r.motivo, creadoEn: r.creadoEn.toISOString() }));
}

/**
 * El staff revisa un reporte:
 * - "descartar": el perfil está bien;
 * - "ocultar": el perfil pasa a oculto (solo lo ve su dueño) y se dan por revisados todos sus reportes.
 */
export async function resolverReporte(db: Db, id: string, accion: "descartar" | "ocultar") {
  const [r] = await db.select().from(reportesPerfil).where(eq(reportesPerfil.id, id)).limit(1);
  if (!r) throw new ErrorTalento("reporte", "Ese reporte no existe.");
  if (accion === "ocultar") {
    await db.update(perfiles).set({ visibilidad: "oculto" }).where(eq(perfiles.userId, r.perfilUserId));
    await db.update(reportesPerfil).set({ estado: "revisado" }).where(eq(reportesPerfil.perfilUserId, r.perfilUserId));
  } else {
    await db.update(reportesPerfil).set({ estado: "revisado" }).where(eq(reportesPerfil.id, id));
  }
}
