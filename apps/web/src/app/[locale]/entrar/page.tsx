import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { BotonesEntrar } from "@/components/cuenta/botones-entrar";
import { Portada } from "@/components/sitio/portada";
import { Aviso } from "@/components/ui";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

/** ?volver=… → a dónde ir después de entrar. */
const VOLVER: Record<string, "/cuenta/ofertas" | "/cuenta/ofertas/nueva" | "/cuenta/proyectos"> = {
  ofertas: "/cuenta/ofertas",
  publicar: "/cuenta/ofertas/nueva",
  proyectos: "/cuenta/proyectos",
};

/** Errores que puede devolver el inicio de sesión (?error=…) y su texto. */
const ERRORES = ["discord_solo_vincular", "account_not_linked", "access_denied"] as const;

/** Entrar: solo con Google o GitHub. */
export default function PaginaEntrar({ searchParams }: PageProps<"/[locale]/entrar">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("cuenta.entrar") }]}
        titulo={t("entrar.titulo")}
        entradilla={t("entrar.texto")}
        lado={
          <Aviso giro="rotate-[1.5deg]" className="w-[20rem] p-7">
            <p className="text-xl font-bold leading-tight tracking-tight">{t("entrar.privacidadTitulo")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{t("entrar.privacidad")}</p>
          </Aviso>
        }
      >
        <div className="mt-8 w-full max-w-md">
          <Suspense fallback={<div aria-busy="true" className="h-36 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </Portada>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/[locale]/entrar">, "searchParams">) {
  const [t, locale, cabeceras, { error, volver }] = await Promise.all([
    getTranslations("entrar"),
    getLocale(),
    headers(),
    searchParams,
  ]);
  // A dónde volver después de entrar: solo a sitios conocidos (nunca a una dirección que venga de fuera).
  const destino = VOLVER[typeof volver === "string" ? volver : ""] ?? "/cuenta/ajustes";
  // Si ya ha entrado, a donde iba.
  if (await obtenerCuenta(cabeceras.get("cookie")).catch(() => null)) {
    redirect({ href: destino, locale });
  }

  const codigo = typeof error === "string" ? error : undefined;
  const textoError = codigo ? (ERRORES.find((e) => e === codigo) ?? "otro") : null;

  return (
    <div className="flex flex-col gap-5">
      {textoError && (
        <Aviso role="alert" chincheta={false} giro="">
          <p className="font-bold">{t(`errores.${textoError}`)}</p>
        </Aviso>
      )}
      <BotonesEntrar
        volverA={getPathname({ href: destino, locale: locale as Locale })}
        siFalla={getPathname({ href: "/entrar", locale: locale as Locale })}
      />
      {/* Para no acabar con dos cuentas: se entra con la de siempre y la otra se vincula. */}
      <p className="text-sm text-suave">{t("yaTienesCuenta")}</p>
      <p className="text-sm text-suave lg:hidden">{t("privacidad")}</p>
      <p className="max-w-md text-sm text-suave">
        {t.rich("avisoPrivacidad", { enlace: (texto) => <Link href="/privacidad" className="font-bold text-enlace underline">{texto}</Link> })}
      </p>
    </div>
  );
}
