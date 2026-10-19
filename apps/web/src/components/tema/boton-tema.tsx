"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { COOKIE_TEMA } from "./script-tema";

type Tema = "claro" | "oscuro";
const EVENTO = "ttj-tema";

/** El modo que se ve ahora: el elegido o, si no hay, el oscuro (el de la landing). */
function temaActual(): Tema {
  return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

/** Botón de la cabecera: cambia entre claro y oscuro y lo recuerda un año. */
export function BotonTema() {
  const t = useTranslations("tema");
  // En el servidor no se sabe el modo: null hasta que carga en el navegador.
  const tema = useSyncExternalStore(suscribir, temaActual, () => null);

  function cambiar() {
    const nuevo: Tema = temaActual() === "oscuro" ? "claro" : "oscuro";
    document.documentElement.dataset.tema = nuevo;
    document.cookie = `${COOKIE_TEMA}=${nuevo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={tema === "oscuro" ? t("aClaro") : tema === "claro" ? t("aOscuro") : t("cambiar")}
      className="grid size-11 shrink-0 place-items-center rounded-full text-texto transition-colors hover:bg-hover hover:text-enlace"
    >
      {tema === "oscuro" ? (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
        </svg>
      )}
    </button>
  );
}
