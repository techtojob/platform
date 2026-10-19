"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, nombresIdiomas, type Locale } from "@/i18n/routing";

/**
 * Cambia el idioma de la web y lleva a la misma página en el otro idioma
 * (/empleo/talento → /jobs/talent). La elección se guarda y se respeta en
 * las siguientes visitas.
 *
 * Necesita la dirección de la página, que en las páginas variables (una oferta)
 * solo se sabe al visitarla: mientras tanto se ve el mismo selector, quieto.
 */
export function SelectorIdioma() {
  return (
    <Suspense fallback={<Selector />}>
      <SelectorConDireccion />
    </Suspense>
  );
}

function SelectorConDireccion() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pendiente, startTransition] = useTransition();

  function cambiar(nuevo: Locale) {
    startTransition(() => {
      // @ts-expect-error -- `params` siempre corresponde a `pathname`.
      router.replace({ pathname, params }, { locale: nuevo });
    });
  }

  return <Selector onCambiar={cambiar} pendiente={pendiente} />;
}

function Selector({ onCambiar, pendiente = false }: { onCambiar?: (l: Locale) => void; pendiente?: boolean }) {
  const t = useTranslations("selectorIdioma");
  const locale = useLocale();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{t("etiqueta")}</span>
      <select
        value={locale}
        disabled={pendiente || !onCambiar}
        onChange={(e) => onCambiar?.(e.target.value as Locale)}
        className="h-11 rounded-control border border-borde-fuerte bg-superficie px-2 text-sm font-semibold text-texto sm:px-3"
      >
        {locales.map((l) => (
          // Solo el código para que quepa en el móvil; el nombre, para lectores de pantalla.
          <option key={l} value={l} aria-label={nombresIdiomas[l]}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
