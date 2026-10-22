import { leerFiltrosProyectos, type Area, type FiltrosProyectos } from "@techtojob/shared";

/**
 * Filtros de la página de proyectos, en la dirección: /empleo/proyectos?orden=tendencia&area=datos&tec=python
 * Mismos nombres que el API (GET /proyectos). Para leerlos: `leerFiltrosProyectos` (de shared).
 */
export { leerFiltrosProyectos };

export function aParametrosProyectos(f: FiltrosProyectos): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.orden !== "mes") q.orden = f.orden;
  if (f.mes) q.mes = f.mes;
  if (f.areas.length) q.area = f.areas.join(",");
  if (f.tecnologias.length) q.tec = f.tecnologias.join(",");
  if (f.q) q.q = f.q;
  if (f.pagina > 1) q.pagina = String(f.pagina);
  return q;
}

/** Cambia algo y vuelve a la primera página. */
export function cambiarProyectos(f: FiltrosProyectos, cambios: Partial<FiltrosProyectos>): FiltrosProyectos {
  const nuevos = { ...f, pagina: 1, ...cambios };
  if (nuevos.orden !== "mes") delete nuevos.mes;
  if (!nuevos.q) delete nuevos.q;
  if (!nuevos.mes) delete nuevos.mes;
  return nuevos;
}

export function alternarArea(f: FiltrosProyectos, area: Area): FiltrosProyectos {
  return cambiarProyectos(f, { areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area] });
}

export function alternarTecnologia(f: FiltrosProyectos, tec: string): FiltrosProyectos {
  return cambiarProyectos(f, { tecnologias: f.tecnologias.includes(tec) ? f.tecnologias.filter((t) => t !== tec) : [...f.tecnologias, tec] });
}

/** Los meses que se pueden ver en el ranking: desde el lanzamiento (octubre de 2026) hasta este. */
export function mesesDelRanking(actual: string, desde = "2026-10"): string[] {
  const meses: string[] = [];
  let [a, m] = actual.split("-").map(Number) as [number, number];
  for (let i = 0; i < 36; i++) {
    const mes = `${a}-${String(m).padStart(2, "0")}`;
    if (mes < desde) break;
    meses.push(mes);
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return meses;
}

/** "/empleo/proyectos/lakehouse-canarias-k7x2m9qa" */
export function slugDeProyecto(p: { slug: string; id: string }): string {
  return `${p.slug}-${p.id}`;
}
