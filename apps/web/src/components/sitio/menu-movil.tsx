"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const ORDENADOR = "(min-width: 64rem)";

/** Menú de hamburguesa del móvil, como el de la landing (components/mobile-menu.tsx). */
export function MenuMovil({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const medio = window.matchMedia(ORDENADOR);
    const cerrar = () => setAbierto(false);
    medio.addEventListener("change", cerrar);
    return () => medio.removeEventListener("change", cerrar);
  }, []);

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

  return (
    <div ref={raiz} className="relative flex items-center min-[64rem]:hidden">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        aria-label={etiqueta}
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-hover"
      >
        <span aria-hidden="true" className="relative block h-3.5 w-5">
          <span className={`absolute inset-x-0 top-0 h-0.5 rounded-full bg-current transition-transform duration-200 motion-reduce:transition-none ${abierto ? "translate-y-[0.375rem] rotate-45" : ""}`} />
          <span className={`absolute inset-x-0 top-[0.375rem] h-0.5 rounded-full bg-current transition-opacity duration-200 motion-reduce:transition-none ${abierto ? "opacity-0" : ""}`} />
          <span className={`absolute inset-x-0 top-[0.75rem] h-0.5 rounded-full bg-current transition-transform duration-200 motion-reduce:transition-none ${abierto ? "-translate-y-[0.375rem] -rotate-45" : ""}`} />
        </span>
      </button>
      <div
        id="menu-movil"
        inert={!abierto}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-60 rounded-2xl border border-borde bg-fondo p-3 shadow-tarjeta transition duration-200 motion-reduce:transition-none ${abierto ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
