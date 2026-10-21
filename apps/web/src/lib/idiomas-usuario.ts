import { esIdioma, type Idioma } from "@techtojob/shared";

/**
 * Idiomas que habla quien visita la bolsa. Deciden qué ofertas ve.
 * Orden: los que eligió a mano (cookie) → los del navegador → el idioma de la web.
 * Más adelante, con sesión iniciada, saldrán de su perfil.
 */

export const COOKIE_HABLO = "TTJ_HABLO";

function sinRepetir(lista: Idioma[]): Idioma[] {
  return [...new Set(lista)];
}

/** "es,en" → ["es","en"]; null si la cookie no existe o no tiene ningún idioma válido. */
export function idiomasDeCookie(valor: string | undefined | null): Idioma[] | null {
  if (!valor) return null;
  const lista = sinRepetir(valor.split(",").map((v) => v.trim()).filter(esIdioma));
  return lista.length ? lista : null;
}

/** "es-ES,es;q=0.9,en;q=0.8,fr;q=0.1" → ["es","en","fr"], de más a menos preferido. */
export function idiomasDeNavegador(acceptLanguage: string | null | undefined): Idioma[] {
  if (!acceptLanguage) return [];
  const pedidos = acceptLanguage
    .split(",")
    .map((parte, posicion) => {
      const [etiqueta, ...params] = parte.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { codigo: etiqueta.toLowerCase().split("-")[0], peso: q ? Number(q.slice(2)) : 1, posicion };
    })
    .filter((p) => p.peso > 0)
    .sort((a, b) => b.peso - a.peso || a.posicion - b.posicion);
  return sinRepetir(pedidos.map((p) => p.codigo).filter(esIdioma));
}

export function idiomasDelUsuario({
  cookie,
  acceptLanguage,
  idiomaWeb,
}: {
  cookie: string | undefined | null;
  acceptLanguage: string | null | undefined;
  idiomaWeb: string;
}): Idioma[] {
  const elegidos = idiomasDeCookie(cookie);
  if (elegidos) return elegidos;
  const navegador = idiomasDeNavegador(acceptLanguage);
  if (navegador.length) return navegador;
  return esIdioma(idiomaWeb) ? [idiomaWeb] : ["es"];
}

/**
 * Nombre de un idioma en el idioma de la web, lo pone el navegador:
 * ("de", "es") → "Alemán"; con `enFrase`, tal cual va dentro de una frase: "alemán" (en inglés, "German").
 */
export function nombreIdioma(codigo: string, idiomaWeb: string, { enFrase = false } = {}): string {
  const nombre = new Intl.DisplayNames([idiomaWeb], { type: "language" }).of(codigo) ?? codigo;
  return enFrase ? nombre : nombre.charAt(0).toLocaleUpperCase(idiomaWeb) + nombre.slice(1);
}
