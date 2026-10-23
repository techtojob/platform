"use client";

import type { Cuenta, FormaDeEntrar } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Boton, Etiqueta } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { authCliente } from "@/lib/auth-cliente";

export const NOMBRES: Record<FormaDeEntrar | "discord", string> = { google: "Google", github: "GitHub", discord: "Discord" };

/** Lo que pasó al volver de Google, GitHub o Discord (?vinculada=github o ?vincular=github&error=…). */
export type Retorno = { proveedor: FormaDeEntrar | "discord"; error: string | null } | null;

/**
 * Las direcciones de vuelta al vincular: a esta misma página, con el proveedor en la dirección
 * para poder decir qué ha pasado (Better Auth añade &error=… si algo falla).
 */
export function vueltas(proveedor: FormaDeEntrar | "discord") {
  const aqui = window.location.pathname;
  return { callbackURL: `${aqui}?vinculada=${proveedor}`, errorCallbackURL: `${aqui}?vincular=${proveedor}` };
}

/** Quita ?vinculada / ?vincular / ?error de la dirección, para que el aviso no vuelva al recargar. */
export function useLimpiarDireccion(retorno: Retorno) {
  useEffect(() => {
    if (retorno) window.history.replaceState(null, "", window.location.pathname);
  }, [retorno]);
}

/** Código de error de Better Auth al quitar una cuenta → clave del texto. */
export function errorAlQuitar(codigo: string | undefined) {
  if (codigo === "ultima_forma_de_entrar") return "errorUltima";
  if (codigo === "SESSION_NOT_FRESH") return "errorSesionAntigua";
  return "errorQuitar";
}

/** Código de error al volver de vincular → clave del texto. */
export function errorAlVincular(codigo: string) {
  if (codigo === "account_already_linked_to_different_user") return "errorDeOtraCuenta";
  if (codigo === "unable_to_link_account") return "errorEmailSinVerificar";
  if (codigo === "access_denied") return "errorCancelado";
  return "errorVincular";
}

/**
 * "Cómo entras" en Mi cuenta: Google y GitHub. Se vincula la que falte sin salir de la sesión
 * (y desde entonces se puede entrar con cualquiera). Se puede quitar una si quedan otras.
 */
export function FormasDeEntrar({ formas, retorno }: { formas: Cuenta["formasDeEntrar"]; retorno: Retorno }) {
  const t = useTranslations("cuenta.formas");
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(() => {
    if (!retorno || retorno.proveedor === "discord") return null;
    const proveedor = NOMBRES[retorno.proveedor];
    return retorno.error
      ? { tipo: "error", texto: t(errorAlVincular(retorno.error), { proveedor }) }
      : { tipo: "ok", texto: t("vinculadaOk", { proveedor }) };
  });
  useLimpiarDireccion(retorno);
  const vinculadas = formas.filter((f) => f.cuentaId).length;

  function vincular(proveedor: FormaDeEntrar) {
    setAviso(null);
    startTransition(async () => {
      const { error } = await authCliente.linkSocial({ provider: proveedor, ...vueltas(proveedor) });
      if (error) setAviso({ tipo: "error", texto: t(error.status === 429 ? "errorDemasiados" : "errorVincular", { proveedor: NOMBRES[proveedor] }) });
    });
  }

  function quitar(proveedor: FormaDeEntrar, cuentaId: string) {
    setAviso(null);
    startTransition(async () => {
      const { error } = await authCliente.unlinkAccount({ accountId: cuentaId });
      if (error) setAviso({ tipo: "error", texto: t(errorAlQuitar(error.code), { proveedor: NOMBRES[proveedor] }) });
      else {
        setAviso({ tipo: "ok", texto: t("quitadaOk", { proveedor: NOMBRES[proveedor] }) });
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pendiente}>
      <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde">
        {formas.map(({ proveedor, cuentaId }) => (
          <li key={proveedor} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-bold">{NOMBRES[proveedor]}</span>
              {cuentaId ? <Etiqueta tono="postit">{t("vinculada")}</Etiqueta> : <Etiqueta tono="borde">{t("sinVincular")}</Etiqueta>}
            </div>
            {cuentaId ? (
              // Con una sola no se ofrece quitarla (el API tampoco lo deja).
              vinculadas > 1 && (
                <button
                  type="button"
                  onClick={() => quitar(proveedor, cuentaId)}
                  disabled={pendiente}
                  className="min-h-11 text-sm font-semibold text-enlace hover:underline disabled:opacity-50"
                >
                  {t("quitar", { proveedor: NOMBRES[proveedor] })}
                </button>
              )
            ) : (
              <Boton variante="secundario" onClick={() => vincular(proveedor)} disabled={pendiente}>
                {t("vincular", { proveedor: NOMBRES[proveedor] })}
              </Boton>
            )}
          </li>
        ))}
      </ul>
      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`text-sm font-semibold ${aviso.tipo === "error" ? "text-peligro" : "text-enlace"}`}>
          {aviso.texto}
        </p>
      )}
      <p className="text-sm text-suave">{vinculadas > 1 ? t("ayudaDos") : t("ayudaUna")}</p>
    </div>
  );
}
