"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Boton, type VarianteBoton } from "@/components/ui";

/** "Copiar enlace": copia la dirección de la página y avisa durante 2 segundos. */
export function CopiarEnlace({ variante = "secundario" }: { variante?: VarianteBoton }) {
  const t = useTranslations("ofertas");
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: no hacemos nada; la dirección sigue en la barra.
    }
  }

  return (
    <Boton variante={variante} className="w-full" onClick={copiar}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </svg>
      <span aria-live="polite">{copiado ? t("enlaceCopiado") : t("copiarEnlace")}</span>
    </Boton>
  );
}
