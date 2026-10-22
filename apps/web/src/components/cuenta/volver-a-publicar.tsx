"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { volverAPublicar } from "@/app/[locale]/cuenta/ofertas/acciones";
import { Boton } from "@/components/ui";

/** "Volver a publicar": copia una oferta caducada, retirada o no publicada como nueva (pendiente) y lleva a editarla. */
export function VolverAPublicar({ id }: { id: string }) {
  const t = useTranslations("misOfertas");
  const locale = useLocale();
  const [error, ponerError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Boton
        type="button"
        variante="secundario"
        className="self-start"
        disabled={ocupado}
        onClick={() =>
          empezar(async () => {
            const codigo = await volverAPublicar(id, locale);
            if (codigo) ponerError(codigo);
          })
        }
      >
        {ocupado ? t("copiando") : t("volverAPublicar")}
      </Boton>
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error === "limite" ? t("sinHueco") : t("errorRetirar")}
        </p>
      )}
    </div>
  );
}
