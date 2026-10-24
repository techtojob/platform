import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/cabecera";
import { BarraNavegacion } from "@/components/sitio/barra-navegacion";
import { Pie } from "@/components/sitio/pie";
import { routing } from "@/i18n/routing";
import { IMAGEN_COMPARTIR } from "@/lib/metadatos";
import { LANDING_URL } from "@/lib/sitio";
import "../globals.css";

// Tipografías alojadas en el propio proyecto (paquetes @fontsource-variable/…):
// no dependen de Google Fonts ni envían datos a terceros.
// Sora, la de la marca, en todo (como la landing).
const sora = localFont({
  src: "../../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
});

/** Una versión de cada página por idioma, generada al compilar. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });
  // Por defecto (las páginas públicas ponen además su canonical y sus idiomas: ver lib/metadatos.ts).
  return {
    metadataBase: new URL(LANDING_URL),
    title: t("titulo"),
    description: t("descripcion"),
    openGraph: { siteName: "TechToJob", title: t("titulo"), description: t("descripcion"), images: [IMAGEN_COMPARTIR] },
    twitter: { card: "summary_large_image", title: t("titulo"), description: t("descripcion"), images: [IMAGEN_COMPARTIR.url] },
  };
}

export default async function LayoutIdioma({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <BarraNavegacion />
          <Cabecera />
          <div className="flex flex-1 flex-col">{children}</div>
          <Pie />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
