import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { locale as idiomaDeLaRuta } from "next/root-params";
import { Cabecera } from "@/components/cabecera";
import { ScriptTema } from "@/components/tema/script-tema";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Tipografías alojadas en el propio proyecto (paquetes @fontsource-variable/…):
// no dependen de Google Fonts ni envían datos a terceros.
// Sora, la de la marca, para títulos y logo. Instrument Sans para el resto: se lee mejor en tamaños pequeños.
const sora = localFont({
  src: "../../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
});
const instrument = localFont({
  src: "../../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});

/** Una versión de cada página por idioma, generada al compilar. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// El idioma se lee con `next/root-params` y no con `params`: así las páginas con
// partes variables (/ofertas/[slug]) también tienen su versión rápida precompilada.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await idiomaDeLaRuta();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("titulo"), description: t("descripcion") };
}

export default async function LayoutIdioma({ children }: LayoutProps<"/[locale]">) {
  const locale = await idiomaDeLaRuta();
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // suppressHydrationWarning: ScriptTema añade data-tema a <html> antes de que cargue React.
    <html lang={locale} className={`${sora.variable} ${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ScriptTema />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Cabecera />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
