import type { DatosPerfil, FotoPerfil, MiPerfil } from "@techtojob/shared";

/** Lo que hay escrito en "Mi perfil" (texto tal cual; "" si está vacío). */
export type ValoresPerfil = {
  alias: string;
  nombre: string;
  titular: string;
  sobreMi: string;
  area: string;
  /** "" mientras no lo elija; "0"…"16" (16 = más de 15). */
  anosExperiencia: string;
  lidera: boolean;
  ciudad: string;
  pais: string;
  modalidades: string[];
  disponibilidad: string;
  tecnologias: string[];
  idiomas: Array<{ idioma: string; nivel: string }>;
  linkedin: string;
  github: string;
  portfolio: string;
  foto: FotoPerfil;
  visibilidad: string;
};

/** El perfil guardado o, si aún no hay, uno vacío con el alias y el nombre propuestos. */
export function valoresIniciales(mio: MiPerfil, idiomaWeb: string): ValoresPerfil {
  const p = mio.perfil;
  if (!p) {
    return {
      alias: mio.sugerencias.alias,
      nombre: mio.sugerencias.nombre,
      titular: "",
      sobreMi: "",
      area: "",
      anosExperiencia: "",
      lidera: false,
      ciudad: "",
      // El de su cuenta (lo puso al entrar por primera vez).
      pais: mio.sugerencias.pais ?? (idiomaWeb === "es" ? "ES" : ""),
      modalidades: [],
      disponibilidad: "",
      tecnologias: [],
      idiomas: [{ idioma: idiomaWeb, nivel: "" }],
      linkedin: "",
      github: "",
      portfolio: "",
      // Por defecto, la de la cuenta con la que entró (Google si la tiene; si no, GitHub).
      foto: mio.fotos.google ? "google" : mio.fotos.github ? "github" : "ninguna",
      visibilidad: "registrados",
    };
  }
  const resto: Partial<typeof p> = { ...p };
  delete resto.seniority; // no se edita: sale de los años
  return {
    ...(resto as Omit<typeof p, "seniority">),
    anosExperiencia: p.anosExperiencia == null ? "" : String(p.anosExperiencia),
    sobreMi: p.sobreMi ?? "",
    ciudad: p.ciudad ?? "",
    pais: p.pais ?? "",
    idiomas: p.idiomas.map((i) => ({ idioma: i.idioma, nivel: i.nivel ?? "" })),
    linkedin: p.linkedin ?? "",
    github: p.github ?? "",
    portfolio: p.portfolio ?? "",
  };
}

/** Lo que se manda al API (que lo vuelve a comprobar todo). */
export function perfilParaApi(v: ValoresPerfil): Record<Exclude<keyof DatosPerfil, "seniority">, unknown> {
  const siHay = (s: string) => s.trim() || null;
  return {
    ...v,
    anosExperiencia: v.anosExperiencia === "" ? null : Number(v.anosExperiencia),
    alias: v.alias.trim().toLowerCase(),
    sobreMi: siHay(v.sobreMi),
    ciudad: siHay(v.ciudad),
    pais: siHay(v.pais),
    linkedin: siHay(v.linkedin),
    github: siHay(v.github),
    portfolio: siHay(v.portfolio),
    idiomas: v.idiomas.map((i) => ({ idioma: i.idioma, nivel: siHay(i.nivel) })),
  };
}

/** Lo que se va escribiendo en el alias → minúsculas, sin acentos y con guiones. */
export function limpiarAlias(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 30);
}
