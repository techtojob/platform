import type {
  Ats,
  Area,
  Disponibilidad,
  EstadoOferta,
  Idioma,
  Modalidad,
  NivelIdioma,
  OrigenOferta,
  Seniority,
  TipoEmblema,
  VisibilidadPerfil,
} from "@techtojob/shared";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
  /** Su página de empleo en un ATS (greenhouse, lever, ashby, teamtailor, personio) y su identificador allí. */
  ats: text("ats").$type<Ats>(),
  atsId: text("ats_id"),
  /** Lever tiene servidores en EE. UU. y en Europa ("eu"); Personio, en .de y .com ("com"). */
  atsRegion: text("ats_region"),
  /** Se leen sus ofertas cada día (ver servicios/sincronizar.ts). */
  sincronizar: boolean("sincronizar").notNull().default(false),
  /** La empresa nos ha pedido que no publiquemos sus ofertas. */
  bloqueada: boolean("bloqueada").notNull().default(false),
  ultimaLectura: timestamp("ultima_lectura", { withTimezone: true }),
  ultimoError: text("ultimo_error"),
  /** Lecturas seguidas con error. Con 3, se deja de leer (hasta que el staff la reactive). */
  erroresSeguidos: integer("errores_seguidos").notNull().default(0),
  /** Última vez que tuvo alguna oferta de las que nos sirven (técnica, remota, en español o inglés). */
  ultimaOfertaUtil: timestamp("ultima_oferta_util", { withTimezone: true }),
  /** "staff" (la añadió alguien del staff) o "descubierta" (la encontró el sistema solo). */
  origen: text("origen").$type<"staff" | "descubierta">().notNull().default("staff"),
  ...fechas,
});

/**
 * Empresas candidatas para descubrir solas: se prueba si tienen página de empleo en
 * Greenhouse, Lever, Ashby, Teamtailor, Personio, Workable, Recruitee o SmartRecruiters (ver servicios/descubrir.ts y datos/empresas-candidatas.json).
 */
