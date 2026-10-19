import type { Modalidad, PerfilListado } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";

/** "La Laguna, España · Remoto o híbrido". */
export function useLugarPerfil(p: Pick<PerfilListado, "ciudad" | "pais" | "modalidades">): string {
  const t = useTranslations();
  const locale = useLocale();
  const pais = p.pais ? new Intl.DisplayNames([locale], { type: "region" }).of(p.pais) : null;
  const sitio = [p.ciudad, pais].filter(Boolean).join(", ");
  const modos = p.modalidades.map((m: Modalidad, i) => {
    const texto = t(`modalidades.${m}`);
    return i === 0 ? texto : texto.toLocaleLowerCase(locale);
  });
  const modalidades = modos.length ? new Intl.ListFormat(locale, { type: "disjunction" }).format(modos) : "";
  return [sitio, modalidades].filter(Boolean).join(" · ");
}
