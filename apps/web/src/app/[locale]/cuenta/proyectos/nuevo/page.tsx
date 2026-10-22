import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { FormularioProyecto } from "@/components/proyectos/formulario-proyecto";
import { Portada } from "@/components/sitio/portada";
import { redirect } from "@/i18n/navigation";
import { obtenerCuenta, obtenerMiPerfil } from "@/lib/api";
import { PROYECTO_VACIO } from "@/lib/formulario-proyecto";

export const metadata: Metadata = { robots: { index: false } };

/** Subir un proyecto. */
export default function PaginaNuevoProyecto() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("misProyectos.titulo"), href: "/cuenta/proyectos" }, { texto: t("misProyectos.nuevo") }]}
        titulo={t("misProyectos.nuevo")}
        entradilla={t("misProyectos.nuevoEntradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[72rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario() {
  const [locale, cabeceras] = await Promise.all([getLocale(), headers()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: "/entrar", locale });
  const { perfil } = await obtenerMiPerfil(cookie!);
  // Sin perfil o sin verificar: la lista de "Mis proyectos" explica qué falta.
  if (!perfil || !(cuenta!.discord.vinculado && cuenta!.discord.enServidor)) redirect({ href: "/cuenta/proyectos", locale });
  return <FormularioProyecto inicial={{ ...PROYECTO_VACIO, area: perfil!.area }} />;
}
