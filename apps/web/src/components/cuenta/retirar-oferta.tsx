"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { retirarOferta } from "@/app/[locale]/cuenta/ofertas/acciones";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/** Quitar una oferta propia: se pide confirmar en el mismo sitio (sin ventanas del navegador). */
export function RetirarOferta({ id, publicada }: { id: string; publicada: boolean }) {
  const t = useTranslations("misOfertas");
  const router = useRouter();
  const [seguro, confirmar] = useState(false);
  const [error, ponerError] = useState(false);
  const [ocupado, empezar] = useTransition();

  if (!seguro) {
    return (
      <Boton type="button" variante="fantasma" className="self-start" onClick={() => confirmar(true)}>
        {t("retirar")}
      </Boton>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-borde p-3">
      <p className="text-sm font-bold">{publicada ? t("retirarPublicada") : t("retirarPendiente")}</p>
      <div className="flex flex-wrap gap-2">
        <Boton
          type="button"
          disabled={ocupado}
          onClick={() =>
            empezar(async () => {
              const codigo = await retirarOferta(id);
              if (codigo) return ponerError(true);
              // Sin "?enviada=1": el aviso de "oferta enviada" ya no toca.
              router.replace("/cuenta/ofertas");
              router.refresh();
            })
          }
        >
          {ocupado ? t("retirando") : t("siRetirar")}
        </Boton>
        <Boton type="button" variante="fantasma" disabled={ocupado} onClick={() => confirmar(false)}>
          {t("cancelar")}
        </Boton>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t("errorRetirar")}
        </p>
      )}
    </div>
  );
}
