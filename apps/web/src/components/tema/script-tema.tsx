/**
 * Pone el modo (claro u oscuro) antes de pintar la página, para que no haya un
 * destello del modo equivocado. Lee la cookie TTJ_TEMA; si no hay, no pone nada
 * y se ve el oscuro, el de la landing (ver globals.css).
 *
 * Es un <script> en línea a propósito: tiene que ejecutarse antes que todo lo demás.
 */
export const COOKIE_TEMA = "TTJ_TEMA";

const codigo = `try{var m=document.cookie.match(/(?:^|; )${COOKIE_TEMA}=(claro|oscuro)/);if(m)document.documentElement.dataset.tema=m[1]}catch(e){}`;

export function ScriptTema() {
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}
