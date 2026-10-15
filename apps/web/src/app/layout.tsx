import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Sora, la tipografía de la marca, alojada en el propio proyecto (paquete
// @fontsource-variable/sora): no depende de Google Fonts ni envía datos a terceros.
const sora = localFont({
  src: "../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechToJob – Empleo tech",
  description:
    "Ofertas de empleo tech revisadas por la comunidad y perfiles de talento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
