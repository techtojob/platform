"use client";

import type { Cuenta } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { comprobarDiscord } from "@/app/[locale]/cuenta/ajustes/acciones";
import { Boton, clasesBoton, Etiqueta } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { authCliente } from "@/lib/auth-cliente";

/**
 * Discord en "Mi cuenta": vincular, ver si está en el servidor y volver a comprobarlo.
 * Discord no sirve para entrar; solo para saber si la persona es de la comunidad.
 */
export function SeccionDiscord({ discord }: { discord: Cuenta["discord"] }) {
  const t = useTranslations("cuenta.discord");
  const format = useFormatter();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function vincular() {
    setError(null);
    startTransition(async () => {
      // callbackURL: volver a esta misma página, en este idioma.
      const { error } = await authCliente.linkSocial({ provider: "discord", callbackURL: window.location.pathname });
      if (error) setError(t("errorVincular"));
    });
  }

  function desvincular() {
    setError(null);
    startTransition(async () => {
      if (!discord.cuentaId) return;
      const { error } = await authCliente.unlinkAccount({ accountId: discord.cuentaId });
      if (error) setError(t("errorDesvincular"));
      else router.refresh();
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
        {discord.comprobadoEn && <span>{t("comprobado", { tiempo: format.relativeTime(new Date(discord.comprobadoEn)) })}</span>}
        <button type="button" onClick={desvincular} disabled={pendiente} className="font-semibold text-enlace hover:underline">
          {t("desvincular")}
        </button>
      </div>
    </div>
  );
}
