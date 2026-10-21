"use client";

import { IDIOMAS, type Idioma } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui";
import { COOKIE_HABLO, nombreIdioma } from "@/lib/idiomas-usuario";

/** Guarda los idiomas en una cookie (un año) para que el servidor filtre las ofertas. */
export function guardarIdiomas(idiomas: Idioma[]) {
  document.cookie = `${COOKIE_HABLO}=${idiomas.join(",")}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** "Hablo: Español · Inglés  [Cambiar]", con un panel para elegir idiomas. */
export function IdiomasQueHablo({ actuales }: { actuales: Idioma[] }) {
  const t = useTranslations("ofertas");
  const locale = useLocale();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [elegidos, setElegidos] = useState<Idioma[]>(actuales);
  const [pendiente, startTransition] = useTransition();

  // Los que ya habla, primero; después el resto por orden alfabético en el idioma de la web.
  const opciones = [
    ...actuales,
    ...IDIOMAS.filter((i) => !actuales.includes(i)).sort((a, b) =>
      nombreIdioma(a, locale).localeCompare(nombreIdioma(b, locale), locale),
    ),
  ];

  function guardar() {
    if (!elegidos.length) return;
    guardarIdiomas(elegidos);
    setAbierto(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-x-2 text-suave">
        <span>{t("hablo")}</span>
        <strong className="font-semibold text-texto">{actuales.map((i) => nombreIdioma(i, locale)).join(" · ")}</strong>
        <Boton
          variante="fantasma"
          className="min-h-9 px-2"
          aria-expanded={abierto}
          aria-controls="panel-idiomas"
          onClick={() => {
            setElegidos(actuales);
            setAbierto((a) => !a);
          }}
          disabled={pendiente}
        >
          {t("cambiarIdiomas")}
        </Boton>
      </p>

      {abierto && (
        <fieldset id="panel-idiomas" className="flex flex-col gap-4 rounded-tarjeta border border-borde p-5">
          <legend className="px-1 font-bold">{t("elegirIdiomas")}</legend>
          <p className="text-sm text-suave">{t("ayudaIdiomas")}</p>
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
            {opciones.map((i) => (
              <label key={i} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-[#2a7371]"
                  checked={elegidos.includes(i)}
                  onChange={(e) =>
                    setElegidos((lista) => (e.target.checked ? [...lista, i] : lista.filter((x) => x !== i)))
                  }
                />
                {nombreIdioma(i, locale)}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Boton onClick={guardar} disabled={!elegidos.length || pendiente}>
              {t("guardar")}
            </Boton>
            <Boton variante="secundario" onClick={() => setAbierto(false)}>
              {t("cancelar")}
            </Boton>
          </div>
        </fieldset>
      )}
    </div>
  );
}

/** Botón del aviso "Hay 3 ofertas más que piden inglés": añade ese idioma. */
export function AnadirIdioma({ actuales, idioma, texto }: { actuales: Idioma[]; idioma: Idioma; texto: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <Boton
      variante="sobrePostit"
      disabled={pendiente}
      onClick={() => {
        guardarIdiomas([...actuales, idioma]);
        startTransition(() => router.refresh());
      }}
    >
      {texto}
    </Boton>
  );
}
