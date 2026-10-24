"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getPathname, usePathname } from "@/i18n/navigation";
import { COOKIE_IDIOMA, locales, nombresIdiomas, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useDesplegable } from "@/lib/use-desplegable";

/**
 * Cambia el idioma de la web y lleva a la misma página en el otro idioma
 * (/empleo/talento → /jobs/talent), con los mismos filtros. La elección se guarda y se respeta
 * en las siguientes visitas.
 *
 * Va directo a la página nueva (una sola carga): cada idioma tiene su propia raíz (<html lang>),
 * así que el router de Next acabaría recargando igualmente, después de pedir la página dos veces.
 *
 * - En el ordenador: un botón con el idioma que abre la lista.
 * - En el menú del móvil (`enLinea`): los idiomas uno al lado del otro.
 */
export function SelectorIdioma({ enLinea = false }: { enLinea?: boolean }) {
  return (
    <Suspense fallback={<Selector enLinea={enLinea} />}>
      <SelectorConDireccion enLinea={enLinea} />
    </Suspense>
  );
}

function SelectorConDireccion({ enLinea }: { enLinea: boolean }) {
  const pathname = usePathname();
  // Los parámetros de la página (el slug de una oferta…), sin el idioma.
  const params: Record<string, unknown> = { ...useParams() };
  delete params.locale;

  function cambiar(nuevo: Locale) {
    document.cookie = `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // @ts-expect-error -- `params` siempre corresponde a `pathname`.
    const destino = getPathname({ href: { pathname, params }, locale: nuevo });
    window.dispatchEvent(new Event("ttj:navegando"));
    // Carga completa a propósito: cada idioma tiene su propia raíz (ver arriba).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${destino}${window.location.search}`);
  }

  return <Selector enLinea={enLinea} onCambiar={cambiar} />;
}

function Selector({ enLinea, onCambiar }: { enLinea: boolean; onCambiar?: (l: Locale) => void }) {
  const t = useTranslations("selectorIdioma");
  const actual = useLocale() as Locale;
  const [yendo, setYendo] = useState<Locale | null>(null);
  const { abierto, setAbierto, raiz, boton } = useDesplegable();

  const elegir = (l: Locale) => {
    setAbierto(false);
    if (l === actual || !onCambiar) return;
    setYendo(l);
    onCambiar(l);
  };

  if (enLinea) {
    return (
      <div role="group" aria-label={t("etiqueta")} className="grid grid-cols-2 gap-1 rounded-full border border-borde p-1">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === actual}
            disabled={!onCambiar || !!yendo}
            onClick={() => elegir(l)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-bold transition-colors",
              l === actual ? "bg-acento text-ink" : "hover:bg-hover",
              yendo === l && "animate-pulse",
            )}
          >
            {nombresIdiomas[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={t("cambiar", { idioma: nombresIdiomas[actual] })}
        disabled={!onCambiar || !!yendo}
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors hover:bg-hover disabled:opacity-60"
      >
        {/* Un globo: se entiende sin leer */}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span className={cn(yendo && "animate-pulse")}>{(yendo ?? actual).toUpperCase()}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", abierto && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <ul role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 rounded-2xl border border-borde bg-fondo p-1.5 shadow-tarjeta">
          {locales.map((l) => (
            <li key={l} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l === actual}
                lang={l}
                onClick={() => elegir(l)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-hover"
              >
                {nombresIdiomas[l]}
                {l === actual && (
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-enlace">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
