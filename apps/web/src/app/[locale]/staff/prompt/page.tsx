import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { CopiarTexto } from "@/components/staff/copiar-texto";
import { Tarjeta } from "@/components/ui";
import { exigirStaff } from "@/lib/api-staff";
import { PROMPT_RESUMEN } from "@/lib/prompt-ia";

/** El prompt para resumir ofertas con una IA: cómo se usa y un botón para copiarlo. */
export default function PaginaPrompt() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.prompt.pestana") }]}
        titulo={t("staff.prompt.titulo")}
        entradilla={t("staff.prompt.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido() {
  await exigirStaff();
  return <Prompt />;
}

function Prompt() {
  const t = useTranslations("staff.prompt");
  return (
    <div className="flex flex-col gap-6">
      <Tarjeta className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="text-titulo-3 font-bold">{t("comoTitulo")}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>{t("paso1")}</li>
          <li>{t("paso2")}</li>
          <li>{t("paso3")}</li>
          <li>{t("paso4")}</li>
        </ol>
        <p className="text-sm text-suave">{t("consejo")}</p>
        <p className="text-sm text-suave">{t("desdeLaFicha")}</p>
        <CopiarTexto texto={PROMPT_RESUMEN} etiqueta={t("copiar")} className="self-start" />
      </Tarjeta>
      <details className="group rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta">
        <summary className="cursor-pointer list-none font-bold">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
            ▸
          </span>
          {t("ver")}
        </summary>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-suave">{PROMPT_RESUMEN}</pre>
      </details>
    </div>
  );
}
