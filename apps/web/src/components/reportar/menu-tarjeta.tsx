"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { CosaReportable } from "@/app/[locale]/acciones-reportar";
import { cn } from "@/lib/cn";
import { IconoBandera, Reportar } from "./reportar";

type Props = {
  /** Dirección de lo que enseña la tarjeta ("/empleo/proyectos/…"), para "Copiar enlace". */
  enlace: string;
  /** Lo que se puede reportar desde aquí (nada si es tuyo). */
  cosas: Array<CosaReportable & { nombre?: string }>;
  conSesion?: boolean;
  className?: string;
};

/**
 * El botón "⋯" de las tarjetas (ofertas, perfiles, proyectos y portfolios): copiar el enlace y reportar,
 * sin tener que entrar en la ficha. Va por encima del enlace que ocupa toda la tarjeta.
 */
export function MenuTarjeta({ enlace, cosas, conSesion, className }: Props) {
  const t = useTranslations("reportar.menu");
  const id = useId();
  const [abierto, abrir] = useState(false);
  const [copiado, ponerCopiado] = useState(false);
  const [reportando, ponerReportando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && abrir(false);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        abrir(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(new URL(enlace, window.location.origin).toString());
      ponerCopiado(true);
      setTimeout(() => {
        ponerCopiado(false);
        abrir(false);
      }, 1200);
    } catch {
      abrir(false);
    }
  }

  const opcion = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-hover";
  return (
    <div ref={caja} className={cn("relative z-10", className)}>
      <button
        ref={boton}
        type="button"
        aria-label={t("abrir")}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={`${id}-menu`}
        onClick={() => abrir((a) => !a)}
        className="flex size-10 items-center justify-center rounded-full bg-fondo/80 text-texto shadow-tarjeta backdrop-blur transition-colors hover:bg-fondo"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {abierto && (
        <div id={`${id}-menu`} role="menu" className="absolute right-0 top-12 w-56 rounded-2xl border border-borde bg-ventana p-1.5 shadow-tarjeta">
          <button type="button" role="menuitem" onClick={copiar} className={opcion}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
            </svg>
            <span aria-live="polite">{copiado ? t("copiado") : t("copiar")}</span>
          </button>
          {cosas.length > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                ponerReportando(true);
                abrir(false);
              }}
              className={cn(opcion, "text-peligro")}
            >
              <IconoBandera />
              {t("reportar")}
            </button>
          )}
        </div>
      )}
      {cosas.length > 0 && <Reportar cosas={cosas} conSesion={conSesion} abierto={reportando} onCerrar={() => ponerReportando(false)} />}
    </div>
  );
}
