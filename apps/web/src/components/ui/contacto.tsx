import type { ReactNode } from "react";
import { sitio } from "@/lib/sitio";

/**
 * Enlaces para t.rich: <correo>contacto@techtojob.com</correo> y <ticket>crea un ticket en el Discord</ticket>.
 * Para "escríbenos" (publicar de varias empresas, dudas…).
 */
export const enlacesContacto = {
  correo: (texto: ReactNode) => (
    <a href={`mailto:${sitio.correo}`} className="font-bold text-enlace underline">
      {texto}
    </a>
  ),
  ticket: (texto: ReactNode) => (
    <a href={sitio.tickets} target="_blank" rel="noopener noreferrer" className="font-bold text-enlace underline">
      {texto}
    </a>
  ),
};
