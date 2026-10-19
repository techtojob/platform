import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { BotonesEntrar } from "@/components/cuenta/botones-entrar";
import { Aviso } from "@/components/ui";
import { getPathname, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

/** Errores que puede devolver el inicio de sesión (?error=…) y su texto. */
const ERRORES = ["discord_solo_vincular", "account_not_linked", "access_denied"] as const;

/** Entrar: solo con Google o GitHub. */
export default function PaginaEntrar({ searchParams }: PageProps<"/[locale]/entrar">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-12 sm:py-20">
      <Suspense fallback={<div aria-busy="true" className="h-72 animate-pulse rounded-tarjeta bg-superficie" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/[locale]/entrar">, "searchParams">) {
  const [t, locale, cabeceras, { error }] = await Promise.all([
    getTranslations("entrar"),
    getLocale(),
    headers(),
    searchParams,
  ]);
  // Si ya ha entrado, a su cuenta.
  if (await obtenerCuenta(cabeceras.get("cookie")).catch(() => null)) {
    redirect({ href: "/cuenta/ajustes", locale });
  }

  const codigo = typeof error === "string" ? error : undefined;
  const textoError = codigo ? (ERRORES.find((e) => e === codigo) ?? "otro") : null;

  return (
    <div className="flex flex-col gap-6 rounded-tarjeta border border-borde bg-superficie p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-titulo-2 font-bold">{t("titulo")}</h1>
        <p className="text-suave">{t("texto")}</p>
      </div>
      {textoError && (
        <Aviso role="alert">
          <p className="font-semibold">{t(`errores.${textoError}`)}</p>
        </Aviso>
      )}
      <BotonesEntrar
        volverA={getPathname({ href: "/cuenta/ajustes", locale: locale as Locale })}
        siFalla={getPathname({ href: "/entrar", locale: locale as Locale })}
      />
      <p className="text-sm text-suave">{t("privacidad")}</p>
    </div>
  );
}
