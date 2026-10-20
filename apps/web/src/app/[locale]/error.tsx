"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Boton, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Si algo se rompe al pintar una página: un mensaje claro y la opción de reintentar, sin perder la cabecera. */
export default function ErrorDePagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPagina");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-5 px-6 py-24">
      <p className="font-bold text-peligro">{t("etiqueta")}</p>
      <h1 className="text-titulo-1 font-bold">{t("titulo")}</h1>
      <p className="text-lg text-suave">{t("texto")}</p>
      <div className="flex flex-wrap gap-3">
        <Boton tamano="lg" onClick={reset}>
          {t("reintentar")}
        </Boton>
        <Link href="/" className={clasesBoton({ variante: "secundario", tamano: "lg" })}>
          {t("volver")}
        </Link>
      </div>
    </main>
  );
}
