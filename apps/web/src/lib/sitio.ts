/**
 * Enlaces fuera de la bolsa. La bolsa vive en techtojob.com/empleo y la landing en
 * techtojob.com. La bolsa solo lleva a la portada de la landing (el logo, las migas y
 * el pie), nunca a sus secciones: es una herramienta, no una copia de la landing.
 * En local, los enlaces van a la landing publicada.
 */
export const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "https://techtojob.com").replace(/\/+$/, "");

export const sitio = {
  discord: "https://discord.gg/pzCa8esFGA",
  /** Para escribirnos: el correo y el canal de tickets del Discord. */
  correo: "contacto@techtojob.com",
  tickets: "https://discord.com/channels/1500449244019036219/1500449247399641128",
  linkedin: "https://www.linkedin.com/company/techtojob/",
  x: "https://x.com/techtojob",
  instagram: "https://www.instagram.com/techtojob",
  tiktok: "https://www.tiktok.com/@techtojob",
  /** Aviso legal: el de la landing (quién es el titular). La privacidad de la bolsa tiene su propia página (/empleo/privacidad). */
  avisoLegal: "/aviso-legal",
} as const;
