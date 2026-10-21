"use client";

import { adivinarPuesto, detectarIdiomaTexto, detectarIdiomasPedidos, detectarTecnologias, type OfertaRepetida } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { comprobarEnlace, importarDesdeEnlace } from "@/app/[locale]/staff/acciones";
import { Boton, Campo } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { aplicarImportada, type ValoresOferta } from "@/lib/formulario-oferta";
import { AreaTexto } from "@/components/formulario/piezas";

type Mensaje = { tono: "bien" | "regular" | "mal"; texto: string };

/**
 * Lo primero: el enlace de la oferta. Al pegarlo se avisa si ya está en la bolsa y,
 * con "Rellenar desde el enlace", se lee la página y se rellena lo que se pueda.
 * Si la página no se deja leer (LinkedIn), se puede pegar el texto de la oferta.
 */
export function PasoEnlace({
  valores,
  onCambio,
  ofertaId,
  error,
}: {
  valores: ValoresOferta;
  onCambio: (v: ValoresOferta) => void;
  /** Al editar: la propia oferta no cuenta como repetida, y no se ofrece rellenar. */
  ofertaId: string | null;
  error?: string;
}) {
  const t = useTranslations("staff.form");
  const [repetida, ponerRepetida] = useState<OfertaRepetida | null>(null);
  const [mensaje, ponerMensaje] = useState<Mensaje | null>(null);
  const [leyendo, empezar] = useTransition();
  const [textoPegado, pegar] = useState("");
  const [verPegar, mostrarPegar] = useState(false);
  const nombres = (campos: string[]) => campos.map((c) => t(`rellenado.${c}` as "rellenado.titulo")).join(", ");

  function comprobar(url: string) {
    if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) return ponerRepetida(null);
    comprobarEnlace(url, ofertaId).then(ponerRepetida);
  }

  function rellenar() {
    ponerMensaje(null);
    empezar(async () => {
      const r = await importarDesdeEnlace(valores.urlOriginal);
      if ("error" in r) return ponerMensaje({ tono: "mal", texto: t("importarError") });
      ponerRepetida(r.repetida);
      if (r.fuente === "nada") {
        mostrarPegar(true);
        return ponerMensaje({ tono: "mal", texto: t("importarNada") });
      }
      const { valores: nuevos, rellenados } = aplicarImportada(valores, r);
      onCambio(nuevos);
      ponerMensaje({
        tono: r.fuente === "datos" ? "bien" : "regular",
        texto: t(r.fuente === "datos" ? "importarDatos" : "importarPagina", { campos: nombres(rellenados) }),
      });
    });
  }

  /** Con el texto pegado: descripción, tecnologías, idiomas, área y nivel. */
  function usarTexto() {
    const texto = textoPegado.trim();
    if (!texto) return;
    const primeraLinea = texto.split("\n")[0]!.trim();
    const titulo = valores.titulo || (primeraLinea.length <= 120 ? primeraLinea : "");
    const puesto = adivinarPuesto(titulo);
    const idioma = detectarIdiomaTexto(texto);
    const pedidos = detectarIdiomasPedidos(texto);
    if (idioma && !pedidos.some((p) => p.idioma === idioma)) pedidos.unshift({ idioma, nivel: null });
    onCambio({
      ...valores,
      titulo,
      descripcion: valores.descripcion || texto,
      idioma: idioma ?? valores.idioma,
      area: valores.area || puesto.area || "",
      seniority: valores.seniority || puesto.seniority || "",
      tecnologias: [...new Set([...valores.tecnologias, ...detectarTecnologias(texto)])],
      pide: pedidos.length ? pedidos.map((p) => ({ idioma: p.idioma, nivel: p.nivel ?? "" })) : valores.pide,
    });
    pegar("");
    mostrarPegar(false);
    ponerMensaje({ tono: "bien", texto: t("textoUsado") });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Campo
          className="flex-1"
          type="url"
          etiqueta={t("urlOriginal")}
          ayuda={ofertaId ? t("urlOriginalAyuda") : t("urlOriginalAyudaNueva")}
          placeholder="https://"
          value={valores.urlOriginal}
          onChange={(e) => onCambio({ ...valores, urlOriginal: e.target.value })}
          onBlur={(e) => comprobar(e.target.value)}
          onPaste={(e) => comprobar(e.clipboardData.getData("text"))}
          error={error}
        />
        {!ofertaId && (
          <Boton
            type="button"
            variante="secundario"
            tamano="lg"
            className="sm:mt-7"
            onClick={rellenar}
            disabled={leyendo || !/^https?:\/\/\S+\.\S+/.test(valores.urlOriginal.trim())}
          >
            {leyendo ? t("leyendo") : t("rellenar")}
          </Boton>
        )}
      </div>

      {repetida && (
        <p role="alert" className="rounded-2xl bg-postit p-4 text-sm font-bold text-ink">
          {t("repetida", { titulo: repetida.titulo, empresa: repetida.empresa, estado: t(`estados.${repetida.estado}`) })}{" "}
          <Link href={{ pathname: "/staff/ofertas/[id]", params: { id: repetida.id } }} className="underline">
            {t("verRepetida")}
          </Link>
        </p>
      )}

      {mensaje && (
        <p
          role="status"
          className={
            mensaje.tono === "bien"
              ? "rounded-2xl border border-acento/60 p-4 text-sm font-bold"
              : mensaje.tono === "regular"
                ? "rounded-2xl border border-postit/60 p-4 text-sm font-bold"
                : "rounded-2xl border border-peligro/70 p-4 text-sm font-bold"
          }
        >
          {mensaje.texto}
        </p>
      )}

      {!ofertaId &&
        (verPegar ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-borde-fuerte p-4">
            <AreaTexto
              etiqueta={t("pegarTexto")}
              ayuda={t("pegarTextoAyuda")}
              rows={6}
              value={textoPegado}
              onChange={(e) => pegar(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Boton type="button" onClick={usarTexto} disabled={!textoPegado.trim()}>
                {t("usarTexto")}
              </Boton>
              <Boton type="button" variante="fantasma" onClick={() => mostrarPegar(false)}>
                {t("cancelar")}
              </Boton>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => mostrarPegar(true)} className="self-start text-sm font-bold text-enlace underline">
            {t("pegarTextoAbrir")}
          </button>
        ))}
    </div>
  );
}
