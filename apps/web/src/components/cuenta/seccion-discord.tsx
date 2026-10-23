"use client";

import type { Cuenta } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { comprobarDiscord } from "@/app/[locale]/cuenta/ajustes/acciones";
import { Boton, clasesBoton, Etiqueta } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { authCliente } from "@/lib/auth-cliente";
import { errorAlQuitar, errorAlVincular, NOMBRES, type Retorno, useLimpiarDireccion, vueltas } from "./formas-de-entrar";

/**
 * Discord en "Mi cuenta": vincular, ver si está en el servidor y volver a comprobarlo.
 * Discord no sirve para entrar; solo para saber si la persona es de la comunidad.
 */
/**
 * `ahora`: la hora del servidor, para "Comprobado hace 5 min" (así sale igual en el servidor y en el navegador).
 * `retorno`: si se acaba de volver de Discord con un error al vincular.
 */
export function SeccionDiscord({ discord, ahora, retorno }: { discord: Cuenta["discord"]; ahora: number; retorno: Retorno }) {
  const t = useTranslations("cuenta.discord");
  const tFormas = useTranslations("cuenta.formas");
  const format = useFormatter();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(() =>
    retorno?.proveedor === "discord" && retorno.error ? tFormas(errorAlVincular(retorno.error), { proveedor: NOMBRES.discord }) : null,
  );
  useLimpiarDireccion(retorno?.proveedor === "discord" ? retorno : null);

  function vincular() {
    setError(null);
    startTransition(async () => {
      // Vuelve a esta misma página, en este idioma (si falla, con el motivo).
      const { error } = await authCliente.linkSocial({ provider: "discord", ...vueltas("discord") });
      if (error) setError(t("errorVincular"));
    });
  }

  function desvincular() {
    setError(null);
    startTransition(async () => {
      if (!discord.cuentaId) return;
      const { error } = await authCliente.unlinkAccount({ accountId: discord.cuentaId });
      if (error) {
        const clave = errorAlQuitar(error.code);
        setError(clave === "errorSesionAntigua" ? tFormas(clave, { proveedor: NOMBRES.discord }) : t("errorDesvincular"));
      } else router.refresh();
    });
  }

  function comprobar() {
    setError(null);
    startTransition(async () => {
      const codigo = await comprobarDiscord();
      if (codigo) setError(codigo === "discord_no_responde" ? t("errorNoResponde") : t("errorComprobar"));
      router.refresh();
    });
  }

  if (!discord.disponible) return <p className="text-suave">{t("noDisponible")}</p>;

  if (!discord.vinculado) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-suave">{t("porQue")}</p>
        <Boton onClick={vincular} disabled={pendiente}>
          {t("vincular")}
        </Boton>
        {error && <p role="alert" className="text-sm font-semibold text-peligro">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pendiente}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold">{discord.nombre ? `@${discord.nombre}` : t("vinculado")}</span>
        {discord.enServidor ? <Etiqueta tono="postit">{t("miembro")}</Etiqueta> : <Etiqueta tono="borde">{t("noMiembro")}</Etiqueta>}
      </div>

      {discord.enServidor ? (
        <p className="text-suave">{t("enServidor")}</p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-suave">{t("fueraServidor")}</p>
          <div className="flex flex-wrap gap-2">
            {discord.invitacion && (
              <a href={discord.invitacion} target="_blank" rel="noopener noreferrer" className={clasesBoton()}>
                {t("unirme")}
              </a>
            )}
            <Boton variante="secundario" onClick={comprobar} disabled={pendiente}>
              {pendiente ? t("comprobando") : t("yaMeHeUnido")}
            </Boton>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm font-semibold text-peligro">{error}</p>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-suave">
        {discord.comprobadoEn && <span>{t("comprobado", { tiempo: format.relativeTime(new Date(discord.comprobadoEn), ahora) })}</span>}
        <button type="button" onClick={desvincular} disabled={pendiente} className="font-semibold text-enlace hover:underline">
          {t("desvincular")}
        </button>
      </div>
    </div>
  );
}
