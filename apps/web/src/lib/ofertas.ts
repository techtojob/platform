/**
 * Dirección de una oferta: /empleo/ofertas/<slug>-<id>
 * El slug es para que se lea bien (y para Google); lo que cuenta es el id del final.
 */

export function slugDeOferta(oferta: { slug: string; id: string }): string {
  return `${oferta.slug}-${oferta.id}`;
}

/** "frontend-junior-atlantica-labs-k7x2m9qa" → { slug: "frontend-junior-atlantica-labs", id: "k7x2m9qa" } */
export function separarSlug(valor: string): { slug: string; id: string } {
  const corte = valor.lastIndexOf("-");
  return corte === -1 ? { slug: "", id: valor } : { slug: valor.slice(0, corte), id: valor.slice(corte + 1) };
}
