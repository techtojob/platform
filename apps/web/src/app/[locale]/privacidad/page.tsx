import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { Portada } from "@/components/sitio/portada";
import { Aviso, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { metadatos } from "@/lib/metadatos";
import { LANDING_URL, sitio } from "@/lib/sitio";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacidad">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "privacidad" });
  return metadatos({ titulo: `${t("titulo")} – TechToJob`, descripcion: t("entradilla"), href: "/privacidad", locale });
}

/**
 * Privacidad de la bolsa: qué datos guarda, para qué, quién más los trata, cuánto tiempo,
 * tus derechos y las cookies. Los textos están en messages/*.json ("privacidad").
 * Si cambia lo que guardamos (una tabla nueva, una cookie nueva…), hay que actualizar esta página.
 */
export default function PaginaPrivacidad({ params }: PageProps<"/[locale]/privacidad">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("privacidad");
  const etiquetas = {
    b: (texto: ReactNode) => <strong className="text-texto">{texto}</strong>,
    aviso: (texto: ReactNode) => (
      <a href={`${LANDING_URL}${sitio.avisoLegal}`} className="font-bold text-enlace underline">
        {texto}
      </a>
    ),
    correo: (texto: ReactNode) => (
      <a href="mailto:contacto@techtojob.com" className="font-bold text-enlace underline">
        {texto}
      </a>
    ),
    cuenta: (texto: ReactNode) => (
      <Link href="/cuenta/ajustes" className="font-bold text-enlace underline">
        {texto}
      </Link>
    ),
    aepd: (texto: ReactNode) => (
      <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="font-bold text-enlace underline">
        {texto}
      </a>
    ),
  };
  const lista = (clave: "que" | "para" | "quien" | "cuanto" | "derechos") =>
    (t.raw(`${clave}.items`) as string[]).map((_, i) => (
      <li key={i} className="flex gap-3">
        <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-acento" />
        <span>{t.rich(`${clave}.items.${i}` as never, etiquetas as never)}</span>
      </li>
    ));
  const cookies = t.raw("cookies.lista") as Array<[string, string, string]>;

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("titulo") }]}
        titulo={t("titulo")}
        entradilla={t("entradilla")}
        compacta
      >
        <p className="mt-4 text-sm font-bold text-suave">{t("actualizado")}</p>
      </Portada>
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <Aviso giro="-rotate-[0.6deg]" className="p-6 sm:p-8">
            <h2 className="text-xl font-bold">{t("resumenTitulo")}</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {(t.raw("resumen") as string[]).map((frase) => (
                <li key={frase} className="border-t border-ink/15 pt-2.5 font-bold">
                  {frase}
                </li>
              ))}
            </ul>
          </Aviso>

          <Seccion titulo={t("responsable.titulo")}>
            <p>{t.rich("responsable.texto", etiquetas)}</p>
          </Seccion>
          <Seccion titulo={t("que.titulo")}>
            <ul className="flex flex-col gap-3">{lista("que")}</ul>
            <p className="font-bold text-texto">{t("que.nunca")}</p>
          </Seccion>
          <Seccion titulo={t("para.titulo")}>
            <ul className="flex flex-col gap-3">{lista("para")}</ul>
          </Seccion>
          <Seccion titulo={t("quien.titulo")}>
            <ul className="flex flex-col gap-3">{lista("quien")}</ul>
            <p>{t("quien.empresas")}</p>
          </Seccion>
          <Seccion titulo={t("cuanto.titulo")}>
            <ul className="flex flex-col gap-3">{lista("cuanto")}</ul>
          </Seccion>
          <Seccion titulo={t("derechos.titulo")}>
            <ul className="flex flex-col gap-3">{lista("derechos")}</ul>
            <p>{t.rich("derechos.reclamar", etiquetas)}</p>
          </Seccion>
          <Seccion titulo={t("cookies.titulo")} id="cookies">
            <p>{t("cookies.texto")}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-borde-fuerte text-xs uppercase tracking-[0.1em] text-suave">
                    <th scope="col" className="py-2 pr-4 font-bold">{t("cookies.nombre")}</th>
                    <th scope="col" className="py-2 pr-4 font-bold">{t("cookies.para")}</th>
                    <th scope="col" className="py-2 font-bold">{t("cookies.dura")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map(([nombre, para, dura]) => (
                    <tr key={nombre} className="border-b border-borde align-top">
                      <td className="py-3 pr-4 font-mono text-xs font-bold text-texto">{nombre}</td>
                      <td className="py-3 pr-4">{para}</td>
                      <td className="py-3">{dura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        </div>
      </section>
    </main>
  );
}

function Seccion({ titulo, id, children }: { titulo: string; id?: string; children: ReactNode }) {
  return (
    <Tarjeta className="scroll-mt-28 p-6 sm:p-8" id={id}>
      <h2 className="text-titulo-3 font-bold">{titulo}</h2>
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-suave">{children}</div>
    </Tarjeta>
  );
}
