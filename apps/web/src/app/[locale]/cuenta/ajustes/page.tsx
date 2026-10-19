import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Avatar } from "@/components/cuenta/avatar";
import { CerrarSesion } from "@/components/cuenta/cerrar-sesion";
import { SeccionDiscord } from "@/components/cuenta/seccion-discord";
import { Etiqueta } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

const NOMBRES_PROVEEDOR: Record<string, string> = { google: "Google", github: "GitHub" };

/** Mi cuenta: quién eres, con qué entras, tu Discord y cerrar sesión. */
export default function PaginaAjustes() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
      <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-superficie" />}>
        <Contenido />
      </Suspense>
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
      <h1 className="text-titulo-2 font-bold">{t("titulo")}</h1>

      <section className="flex items-center gap-4 rounded-tarjeta border border-borde bg-superficie p-5">
        <Avatar nombre={usuario.nombre} imagen={usuario.imagen} grande />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-lg font-semibold">{usuario.nombre}</p>
          <p className="truncate text-suave">{usuario.email}</p>
        </div>
      </section>

      <section aria-labelledby="formas" className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-5">
        <h2 id="formas" className="text-titulo-3 font-semibold">
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
      </section>

      <section aria-labelledby="discord" className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-5">
        <h2 id="discord" className="text-titulo-3 font-semibold">
          Discord
        </h2>
        <SeccionDiscord discord={discord} />
      </section>

      <div>
        <CerrarSesion />
      </div>
    </div>
  );
}
