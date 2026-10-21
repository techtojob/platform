import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { FormularioPerfil } from "@/components/talento/formulario-perfil";
import { getPathname, redirect } from "@/i18n/navigation";
import { obtenerCuenta, obtenerMiPerfil } from "@/lib/api";
import { valoresIniciales } from "@/lib/formulario-perfil";
import { LANDING_URL } from "@/lib/sitio";

export const metadata: Metadata = { robots: { index: false } };

/** Mi perfil de talento: crearlo o editarlo. */
export default function PaginaMiPerfil() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("cuenta.titulo"), href: "/cuenta/ajustes" }, { texto: t("miPerfil.titulo") }]}
        titulo={t("miPerfil.titulo")}
        entradilla={t("miPerfil.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario() {
  const [locale, cabeceras] = await Promise.all([getLocale(), headers(), getTranslations()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie);
  if (!cuenta || !cookie) redirect({ href: "/entrar", locale });
  const mio = await obtenerMiPerfil(cookie!);
  // "techtojob.com/empleo/talento" (sin el alias), para enseñar cómo queda la dirección.
  const dominio = `${new URL(LANDING_URL).host}${getPathname({ href: "/talento", locale })}`;
  return (
    <FormularioPerfil
      inicial={valoresIniciales(mio, locale)}
      guardado={mio.perfil ? { alias: mio.perfil.alias, actualizadoEn: mio.perfil.actualizadoEn } : null}
      imagenCuenta={cuenta!.usuario.imagen}
      verificado={cuenta!.discord.vinculado && cuenta!.discord.enServidor}
      dominio={dominio}
    />
  );
}
