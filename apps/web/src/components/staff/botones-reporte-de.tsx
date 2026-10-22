"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { resolverReporteDe } from "@/app/[locale]/staff/reportes/acciones";
import { AreaTexto } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/**
 * Reporte de oferta: descartar o cerrar la oferta. De proyecto: descartar u ocultarlo.
 * De recruiter: descartar o bloquearlo (con motivo).
 */
export function BotonesReporteDe({ id, de, bloqueado = false }: { id: string; de: "ofertas" | "recruiters" | "proyectos" | "portfolios"; bloqueado?: boolean }) {
  const t = useTranslations("staff.reportes");
  const router = useRouter();
  const [bloqueando, empezarBloqueo] = useState(false);
  const [motivo, ponerMotivo] = useState("");
  const [error, ponerError] = useState(false);
  const [ocupado, empezar] = useTransition();
  const hacer = (accion: Parameters<typeof resolverReporteDe>[1]) =>
    empezar(async () => {
      ponerError(false);
      if (await resolverReporteDe(id, accion)) return ponerError(true);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {bloqueando ? (
        <>
          <AreaTexto
            etiqueta={t("motivoBloqueo")}
            ayuda={t("motivoBloqueoAyuda")}
            rows={2}
            maxLength={300}
            value={motivo}
            onChange={(e) => ponerMotivo(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Boton type="button" variante="peligro" disabled={ocupado || motivo.trim().length < 3} onClick={() => hacer({ de: "recruiters", accion: "bloquear", motivo })}>
              {t("bloquear")}
            </Boton>
            <Boton type="button" variante="fantasma" disabled={ocupado} onClick={() => empezarBloqueo(false)}>
              {t("cancelar")}
            </Boton>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Boton type="button" variante="secundario" disabled={ocupado} onClick={() => hacer({ de, accion: "descartar" })}>
            {t("descartar")}
          </Boton>
          {de === "ofertas" ? (
            <Boton type="button" variante="peligro" disabled={ocupado} onClick={() => hacer({ de: "ofertas", accion: "cerrar" })}>
              {t("cerrarOferta")}
            </Boton>
          ) : de === "proyectos" || de === "portfolios" ? (
            !bloqueado && (
              <Boton type="button" variante="peligro" disabled={ocupado} onClick={() => hacer({ de, accion: "ocultar" })}>
                {de === "proyectos" ? t("ocultarProyecto") : t("ocultarPortfolio")}
              </Boton>
            )
          ) : (
            !bloqueado && (
              <Boton type="button" variante="peligro" disabled={ocupado} onClick={() => empezarBloqueo(true)}>
                {t("bloquear")}
              </Boton>
            )
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t("error")}
        </p>
      )}
    </div>
  );
}
