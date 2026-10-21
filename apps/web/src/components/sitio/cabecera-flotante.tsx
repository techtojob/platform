"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * La cabecera de la landing: pegada arriba y, al bajar, se convierte en una píldora flotante.
 * (Copiada de techtojob/landing, components/header-shell.tsx, con los colores de la bolsa.)
 */
export function CabeceraFlotante({ children }: { children: ReactNode }) {
  const [bajado, setBajado] = useState(false);

  useEffect(() => {
    const alBajar = () => setBajado(window.scrollY > 8);
    alBajar();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => window.removeEventListener("scroll", alBajar);
  }, []);

  return (
    <div
      data-bajado={bajado || undefined}
      className="group h-[4.25rem] w-full transition-[padding] duration-300 motion-reduce:transition-none data-[bajado]:pt-3 min-[50rem]:h-[5.25rem] min-[50rem]:data-[bajado]:pt-4"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-b-[32px] border border-x-borde border-b-borde border-t-transparent bg-fondo/70 shadow-[0_10px_36px_rgb(0_0_0/0.25)] backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none group-data-[bajado]:rounded-full group-data-[bajado]:border-t-borde group-data-[bajado]:bg-fondo/85"
        />
        <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2 pl-4 pr-2 min-[50rem]:gap-x-8 min-[50rem]:py-2.5 min-[50rem]:pl-5 min-[50rem]:pr-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}
