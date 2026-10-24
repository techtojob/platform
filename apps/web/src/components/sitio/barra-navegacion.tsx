"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Barra fina arriba del todo mientras carga la página siguiente: al pulsar un enlace se ve al
 * momento que algo pasa (las fichas de ofertas, perfiles y proyectos no tienen pantalla de carga
 * porque tienen que poder dar un 404 de verdad). Se va al cambiar la dirección.
 */
export function BarraNavegacion() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}

function Barra() {
  // Dónde estaba al pulsar: en cuanto la dirección cambia (ha llegado la página nueva), ya no coincide y la barra se va.
  const aqui = `${usePathname()}?${useSearchParams().toString()}`;
  const [desde, setDesde] = useState<string | null>(null);
  // Al llegar a otra página se olvida (si no, al volver atrás a la de antes la barra reaparecería).
  const [anterior, setAnterior] = useState(aqui);
  if (anterior !== aqui) {
    setAnterior(aqui);
    setDesde(null);
  }
  const cargando = desde === aqui;

  const aquiAhora = useRef(aqui);
  useEffect(() => {
    aquiAhora.current = aqui;
  }, [aqui]);

  useEffect(() => {
    function alPulsar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const destino = new URL(a.href, window.location.href);
      const aqui = new URL(window.location.href);
      if (destino.origin !== aqui.origin) return;
      // Un ancla en la misma página no carga nada.
      if (destino.pathname === aqui.pathname && destino.search === aqui.search) return;
      setDesde(aquiAhora.current);
    }
    const alCambiarIdioma = () => setDesde(aquiAhora.current);
    document.addEventListener("click", alPulsar, true);
    window.addEventListener("ttj:navegando", alCambiarIdioma);
    return () => {
      document.removeEventListener("click", alPulsar, true);
      window.removeEventListener("ttj:navegando", alCambiarIdioma);
    };
  }, []);

  if (!cargando) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden">
      <div className="barra-navegacion h-full bg-acento" />
    </div>
  );
}
