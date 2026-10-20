"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lo común de los menús que se abren con un botón (hamburguesa, menú de la cuenta):
 * se cierran al pulsar fuera, con Escape (devolviendo el foco al botón) y, si se da
 * `cerrarDesde`, al pasar a una pantalla de ese ancho.
 */
export function useDesplegable(cerrarDesde?: string) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cerrarDesde) return;
    const medio = window.matchMedia(cerrarDesde);
    const cerrar = () => setAbierto(false);
    medio.addEventListener("change", cerrar);
    return () => medio.removeEventListener("change", cerrar);
  }, [cerrarDesde]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return { abierto, setAbierto, raiz, boton };
}
