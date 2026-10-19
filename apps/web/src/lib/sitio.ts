/**
 * Enlaces a la landing y redes. La bolsa vive en techtojob.com/empleo y la landing en
 * techtojob.com: en producción los enlaces van al mismo dominio. En local, a la landing publicada.
 */
export const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "https://techtojob.com").replace(/\/+$/, "");

export const sitio = {
  discord: "https://discord.gg/pzCa8esFGA",
  linkedin: "https://www.linkedin.com/company/techtojob/",
  x: "https://x.com/techtojob",
  instagram: "https://www.instagram.com/techtojob",
  tiktok: "https://www.tiktok.com/@techtojob",
} as const;

/** Secciones de la landing que salen en el menú, después de "Empleo". */
export const SECCIONES_LANDING = [
  ["talento", "/talento"],
  ["empresas", "/empresas"],
  ["torneos", "/torneos"],
  ["noticias", "/noticias"],
  ["quienesSomos", "/quienes-somos"],
] as const;
