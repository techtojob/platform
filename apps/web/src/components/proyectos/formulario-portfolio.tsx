"use client";

import { LIMITES_PORTFOLIO, type PortfolioListado } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { borrarPortfolio, guardarPortfolio } from "@/app/[locale]/cuenta/proyectos/acciones";
import { AreaTexto } from "@/components/formulario/piezas";
import { Boton, Campo, Casilla } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { IconoJuicio } from "./tarjeta-portfolio";

/**
 * Mi portfolio: la dirección, una frase y si quiero que lo revisemos en "Tu portfolio a juicio"
 * (el directo de los viernes). Se puede cambiar cuando se quiera.
 */
export function FormularioPortfolio({ actual, sugerencia }: { actual: PortfolioListado | null; sugerencia: string | null }) {
  const t = useTranslations("misProyectos.portfolio");
  const format = useFormatter();
  const router = useRouter();
  const [url, ponerUrl] = useState(actual?.url ?? sugerencia ?? "");
  const [descripcion, ponerDescripcion] = useState(actual?.descripcion ?? "");
  const [quiereJuicio, ponerQuiereJuicio] = useState(actual ? actual.juicio.estado !== "no" : false);
  const [errores, ponerErrores] = useState<Record<string, string>>({});
  const [aviso, ponerAviso] = useState<{ tono: "bien" | "mal"; texto: string } | null>(null);
  const [confirmando, ponerConfirmando] = useState(false);
  const [ocupado, empezar] = useTransition();
  const juicio = actual?.juicio;
  const fecha = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });

  function guardar() {
    ponerAviso(null);
    empezar(async () => {
      const r = await guardarPortfolio({ url, descripcion, quiereJuicio });
      ponerErrores(r.errores ?? {});
      if (r.error) ponerAviso({ tono: "mal", texto: t.has(`errores.${r.error}` as never) ? t(`errores.${r.error}` as never) : t("errores.desconocido") });
      if (r.ok) {
        ponerAviso({ tono: "bien", texto: actual ? t("guardado") : t("puesto") });
        router.refresh();
      }
    });
  }

  function borrar() {
    empezar(async () => {
      const e = await borrarPortfolio();
      if (e) return ponerAviso({ tono: "mal", texto: t("errores.desconocido") });
      ponerUrl("");
      ponerDescripcion("");
      ponerQuiereJuicio(false);
      ponerConfirmando(false);
      ponerAviso({ tono: "bien", texto: t("borrado") });
      router.refresh();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
      className="flex flex-col gap-4"
      aria-busy={ocupado}
    >
      <Campo
        etiqueta={t("url")}
        placeholder="tu-nombre.dev"
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
        value={url}
        onChange={(e) => ponerUrl(e.target.value)}
        error={errores.url ? t(`errores.url.${errores.url}` as never) : undefined}
        ayuda={t("urlAyuda")}
      />
      <AreaTexto
        etiqueta={t("descripcion")}
        ayuda={t("descripcionAyuda", { usados: descripcion.trim().length, max: LIMITES_PORTFOLIO.descripcion.max })}
        rows={2}
        maxLength={LIMITES_PORTFOLIO.descripcion.max}
        value={descripcion}
        onChange={(e) => ponerDescripcion(e.target.value)}
        error={errores.descripcion ? t("errores.descripcion") : undefined}
      />
      <div className="flex flex-col gap-2 rounded-2xl bg-postit p-4 text-ink">
        <p className="flex items-center gap-2 font-bold">
          <IconoJuicio />
          {t("juicio.titulo")}
        </p>
        {juicio?.estado === "revisado" ? (
          <p className="text-sm">
            {t("juicio.revisado", { fecha: fecha(juicio.revisadoEn) })}{" "}
            {juicio.video && (
              <a href={juicio.video} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                {t("juicio.verVideo")}
              </a>
            )}
          </p>
        ) : (
          <>
            <p className="text-sm text-ink/80">{t("juicio.texto")}</p>
            <Casilla
              etiqueta={t("juicio.quiero")}
              checked={quiereJuicio}
              onChange={(e) => ponerQuiereJuicio(e.target.checked)}
              className="[&>input]:accent-ink"
            />
            {juicio?.estado === "pedido" && <p className="text-sm font-bold">{t("juicio.pedido", { fecha: fecha(juicio.pedidoEn) })}</p>}
          </>
        )}
      </div>
      {aviso && (
        <p role={aviso.tono === "mal" ? "alert" : "status"} className={aviso.tono === "mal" ? "font-bold text-peligro" : "font-bold text-enlace"}>
          {aviso.texto}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={ocupado}>
          {actual ? t("guardar") : t("poner")}
        </Boton>
        {actual &&
          (confirmando ? (
            <>
              <Boton variante="peligro" disabled={ocupado} onClick={borrar}>
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
          ))}
      </div>
    </form>
  );
}
