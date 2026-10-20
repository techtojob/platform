import { notFound } from "next/navigation";

/**
 * Cualquier dirección de la bolsa que no existe (/empleo/lo-que-sea) acaba aquí,
 * para que salga nuestra página de "no existe" (not-found.tsx), con la cabecera y en su idioma.
 */
export default function NoExiste() {
  notFound();
}
