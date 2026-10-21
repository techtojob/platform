"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { borrarMiCuenta, descargarMisDatos } from "@/app/[locale]/cuenta/ajustes/acciones";
import { Boton, Campo } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/**
 * "Tus datos": descargar todo lo que guardamos y borrar la cuenta (derechos de acceso y supresión).
 * Para borrar hay que escribir el email de la cuenta, así no se borra sin querer.
 */
export function TusDatos({ email }: { email: string }) {
  const t = useTranslations("cuenta.datos");
  const locale = useLocale();
  const [descargando, empezarDescarga] = useTransition();
  const [borrando, empezarBorrado] = useTransition();
  const [abierto, abrir] = useState(false);
  const [confirmacion, ponerConfirmacion] = useState("");
  const [error, ponerError] = useState<string | null>(null);
  const coincide = confirmacion.trim().toLowerCase() === email.toLowerCase();

  function descargar() {
    ponerError(null);
    empezarDescarga(async () => {
      const r = await descargarMisDatos();
      if ("error" in r) return ponerError(t("errorDescargar"));
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
      enlace.download = "mis-datos-techtojob.json";
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    });
  }

  function borrar() {
    ponerError(null);
    empezarBorrado(async () => {
      // Si sale bien, el servidor lleva a la portada; si no, vuelve el código de error.
      const codigo = await borrarMiCuenta(confirmacion, locale);
      if (codigo) ponerError(codigo === "confirmacion" ? t("errorConfirmacion") : t("errorBorrar"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-suave">
        {t.rich("texto", { enlace: (texto) => <Link href="/privacidad" className="font-bold text-enlace underline">{texto}</Link> })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Boton variante="secundario" onClick={descargar} disabled={descargando}>
          {descargando ? t("descargando") : t("descargar")}
        </Boton>
        {!abierto && (
          <Boton variante="fantasma" className="text-peligro hover:bg-peligro/10" onClick={() => abrir(true)}>
            {t("borrar")}
          </Boton>
        )}
      </div>

      {abierto && (
        <div className="flex flex-col gap-4 rounded-2xl border border-peligro/60 p-4">
          <p className="font-bold">{t("borrarTitulo")}</p>
          <p className="text-sm text-suave">{t("borrarTexto")}</p>
          <Campo
            etiqueta={t("escribeEmail", { email })}
            type="email"
            autoComplete="off"
            value={confirmacion}
            onChange={(e) => ponerConfirmacion(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Boton variante="peligro" onClick={borrar} disabled={!coincide || borrando}>
              {borrando ? t("borrando") : t("borrarSi")}
            </Boton>
            <Boton variante="fantasma" onClick={() => { abrir(false); ponerConfirmacion(""); }}>
              {t("cancelar")}
            </Boton>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}
