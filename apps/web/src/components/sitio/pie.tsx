import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LANDING_URL, sitio } from "@/lib/sitio";
import { IconoRed, type RedSocial } from "./icono-red";

const REDES: ReadonlyArray<{ red: RedSocial; nombre: string; href: string }> = [
  { red: "discord", nombre: "Discord", href: sitio.discord },
  { red: "linkedin", nombre: "LinkedIn", href: sitio.linkedin },
  { red: "instagram", nombre: "Instagram", href: sitio.instagram },
  { red: "x", nombre: "X", href: sitio.x },
  { red: "tiktok", nombre: "TikTok", href: sitio.tiktok },
];

// El año se calcula al cargar el archivo, no en cada visita.
const ANO = new Date().getFullYear();

const enlace = "enlace-subrayado inline-flex min-h-11 items-center text-sm font-bold text-texto/85 transition-colors hover:text-enlace";

/**
 * Pie de la bolsa, con el aspecto del de la landing. Solo lleva a la portada de la landing
 * (no a sus secciones), al Discord, a las redes y a las páginas legales.
 */
export async function Pie() {
  const t = await getTranslations("pie");
  return (
    <footer className="bg-fondo px-[var(--margen)] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-16 text-texto lg:pb-16">
      <div className="mx-auto max-w-[80rem] border-t border-acento/40 pt-12">
        <div className="grid gap-14 min-[60rem]:grid-cols-[1fr_1.1fr] min-[60rem]:gap-24">
          <div className="flex flex-col items-start justify-center gap-6">
            <a href={LANDING_URL} className="block w-full max-w-[22rem]" aria-label={t("irALanding")}>
              <Image src="/empleo-recursos/brand-logo.svg" alt="TechToJob" width={140} height={78} unoptimized className="h-auto w-full" />
            </a>
            <p className="max-w-[40ch] text-sm leading-relaxed text-suave">{t("lema")}</p>
          </div>
          <div className="grid gap-x-10 gap-y-9 min-[36rem]:grid-cols-2">
            <nav aria-labelledby="pie-empleo">
              <h2 id="pie-empleo" className="text-base font-bold text-enlace">
                {t("empleo")}
              </h2>
              <ul className="mt-4 grid gap-1">
                <li>
                  <Link href="/" className={enlace}>
                    {t("ofertas")}
                  </Link>
                </li>
                <li>
                  <Link href="/talento" className={enlace}>
                    {t("talento")}
                  </Link>
                </li>
                <li>
                  <Link href="/cuenta/ajustes" className={enlace}>
                    {t("miCuenta")}
                  </Link>
                </li>
              </ul>
            </nav>
            <div>
              <h2 className="text-base font-bold text-enlace">TechToJob</h2>
              <ul className="mt-4 grid gap-1">
                <li>
                  <a href={LANDING_URL} className={enlace}>
                    {t("irALanding")}
                  </a>
                </li>
                <li>
                  <a href={sitio.discord} className={enlace}>
                    {t("discord")}
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-borde pt-6 min-[36rem]:col-span-2">
              <ul className="flex flex-wrap gap-3" aria-label={t("redes")}>
                {REDES.map(({ red, nombre, href }) => (
                  <li key={red}>
                    <a
                      href={href}
                      aria-label={nombre}
                      title={nombre}
                      className="inline-flex size-12 items-center justify-center rounded-full border border-borde-fuerte text-texto transition-colors hover:bg-acento hover:text-ink"
                    >
                      <IconoRed network={red} />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
                <span>© {ANO} TechToJob</span>
                <a href={`${LANDING_URL}${sitio.privacidad}`} className="font-bold underline-offset-4 hover:text-enlace hover:underline">
                  {t("privacidad")}
                </a>
                <a href={`${LANDING_URL}${sitio.avisoLegal}`} className="font-bold underline-offset-4 hover:text-enlace hover:underline">
                  {t("avisoLegal")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
