/**
 * Recruiters: solo ellos (y el staff) pueden publicar ofertas desde la web.
 * Cualquiera se registra como recruiter al momento (cargo, empresa, LinkedIn…): no lo aprueba nadie.
 * Lo que revisa el staff es cada oferta. Si alguien abusa, el staff lo bloquea.
 * Un recruiter publica solo ofertas de su empresa, salvo que el staff lo marque como agencia
 * (headhunters que buscan para varias empresas).
 */

export const CARGOS_RECRUITER = ["recruiter", "rrhh", "fundador", "manager", "otro"] as const;
export type CargoRecruiter = (typeof CARGOS_RECRUITER)[number];

/** activo: puede publicar · bloqueado: el staff le quitó el acceso (con un motivo que ve la persona). */
export const ESTADOS_RECRUITER = ["activo", "bloqueado"] as const;
export type EstadoRecruiter = (typeof ESTADOS_RECRUITER)[number];

export const LIMITES_RECRUITER = { empresa: 80, web: 200, linkedin: 300, mensaje: 500, motivo: 300 } as const;

/** Lo que manda quien se registra como recruiter o cambia sus datos (PUT /cuenta/recruiter). */
export type SolicitudRecruiter = {
  cargo: CargoRecruiter;
  empresa: string;
  web: string | null;
  linkedin: string;
  mensaje: string | null;
};

/** Mis datos de recruiter (GET /cuenta/recruiter), o null si no me he registrado. */
export type MiRecruiter = SolicitudRecruiter & {
  estado: EstadoRecruiter;
  /** Si está bloqueado: por qué. */
  motivo: string | null;
  agencia: boolean;
  /** La empresa en la bolsa (se enlaza con su primera oferta). */
  empresaId: string | null;
  /** El email de su cuenta es de la empresa (mismo dominio que la web): una pista para el staff. */
  emailEmpresa: boolean;
  creadoEn: string;
};

/** Un recruiter visto por el staff. */
export type RecruiterStaff = MiRecruiter & {
  usuario: { id: string; nombre: string; email: string };
  /** Cuántas ofertas ha subido (en cualquier estado). */
  ofertas: number;
};

/** GET /staff/recruiters?estado=activo|bloqueado */
export type ListaRecruiters = {
  estado: EstadoRecruiter;
  recruiters: RecruiterStaff[];
  cuentas: Partial<Record<EstadoRecruiter, number>>;
};

/** Correos gratuitos: nunca cuentan como "email de la empresa". */
const CORREOS_GRATUITOS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es", "live.com", "msn.com",
  "yahoo.com", "yahoo.es", "icloud.com", "me.com", "proton.me", "protonmail.com", "gmx.com", "gmx.es", "aol.com",
  "zoho.com", "yandex.com", "mail.com", "users.noreply.github.com",
]);

const sinWww = (host: string) => host.toLowerCase().replace(/^www\./, "");

/**
 * ¿El email es de la empresa? "ana@volcandata.com" con "https://www.volcandata.com" → sí;
 * también "ana@es.volcandata.com" o web "https://careers.volcandata.com". Con @gmail.com, nunca.
 */
export function esEmailDeLaEmpresa(email: string, web: string | null | undefined): boolean {
  const dominio = email.split("@")[1]?.toLowerCase().trim();
  if (!dominio || !web || CORREOS_GRATUITOS.has(dominio)) return false;
  let host: string;
  try {
    host = sinWww(new URL(web).hostname);
  } catch {
    return false;
  }
  // Se compara el dominio "de verdad" (las dos últimas partes, o tres si es .com.mx, .co.uk…).
  const base = (h: string) => {
    const partes = h.split(".");
    const n = partes.length > 2 && partes.at(-2)!.length <= 3 && partes.at(-1)!.length === 2 ? 3 : 2;
    return partes.slice(-n).join(".");
  };
  return base(dominio) === base(host);
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function esUrl(valor: string): URL | null {
  try {
    const u = new URL(valor);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/** Comprueba una solicitud de recruiter. Devuelve los datos limpios o un código por campo. */
export function validarSolicitudRecruiter(
  entrada: unknown,
): { datos: SolicitudRecruiter; errores?: undefined } | { datos?: undefined; errores: Record<string, string> } {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};

  const cargo = typeof e.cargo === "string" && (CARGOS_RECRUITER as readonly string[]).includes(e.cargo) ? (e.cargo as CargoRecruiter) : null;
  if (!cargo) errores.cargo = "falta";

  const empresa = texto(e.empresa);
  if (!empresa) errores.empresa = "falta";
  else if (empresa.length < 2) errores.empresa = "corto";
  else if (empresa.length > LIMITES_RECRUITER.empresa) errores.empresa = "largo";

  const web = texto(e.web);
  if (web && (!esUrl(web) || web.length > LIMITES_RECRUITER.web)) errores.web = "url";

  const linkedin = texto(e.linkedin);
  const urlLinkedin = linkedin ? esUrl(linkedin) : null;
  if (!linkedin) errores.linkedin = "falta";
  else if (!urlLinkedin || !/(^|\.)linkedin\.com$/i.test(urlLinkedin.hostname) || linkedin.length > LIMITES_RECRUITER.linkedin) {
    errores.linkedin = "linkedin";
  }

  const mensaje = texto(e.mensaje);
  if (mensaje && mensaje.length > LIMITES_RECRUITER.mensaje) errores.mensaje = "largo";

  if (Object.keys(errores).length) return { errores };
  return { datos: { cargo: cargo!, empresa: empresa!, web, linkedin: linkedin!, mensaje } };
}
