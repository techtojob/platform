"use client";

import { PAISES } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import { clasesControl } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { COOKIE_DESDE, TODOS } from "@/lib/pais-usuario";

/** Guarda el país (o "todos") en una cookie (un año) para que el servidor filtre las ofertas. */
function guardarPais(valor: string) {
  document.cookie = `${COOKIE_DESDE}=${valor}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** "Trabajo desde: España  [Cambiar]": solo salen las ofertas que se pueden hacer desde ese país. */
export function TrabajoDesde({ actual }: { actual: string | null }) {
  const t = useTranslations("ofertas");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [abierto, abrir] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const paises = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    return PAISES.map((c) => ({ codigo: c, nombre: nombres.of(c) ?? c })).sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  }, [locale]);
  const nombre = actual ? (paises.find((p) => p.codigo === actual)?.nombre ?? actual) : null;

  function elegir(valor: string) {
    guardarPais(valor);
    abrir(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-x-2 text-suave">
        <span>{t("trabajoDesde")}</span>
        <strong className="font-semibold text-texto">{nombre ?? t("cualquierPais")}</strong>
        <Boton variante="fantasma" className="min-h-9 px-2" aria-expanded={abierto} aria-controls={id} onClick={() => abrir((a) => !a)} disabled={pendiente}>
          {t("cambiarPais")}
        </Boton>
      </p>
      {abierto && (
        <div id={id} className="flex flex-col gap-3 rounded-tarjeta border border-borde p-5">
          <label htmlFor={`${id}-pais`} className="font-bold">
            {t("elegirPais")}
          </label>
          <p className="text-sm text-suave">{t("ayudaPais")}</p>
          <select
            id={`${id}-pais`}
            defaultValue={actual ?? TODOS}
            onChange={(e) => elegir(e.target.value)}
            disabled={pendiente}
            className={cn(clasesControl, "min-h-12 rounded-control px-5 sm:max-w-sm")}
          >
            <option value={TODOS}>{t("todosLosPaises")}</option>
            {paises.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Botón del aviso "Hay 12 ofertas más que no se pueden hacer desde México": deja de filtrar por país. */
export function VerTodosLosPaises({ texto }: { texto: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <Boton
      variante="sobrePostit"
      disabled={pendiente}
      onClick={() => {
        guardarPais(TODOS);
        startTransition(() => router.refresh());
      }}
    >
      {texto}
    </Boton>
  );
}
