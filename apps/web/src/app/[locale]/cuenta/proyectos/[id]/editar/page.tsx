import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioProyecto } from "@/components/proyectos/formulario-proyecto";
import { Portada } from "@/components/sitio/portada";
import { redirect } from "@/i18n/navigation";
import { misProyectosEnApi, obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

type Props = PageProps<"/[locale]/cuenta/proyectos/[id]/editar">;

/** Editar uno de mis proyectos. */
export default function PaginaEditarProyecto({ params }: Props) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("misProyectos.titulo"), href: "/cuenta/proyectos" }, { texto: t("misProyectos.editarTitulo") }]}
        titulo={t("misProyectos.editarTitulo")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[72rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario params={params} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario({ params }: Pick<Props, "params">) {
  const [{ id }, locale, cabeceras] = await Promise.all([params, getLocale(), headers()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: "/entrar", locale });
  const p = (await misProyectosEnApi(cookie!)).find((x) => x.id === id);
  if (!p) notFound();
  return (
    <FormularioProyecto
      id={p.id}
      inicial={{ titulo: p.titulo, descripcion: p.descripcion, area: p.area, tecnologias: p.tecnologias, repo: p.repo ?? "", demo: p.demo ?? "", video: p.video ?? "", estado: p.estado }}
    />
  );
}
