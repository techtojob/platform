import { MODALIDADES, SENIORITY } from "@techtojob/shared";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { ChipsDemo } from "@/components/catalogo/chips-demo";
import { Boton, Campo, Etiqueta, Tarjeta } from "@/components/ui";
import type { Locale } from "@/i18n/routing";

// Catálogo interno: no aparece en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-borde pt-8">
      <h2 className="text-titulo-3 font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

export default function Componentes({ params }: PageProps<"/[locale]/componentes">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-titulo-1 font-bold">{t("componentes.titulo")}</h1>
        <p className="max-w-[60ch] text-lg text-suave">{t("componentes.descripcion")}</p>
      </header>

      <Seccion titulo={t("componentes.botones")}>
        <div className="flex flex-wrap items-center gap-3">
          <Boton>{t("componentes.primario")}</Boton>
          <Boton variante="secundario">{t("componentes.secundario")}</Boton>
          <Boton variante="fantasma">{t("componentes.fantasma")}</Boton>
          <Boton variante="peligro">{t("componentes.peligro")}</Boton>
          <Boton disabled>{t("componentes.desactivado")}</Boton>
          <Boton tamano="lg">{t("componentes.grande")}</Boton>
        </div>
      </Seccion>

      <Seccion titulo={t("componentes.etiquetas")}>
        <div className="flex flex-wrap gap-2">
          <Etiqueta tono="postit">{t("seniority.junior")}</Etiqueta>
          <Etiqueta>{t("modalidades.remoto")}</Etiqueta>
          <Etiqueta tono="borde">Python</Etiqueta>
          <Etiqueta tono="borde">React</Etiqueta>
        </div>
      </Seccion>

      <Seccion titulo={t("componentes.chips")}>
        <ChipsDemo
          opciones={[
            ...SENIORITY.map((id) => ({ id, nombre: t(`seniority.${id}`) })),
            ...MODALIDADES.map((id) => ({ id, nombre: t(`modalidades.${id}`) })),
          ]}
        />
      </Seccion>

      <Seccion titulo={t("componentes.campos")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Campo etiqueta={t("componentes.campoNombre")} ayuda={t("componentes.campoNombreAyuda")} defaultValue="Lucía M." />
          <Campo etiqueta={t("componentes.campoGithub")} error={t("componentes.campoGithubError")} defaultValue="gitlab.com/lucia" />
        </div>
      </Seccion>

      <Seccion titulo={t("componentes.tarjeta")}>
        <Tarjeta>
          <p className="text-texto">{t("componentes.tarjetaTexto")}</p>
        </Tarjeta>
      </Seccion>
    </main>
  );
}
