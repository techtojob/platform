"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { resolverReporte } from "@/app/[locale]/staff/reportes/acciones";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/** Descartar el reporte u ocultar el perfil. */
export function BotonesReporte({ id }: { id: string }) {
  const t = useTranslations("staff.reportes");
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const hacer = (accion: "descartar" | "ocultar") =>
    empezar(async () => {
      await resolverReporte(id, accion);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Boton type="button" variante="secundario" disabled={ocupado} onClick={() => hacer("descartar")}>
        {t("descartar")}
      </Boton>
      <Boton type="button" variante="peligro" disabled={ocupado} onClick={() => hacer("ocultar")}>
        {t("ocultar")}
      </Boton>
    </div>
  );
}
