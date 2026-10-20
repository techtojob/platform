import { AREAS, DISPONIBILIDAD, MODALIDADES, SENIORITY, TECNOLOGIAS, type Area, type Disponibilidad, type Modalidad, type Seniority } from "@techtojob/shared";

/**
 * Filtros del buscador de talento, en la dirección: /empleo/talento?disp=buscando&area=datos&tec=python
 * Mismos nombres que el API (GET /talento).
 */

export type FiltrosTalento = {
  disponibilidad: Disponibilidad[];
  areas: Area[];
  seniority: Seniority[];
  modalidades: Modalidad[];
  tecnologias: string[];
  q?: string;
  pais?: string;
  verificados?: boolean;
  despues?: string;
};

export const PARAMETROS_TALENTO = {
  disponibilidad: { nombre: "disp", valores: DISPONIBILIDAD },
  areas: { nombre: "area", valores: AREAS },
  seniority: { nombre: "nivel", valores: SENIORITY },
  modalidades: { nombre: "modalidad", valores: MODALIDADES },
  tecnologias: { nombre: "tec", valores: TECNOLOGIAS.map((t) => t.id) },
} as const;

export type GrupoTalento = keyof typeof PARAMETROS_TALENTO;
type ParametrosUrl = Record<string, string | string[] | undefined>;

export const SIN_FILTROS_TALENTO: FiltrosTalento = { disponibilidad: [], areas: [], seniority: [], modalidades: [], tecnologias: [] };

function leerLista<T extends string>(valor: string | string[] | undefined, permitidos: readonly T[]): T[] {
  const texto = Array.isArray(valor) ? valor.join(",") : (valor ?? "");
  return [...new Set(texto.split(",").map((v) => v.trim()).filter((v): v is T => (permitidos as readonly string[]).includes(v)))];
}

export function leerFiltrosTalento(p: ParametrosUrl): FiltrosTalento {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const q = texto(p.q).slice(0, 100);
  const pais = texto(p.pais).toUpperCase();
  const despues = texto(p.despues);
  const f = { ...SIN_FILTROS_TALENTO };
  for (const grupo of Object.keys(PARAMETROS_TALENTO) as GrupoTalento[]) {
    (f as Record<GrupoTalento, string[]>)[grupo] = leerLista(p[PARAMETROS_TALENTO[grupo].nombre], PARAMETROS_TALENTO[grupo].valores);
  }
  return {
    ...f,
    ...(q && { q }),
    ...(/^[A-Z]{2}$/.test(pais) && { pais }),
    ...(p.verificados === "1" && { verificados: true }),
    ...(despues && { despues }),
  };
}

export function aParametrosTalento(f: FiltrosTalento): Record<string, string> {
  const q: Record<string, string> = {};
  for (const grupo of Object.keys(PARAMETROS_TALENTO) as GrupoTalento[]) {
    if (f[grupo].length) q[PARAMETROS_TALENTO[grupo].nombre] = f[grupo].join(",");
  }
  if (f.q) q.q = f.q;
  if (f.pais) q.pais = f.pais;
  if (f.verificados) q.verificados = "1";
  if (f.despues) q.despues = f.despues;
  return q;
}

export function alternarTalento(f: FiltrosTalento, grupo: GrupoTalento, valor: string): FiltrosTalento {
  const actual = f[grupo] as string[];
  return { ...f, [grupo]: actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor], despues: undefined };
}

export function cambiarTalento(f: FiltrosTalento, cambios: Partial<Pick<FiltrosTalento, "q" | "pais" | "verificados">>): FiltrosTalento {
  return { ...f, ...cambios, despues: undefined };
}

/** Cuántos filtros hay puestos (sin contar el texto buscado). */
export function cuantosFiltrosTalento(f: FiltrosTalento): number {
  return (Object.keys(PARAMETROS_TALENTO) as GrupoTalento[]).reduce((n, g) => n + f[g].length, 0) + (f.pais ? 1 : 0) + (f.verificados ? 1 : 0);
}
