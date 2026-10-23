import Image from "next/image";
import { useTranslations } from "next-intl";
import { Portada } from "@/components/sitio/portada";
import { IconoRed, type RedSocial } from "@/components/sitio/icono-red";
import { Aviso, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { ID_ORGANIZACION, jsonSeguro } from "@/lib/datos-google";
import { LANDING_URL, sitio } from "@/lib/sitio";

/**
 * El perfil oficial de TechToJob en Talento: techtojob.com/empleo/talento/techtojob.
 * No es de nadie (no está en la base de datos): sale aquí, fijo, con todas las redes.
 * El alias "techtojob" está reservado (validar-perfil.ts), así que nadie puede quitárselo.
 * Para cambiar textos: messages/*.json → "oficial". Las redes salen de lib/sitio.ts.
 */
export const ALIAS_OFICIAL = "techtojob";

const REDES: ReadonlyArray<{ red: RedSocial; nombre: string; href: string }> = [
  { red: "discord", nombre: "Discord", href: sitio.discord },
  { red: "linkedin", nombre: "LinkedIn", href: sitio.linkedin },
  { red: "instagram", nombre: "Instagram", href: sitio.instagram },
  { red: "tiktok", nombre: "TikTok", href: sitio.tiktok },
  { red: "x", nombre: "X", href: sitio.x },
];

function Logo({ tamano }: { tamano: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-fondo ring-2 ring-acento"
      style={{ width: tamano, height: tamano }}
    >
      <Image src="/empleo-recursos/brand-mark.svg" alt="" width={66} height={66} unoptimized style={{ width: tamano * 0.55, height: "auto" }} />
    </span>
  );
}

function Sello() {
  const t = useTranslations("oficial");
  return (
    <Etiqueta tono="acento" className="gap-1">
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
      {t("sello")}
    </Etiqueta>
  );
}

/** Los iconos de las redes, en fila. `encima`: por encima del enlace que estira la tarjeta. */
function Redes({ grandes = false, encima = false }: { grandes?: boolean; encima?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${encima ? "relative z-10 shrink-0 sm:flex-nowrap" : ""}`}>
      {REDES.map(({ red, nombre, href }) => (
        <li key={red}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nombre}
            title={nombre}
            className={`inline-flex items-center justify-center rounded-full border border-borde-fuerte text-texto transition-colors hover:bg-acento hover:text-ink ${grandes ? "size-12" : "size-10"}`}
          >
            <IconoRed network={red} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** En el listado de Talento: la primera, ocupando todo el ancho. */
export function TarjetaOficial() {
  const t = useTranslations("oficial");
  return (
    <div className="group relative flex flex-col gap-4 rounded-tarjeta border border-acento/60 bg-tarjeta p-5 text-texto shadow-tarjeta transition hover:-translate-y-0.5 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <Logo tamano={60} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={{ pathname: "/talento/[alias]", params: { alias: ALIAS_OFICIAL } }}
              className="text-titulo-3 font-bold after:absolute after:inset-0 after:rounded-tarjeta group-hover:text-enlace group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
            >
              TechToJob
            </Link>
            <Sello />
          </p>
          <p className="font-bold text-texto/90">{t("titular")}</p>
          <p className="text-sm text-suave">{t("resumen")}</p>
        </div>
      </div>
      <Redes encima />
    </div>
  );
}

/** La página del perfil oficial. */
export function FichaOficial() {
  const t = useTranslations();
  const parrafos = t.raw("oficial.sobre") as string[];
  const secciones = [
    { clave: "ofertas", href: "/" },
    { clave: "talento", href: "/cuenta/perfil" },
    { clave: "proyectos", href: "/proyectos" },
  ] as const;
  // Para Google: quién es TechToJob y cuáles son sus redes oficiales.
  const organizacion = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID_ORGANIZACION,
    name: "TechToJob",
    url: LANDING_URL,
    logo: `${LANDING_URL}/images/brand-mark-512.png`,
    email: sitio.correo,
    sameAs: REDES.map((r) => r.href),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(organizacion) }} />
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("talento.titulo"), href: "/talento" }, { texto: "TechToJob" }]}
        antesDelTitulo={<Logo tamano={96} />}
        titulo="TechToJob"
        entradilla={t("oficial.titular")}
        compacta
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Sello />
          <a href={sitio.discord} target="_blank" rel="noopener noreferrer" className={clasesBoton()}>
            {t("oficial.unirme")}
          </a>
          <a href={LANDING_URL} className={clasesBoton({ variante: "secundario" })}>
            techtojob.com
          </a>
        </div>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] pb-20 pt-12">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Tarjeta className="flex flex-col gap-4 p-6 sm:p-8">
              <h2 className="text-titulo-3 font-bold">{t("oficial.sobreTitulo")}</h2>
              <div className="flex max-w-[68ch] flex-col gap-4 leading-relaxed text-suave">
                {parrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Tarjeta>

            <section aria-labelledby="titulo-aqui" className="flex flex-col gap-4">
              <h2 id="titulo-aqui" className="text-titulo-3 font-bold">
                {t("oficial.aquiTitulo")}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {secciones.map(({ clave, href }) => (
                  <li key={clave}>
                    <Link
                      href={href}
                      className="flex h-full flex-col gap-2 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta transition hover:-translate-y-0.5 hover:border-acento/60 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span className="font-bold text-enlace">{t(`oficial.aqui.${clave}.titulo`)}</span>
                      <span className="text-sm text-suave">{t(`oficial.aqui.${clave}.texto`)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <a href={`${LANDING_URL}/torneos`} className="self-start font-bold text-enlace underline">
                {t("oficial.torneos")}
              </a>
            </section>
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Tarjeta className="flex flex-col gap-4 p-6">
              <h2 className="text-titulo-3 font-bold">{t("oficial.redesTitulo")}</h2>
              <Redes grandes />
              <p className="text-sm text-suave">{t("oficial.redesTexto")}</p>
            </Tarjeta>
            <Aviso giro="rotate-[1deg]" className="flex flex-col gap-3 p-6">
              <p className="text-lg font-bold leading-tight">{t("oficial.escribenosTitulo")}</p>
              <p className="text-sm text-ink/80">{t("oficial.escribenosTexto")}</p>
              <a href={`mailto:${sitio.correo}`} className={clasesBoton({ variante: "sobrePostit", className: "self-start" })}>
                {sitio.correo}
              </a>
            </Aviso>
          </aside>
        </div>
      </section>
    </>
  );
}
