import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { SelectorIdioma } from "@/components/selector-idioma";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Sora, la tipografía de la marca, alojada en el propio proyecto (paquete
// @fontsource-variable/sora): no depende de Google Fonts ni envía datos a terceros.
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
  return { title: t("titulo"), description: t("descripcion") };
}

export default async function LayoutIdioma({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <header className="flex justify-end px-6 py-4">
            <SelectorIdioma />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
