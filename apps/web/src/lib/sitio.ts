/**
 * Enlaces fuera de la bolsa. La bolsa vive en techtojob.com/empleo y la landing en
 * techtojob.com. La bolsa solo lleva a la portada de la landing (el logo, las migas y
 * el pie), nunca a sus secciones: es una herramienta, no una copia de la landing.
 * En local, los enlaces van a la landing publicada.
 */
export const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "https://techtojob.com").replace(/\/+$/, "");

export const sitio = {
  discord: "https://discord.gg/pzCa8esFGA",
  linkedin: "https://www.linkedin.com/company/techtojob/",
  x: "https://x.com/techtojob",
  instagram: "https://www.instagram.com/techtojob",
  tiktok: "https://www.tiktok.com/@techtojob",
  /** Páginas legales: están en la landing, pero toda página tiene que enlazarlas. */
  privacidad: "/privacidad",
  avisoLegal: "/aviso-legal",
} as const;
