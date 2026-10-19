import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Avatar } from "@/components/cuenta/avatar";
import { CerrarSesion } from "@/components/cuenta/cerrar-sesion";
import { SeccionDiscord } from "@/components/cuenta/seccion-discord";
import { Portada } from "@/components/sitio/portada";
import { Etiqueta, Tarjeta, Ventana } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

const NOMBRES_PROVEEDOR: Record<string, string> = { google: "Google", github: "GitHub" };

/** Mi cuenta: quién eres, con qué entras, tu Discord y cerrar sesión. */
export default function PaginaAjustes() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("cuenta.titulo") }]} titulo={t("cuenta.titulo")} compacta />
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
  const [t, locale, cabeceras] = await Promise.all([getTranslations("cuenta"), getLocale(), headers()]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie"));
  if (!cuenta) redirect({ href: "/entrar", locale });
  const { usuario, proveedores, discord } = cuenta!;
  const formasDeEntrar = proveedores.filter((p) => p in NOMBRES_PROVEEDOR);

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta className="flex items-center gap-4 p-5">
        <Avatar nombre={usuario.nombre} imagen={usuario.imagen} grande />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-lg font-bold">{usuario.nombre}</p>
          <p className="truncate text-suave">{usuario.email}</p>
        </div>
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-titulo-3 font-bold">
          {t("formasDeEntrar")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {formasDeEntrar.map((p) => (
            <Etiqueta key={p} tono="borde">
              {NOMBRES_PROVEEDOR[p]}
            </Etiqueta>
          ))}
        </div>
        <p className="text-sm text-suave">{t("mismoEmail")}</p>
      </Tarjeta>

      {/* Discord, en su ventana tipo Discord */}
      <Ventana canal="discord" aria-label="Discord">
        <div className="rounded-xl bg-tarjeta/60 p-4 sm:p-5">
          <SeccionDiscord discord={discord} />
        </div>
      </Ventana>

      <div>
        <CerrarSesion />
      </div>
    </div>
  );
}
