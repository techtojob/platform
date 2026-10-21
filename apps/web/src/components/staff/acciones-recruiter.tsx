"use client";

import type { EstadoRecruiter } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { accionRecruiter } from "@/app/[locale]/staff/recruiters/acciones";
import { AreaTexto } from "@/components/formulario/piezas";
import { Boton, Casilla } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

/**
 * Lo que el staff hace con un recruiter (se registran solos; lo que se revisa son sus ofertas):
 * marcarlo como agencia, bloquearlo con un motivo o desbloquearlo.
 */
export function AccionesRecruiter({ userId, estado, agencia }: { userId: string; estado: EstadoRecruiter; agencia: boolean }) {
  const t = useTranslations("staff.recruiters");
  const router = useRouter();
  const [bloqueando, empezarBloqueo] = useState(false);
  const [motivo, ponerMotivo] = useState("");
  const [error, ponerError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const hacer = (accion: Parameters<typeof accionRecruiter>[1]) =>
    empezar(async () => {
      ponerError(null);
      const codigo = await accionRecruiter(userId, accion);
      if (codigo) return ponerError(codigo);
      empezarBloqueo(false);
      ponerMotivo("");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3 border-t border-borde pt-4">
      {estado === "bloqueado" ? (
        <Boton type="button" variante="secundario" className="self-start" disabled={ocupado} onClick={() => hacer({ accion: "desbloquear" })}>
          {t("desbloquear")}
        </Boton>
      ) : bloqueando ? (
        <div className="flex flex-col gap-3">
          <AreaTexto
            etiqueta={t("motivoBloqueo")}
            ayuda={t("motivoAyuda")}
            rows={2}
            maxLength={300}
            value={motivo}
            onChange={(e) => ponerMotivo(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Boton type="button" variante="peligro" disabled={ocupado || motivo.trim().length < 3} onClick={() => hacer({ accion: "bloquear", motivo })}>
              {t("bloquear")}
            </Boton>
            <Boton type="button" variante="fantasma" disabled={ocupado} onClick={() => empezarBloqueo(false)}>
              {t("cancelar")}
            </Boton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Casilla
              etiqueta={t("esAgencia")}
              checked={agencia}
              disabled={ocupado}
              onChange={(e) => hacer({ accion: "agencia", agencia: e.target.checked })}
            />
            <p className="text-sm text-suave">{t(agencia ? "agenciaAyuda" : "noAgenciaAyuda")}</p>
          </div>
          <Boton type="button" variante="secundario" disabled={ocupado} onClick={() => empezarBloqueo(true)}>
            {t("bloquear")}
          </Boton>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t.has(`errores.${error}` as never) ? t(`errores.${error}` as never) : t("errores.desconocido")}
        </p>
      )}
    </div>
  );
}