export const candidatas = pgTable("candidatas", {
  /** "grafana-labs": el nombre en minúsculas, sin acentos ni espacios. */
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  /** Identificadores que se prueban en cada ATS ("grafanalabs", "grafana-labs"…). */
  identificadores: text("identificadores").array().$type<string[]>().notNull(),
  /** Si ya se sabe dónde está su página de empleo (Common Crawl), solo se prueba esa. */
  ats: text("ats").$type<Ats>(),
  atsId: text("ats_id"),
  atsRegion: text("ats_region"),
  /** pendiente → encontrada (se añadió la empresa) · sin_ofertas (se vuelve a probar en 30 días) · no_existe. */
  estado: text("estado").$type<"pendiente" | "encontrada" | "sin_ofertas" | "no_existe">().notNull().default("pendiente"),
  probadaEn: timestamp("probada_en", { withTimezone: true }),
  empresaId: text("empresa_id").references(() => empresas.id, { onDelete: "set null" }),
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

    /** Dónde: país (ISO, "ES") y ciudad, si es híbrido o presencial. */
    pais: text("pais"),
    ciudad: text("ciudad"),
    /** Si es remoto: desde cualquier país, o desde estos (ISO: ["ES", "MX"]). Ver packages/shared/src/remoto.ts. */
    remotoMundo: boolean("remoto_mundo").notNull().default(false),
    remotoPaises: text("remoto_paises").array().$type<string[]>().notNull().default(sql`'{}'::text[]`),

    /** Salario solo si la oferta lo indica. Anual y bruto. */
    salarioMin: integer("salario_min"),
    salarioMax: integer("salario_max"),
    moneda: text("moneda"),

    origen: text("origen").$type<OrigenOferta>().notNull(),
    /** Ofertas automáticas: de qué ATS vienen y su id allí (para no duplicarlas y saber cuándo desaparecen). */
    fuenteAts: text("fuente_ats").$type<Ats>(),
    idExterno: text("id_externo"),
    /** El texto original de la empresa. Solo lo ve el staff: no se publica (no es nuestro). */
    descripcionOriginal: text("descripcion_original"),
    /** Última vez que la oferta seguía en la página de empleo de la empresa. */
    vistaEn: timestamp("vista_en", { withTimezone: true }),
    /** La empresa nos autoriza a publicarla. Solo esas llevan los datos para Google for Jobs. */
    autorizada: boolean("autorizada").notNull().default(false),
    estado: text("estado").$type<EstadoOferta>().notNull().default("pendiente"),
    motivoRechazo: text("motivo_rechazo"),
    /** Quién del staff la revisó y cuándo. */
    revisadaPor: text("revisada_por"),
    revisadaEn: timestamp("revisada_en", { withTimezone: true }),
    publicadaEn: timestamp("publicada_en", { withTimezone: true }),
    /** Deja de salir en la bolsa a partir de esta fecha (45 días al publicar; el staff la puede alargar). */
    caducaEn: timestamp("caduca_en", { withTimezone: true }),
    ...fechas,
  },
  (t) => [
    index("ofertas_estado_publicada_idx").on(t.estado, t.publicadaEn.desc()),
    index("ofertas_tecnologias_idx").using("gin", t.tecnologias),
    index("ofertas_remoto_paises_idx").using("gin", t.remotoPaises),
    uniqueIndex("ofertas_externas_idx").on(t.empresaId, t.fuenteAts, t.idExterno),
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

/*
 * Cuentas de usuario: tablas que usa Better Auth (src/auth.ts). Los nombres de las
 * propiedades (name, emailVerified…) los fija Better Auth; las tablas y columnas, nosotros.
 * Se entra con Google o GitHub; Discord solo se vincula (cuentas.providerId = "discord").
 */

export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  name: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verificado").notNull().default(false),
  image: text("imagen"),
  createdAt: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("actualizado_en", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sesiones = pgTable(
  "sesiones",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("caduca_en", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("actualizada_en", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip"),
    userAgent: text("navegador"),
    userId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  },
  (t) => [index("sesiones_usuario_idx").on(t.userId)],
);

/** Cada forma de entrar o servicio vinculado de un usuario: google, github, discord. */
export const cuentas = pgTable(
  "cuentas",
  {
    id: text("id").primaryKey(),
    /** El id del usuario en ese servicio (su id de Discord, de GitHub…). */
    accountId: text("id_externo").notNull(),
    providerId: text("proveedor").notNull(),
    userId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_caduca_en", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_caduca_en", { withTimezone: true }),
    scope: text("permisos"),
    password: text("password"),
    createdAt: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("actualizada_en", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("cuentas_usuario_idx").on(t.userId),
    // Una cuenta de GitHub (o Discord…) solo puede estar vinculada a un usuario.
    uniqueIndex("cuentas_proveedor_id_externo_uq").on(t.providerId, t.accountId),
  ],
);

/** Códigos temporales de Better Auth (el "state" del inicio de sesión con Google o GitHub…). */
export const verificaciones = pgTable(
  "verificaciones",
  {
    id: text("id").primaryKey(),
    identifier: text("identificador").notNull(),
    value: text("valor").notNull(),
    expiresAt: timestamp("caduca_en", { withTimezone: true }).notNull(),
    createdAt: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("actualizada_en", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verificaciones_identificador_idx").on(t.identifier)],
);

/**
 * Si el Discord vinculado está en el servidor de TechToJob y con qué roles.
 * Lo comprueba el bot (src/servicios/discord.ts) al vincular y en cada inicio de sesión.
 */
export const estadoDiscord = pgTable("estado_discord", {
  userId: text("usuario_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  discordId: text("discord_id").notNull(),
  /** Nombre de usuario de Discord, para enseñarlo en "Mi cuenta". */
  nombre: text("nombre"),
  enServidor: boolean("en_servidor").notNull().default(false),
  /** Ids de los roles que tiene en el servidor. */
  roles: text("roles").array().$type<string[]>().notNull().default(sql`'{}'::text[]`),
  comprobadoEn: timestamp("comprobado_en", { withTimezone: true }).notNull().defaultNow(),
});

/*
 * Talento: el perfil de cada persona (uno por usuario), sus emblemas y los reportes.
 */

export const perfiles = pgTable(
  "perfiles",
  {
    userId: text("usuario_id")
      .primaryKey()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    /** Para la dirección: /empleo/talento/<alias>. Minúsculas, números y guiones. */
    alias: text("alias").notNull().unique(),
    nombre: text("nombre").notNull(),
    /** Una línea: "Desarrolladora frontend junior". */
    titular: text("titular").notNull(),
    sobreMi: text("sobre_mi"),
    area: text("area").$type<Area>().notNull(),
    seniority: text("seniority").$type<Seniority>().notNull(),
    ciudad: text("ciudad"),
    pais: text("pais"),
    /** Modalidades que prefiere: ["remoto", "hibrido"]. */
    modalidades: text("modalidades").array().$type<Modalidad[]>().notNull().default(sql`'{}'::text[]`),
    disponibilidad: text("disponibilidad").$type<Disponibilidad>().notNull(),
    tecnologias: text("tecnologias").array().$type<string[]>().notNull().default(sql`'{}'::text[]`),
    idiomas: jsonb("idiomas").$type<Array<{ idioma: Idioma; nivel: NivelIdioma | null }>>().notNull().default([]),
    linkedin: text("linkedin"),
    github: text("github"),
    portfolio: text("portfolio"),
    /** Si enseña la foto de Google o GitHub. Si no, un avatar con la inicial. */
    mostrarFoto: boolean("mostrar_foto").notNull().default(false),
    visibilidad: text("visibilidad").$type<VisibilidadPerfil>().notNull().default("registrados"),
    ...fechas,
  },
  (t) => [
    index("perfiles_visibles_idx").on(t.visibilidad, t.actualizadaEn.desc()),
    index("perfiles_tecnologias_idx").using("gin", t.tecnologias),
  ],
);

/**
 * Emblemas que se ganan: torneos, quiz… (el de "Miembro fundador" no se guarda:
 * se calcula, es de los 1.000 primeros usuarios). Los asigna el staff.
 */
export const emblemas = pgTable(
  "emblemas",
  {
    id: text("id").primaryKey(),
    userId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    tipo: text("tipo").$type<TipoEmblema>().notNull(),
    /** "Torneo #2 · Landing". */
    nombre: text("nombre"),
    otorgadoEn: timestamp("otorgado_en", { withTimezone: true }).notNull().defaultNow(),
    /** Algunos caducan (el rol de campeón dura un año). Sin fecha, es para siempre. */
    caducaEn: timestamp("caduca_en", { withTimezone: true }),
  },
  (t) => [index("emblemas_usuario_idx").on(t.userId)],
);

/** Reportes de perfiles. Hay que haber iniciado sesión y cada persona reporta un perfil una vez. */
export const reportesPerfil = pgTable(
  "reportes_perfil",
  {
    id: text("id").primaryKey(),
    perfilUserId: text("perfil_usuario_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    reportadoPor: text("reportado_por")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(),
    /** pendiente → el staff lo mira → revisado. */
    estado: text("estado").$type<"pendiente" | "revisado">().notNull().default("pendiente"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reportes_perfil_unico_idx").on(t.perfilUserId, t.reportadoPor)],
);

export type Empresa = typeof empresas.$inferSelect;
export type Oferta = typeof ofertas.$inferSelect;
export type NuevaOferta = typeof ofertas.$inferInsert;
export type OfertaIdioma = typeof ofertaIdiomas.$inferSelect;
export type Perfil = typeof perfiles.$inferSelect;
