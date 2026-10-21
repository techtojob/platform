import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FormularioUbicacion } from "@/components/cuenta/formulario-ubicacion";
import { Portada } from "@/components/sitio/portada";
import { Tarjeta } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Completar la cuenta: la primera vez que alguien entra, tiene que decir su país y su región.
 * Así se le enseñan las ofertas que puede hacer desde allí sin tener que ponerlo cada vez.
 */
export default function PaginaBienvenida() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("ubicacion.titulo") }]}
        titulo={t("ubicacion.titulo")}
        entradilla={t("ubicacion.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-xl">
          <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido() {
  const [locale, cabeceras] = await Promise.all([getLocale(), headers()]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie")).catch(() => null);
  if (!cuenta) redirect({ href: "/entrar", locale });
  // Si ya lo puso (por ejemplo, desde otro dispositivo), a las ofertas.
  if (cuenta!.ubicacion) redirect({ href: "/", locale });
  return (
    <Tarjeta className="p-6 sm:p-8">
      <FormularioUbicacion inicial={null} alGuardar="ofertas" />
    </Tarjeta>
  );
}
