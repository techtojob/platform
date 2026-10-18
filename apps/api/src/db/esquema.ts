import type {
  Area,
  EstadoOferta,
  Idioma,
  Modalidad,
  NivelIdioma,
  OrigenOferta,
  Seniority,
} from "@techtojob/shared";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Tablas de la base de datos (Postgres en Neon).
 *
 * Los valores de las listas fijas (área, nivel, modalidad…) se guardan como texto
 * con el identificador de @techtojob/shared. Se validan en servicios/, no con
 * enums de Postgres: así añadir un valor nuevo no obliga a migrar la base de datos.
 *
 * Después de cambiar este archivo: `pnpm --filter api db:generar` crea la migración.
 */

const fechas = {
  creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  actualizadaEn: timestamp("actualizada_en", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const empresas = pgTable("empresas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  /** Para la URL y para agrupar ofertas: "volcan-data". */
  slug: text("slug").notNull().unique(),
  web: text("web"),
  logoUrl: text("logo_url"),
  ...fechas,
});

export const ofertas = pgTable(
  "ofertas",
  {
    /** Código corto que va al final de la URL: /empleo/ofertas/data-engineer-volcan-data-k7x2m9qa */
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    empresaId: text("empresa_id")
      .notNull()
      .references(() => empresas.id),

    /** Tal cual lo publica la empresa, sin traducir. */
    titulo: text("titulo").notNull(),
    /** Resumen de 3–4 líneas que escribe el staff, en el idioma de la oferta. */
    resumen: text("resumen"),
    /** La oferta completa (tareas, requisitos…), en texto. Párrafos separados por una línea en blanco. */
    descripcion: text("descripcion"),
    /** Idioma en que está escrita la oferta. */
    idioma: text("idioma").$type<Idioma>().notNull(),
    /** Enlace a la oferta en la web de la empresa: a donde se manda a la gente. */
    urlOriginal: text("url_original").notNull(),

    area: text("area").$type<Area>().notNull(),
    seniority: text("seniority").$type<Seniority>().notNull(),
    modalidad: text("modalidad").$type<Modalidad>().notNull(),
    /** Identificadores de TECNOLOGIAS: ["python", "sql"]. */
    tecnologias: text("tecnologias").array().$type<string[]>().notNull().default(sql`'{}'::text[]`),

    /** Dónde: país (ISO, "ES"), ciudad y, si es remoto, desde qué zona. */
    pais: text("pais"),
    ciudad: text("ciudad"),
    remotoDesde: text("remoto_desde"),

    /** Salario solo si la oferta lo indica. Anual y bruto. */
    salarioMin: integer("salario_min"),
    salarioMax: integer("salario_max"),
    moneda: text("moneda"),

    origen: text("origen").$type<OrigenOferta>().notNull(),
    estado: text("estado").$type<EstadoOferta>().notNull().default("pendiente"),
    motivoRechazo: text("motivo_rechazo"),
    /** Quién del staff la revisó y cuándo. */
    revisadaPor: text("revisada_por"),
    revisadaEn: timestamp("revisada_en", { withTimezone: true }),
    publicadaEn: timestamp("publicada_en", { withTimezone: true }),
    ...fechas,
  },
  (t) => [
    index("ofertas_estado_publicada_idx").on(t.estado, t.publicadaEn.desc()),
    index("ofertas_tecnologias_idx").using("gin", t.tecnologias),
  ],
);

/**
 * Idiomas que pide cada oferta. Una oferta solo se enseña a quien habla todos.
 * Si la oferta no dice nada, se guarda su propio idioma.
 */
export const ofertaIdiomas = pgTable(
  "oferta_idiomas",
  {
    ofertaId: text("oferta_id")
      .notNull()
      .references(() => ofertas.id, { onDelete: "cascade" }),
    idioma: text("idioma").$type<Idioma>().notNull(),
    nivel: text("nivel").$type<NivelIdioma>(),
  },
  (t) => [primaryKey({ columns: [t.ofertaId, t.idioma] })],
);

export type Empresa = typeof empresas.$inferSelect;
export type Oferta = typeof ofertas.$inferSelect;
export type NuevaOferta = typeof ofertas.$inferInsert;
export type OfertaIdioma = typeof ofertaIdiomas.$inferSelect;
