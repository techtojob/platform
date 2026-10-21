"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Boton, type VarianteBoton } from "@/components/ui";

/** Copia un texto (el prompt para la IA) y avisa durante 2 segundos. */
export function CopiarTexto({
  texto,
  etiqueta,
  variante = "primario",
  className,
}: {
  texto: string;
  etiqueta: string;
  variante?: VarianteBoton;
  className?: string;
}) {
  const t = useTranslations("staff.prompt");
  const [estado, ponerEstado] = useState<"listo" | "copiado" | "error">("listo");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      ponerEstado("copiado");
    } catch {
      ponerEstado("error");
    }
    setTimeout(() => ponerEstado("listo"), 2500);
  }

  return (
    <Boton type="button" variante={variante} className={className} onClick={copiar}>
      <span aria-live="polite">{estado === "copiado" ? t("copiado") : estado === "error" ? t("noCopiado") : etiqueta}</span>
    </Boton>
  );
}
