"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, nombresIdiomas, type Locale } from "@/i18n/routing";

/**
 * Cambia el idioma de la web y lleva a la misma página en el otro idioma
 * (/empleo/talento → /jobs/talent). La elección se guarda y se respeta en
 * las siguientes visitas.
 */
export function SelectorIdioma() {
  const t = useTranslations("selectorIdioma");
  const locale = useLocale();
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

  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{t("etiqueta")}</span>
      <select
        value={locale}
        disabled={pendiente}
        onChange={(e) => cambiar(e.target.value as Locale)}
        className="min-h-11 rounded-full border border-white/20 bg-ink px-4 text-white"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()} · {nombresIdiomas[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
