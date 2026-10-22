"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { borrarProyecto, fijarProyecto } from "@/app/[locale]/cuenta/proyectos/acciones";
import { Boton, clasesBoton } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";

/** Editar, fijar en el perfil (máximo 3) y borrar (con un segundo clic para confirmar). */
export function AccionesMiProyecto({ id, fijado, puedeFijar }: { id: string; fijado: boolean; puedeFijar: boolean }) {
  const t = useTranslations("misProyectos");
  const router = useRouter();
  const [confirmando, ponerConfirmando] = useState(false);
  const [error, ponerError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const hacer = (accion: () => Promise<string | null>) =>
    empezar(async () => {
      ponerError(null);
      const e = await accion();
      if (e) ponerError(e);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link href={{ pathname: "/cuenta/proyectos/[id]/editar", params: { id } }} className={clasesBoton({ variante: "secundario" })}>
          {t("editar")}
        </Link>
        {(fijado || puedeFijar) && (
          <Boton variante="secundario" disabled={ocupado} aria-pressed={fijado} onClick={() => hacer(() => fijarProyecto(id, !fijado))}>
            {fijado ? t("desfijar") : t("fijar")}
          </Boton>
        )}
        {confirmando ? (
          <>
            <Boton variante="peligro" disabled={ocupado} onClick={() => hacer(() => borrarProyecto(id))}>
              {t("borrarSeguro")}
            </Boton>
            <Boton variante="fantasma" disabled={ocupado} onClick={() => ponerConfirmando(false)}>
              {t("cancelar")}
            </Boton>
          </>
        ) : (
          <Boton variante="fantasma" disabled={ocupado} onClick={() => ponerConfirmando(true)}>
            {t("borrar")}
          </Boton>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t.has(`errores.${error}` as never) ? t(`errores.${error}` as never) : t("errores.desconocido")}
        </p>
      )}
    </div>
  );
}
