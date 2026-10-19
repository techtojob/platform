import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LANDING_URL, SECCIONES_LANDING, sitio } from "@/lib/sitio";
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

/** El pie de la landing: logo grande, secciones, legal y redes. */
export async function Pie() {
  const [t, nav] = await Promise.all([getTranslations("pie"), getTranslations("navegacion")]);
  return (
    <footer className="bg-fondo px-[var(--margen)] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-16 text-texto lg:pb-16">
      <div className="mx-auto max-w-[80rem] border-t border-acento/40 pt-12">
        <div className="grid gap-14 min-[60rem]:grid-cols-[1fr_1.1fr] min-[60rem]:gap-24">
          <div className="flex items-center">
            <a href={LANDING_URL} className="block w-full max-w-[28rem]">
              <Image src="/images/brand-logo.svg" alt="TechToJob" width={140} height={78} unoptimized className="h-auto w-full" />
            </a>
          </div>
          <div className="grid gap-x-10 gap-y-9 min-[36rem]:grid-cols-2">
            <nav aria-labelledby="pie-explorar">
              <h2 id="pie-explorar" className="text-base font-bold text-enlace">
                {t("explorar")}
              </h2>
              <ul className="mt-4 grid gap-1">
                {SECCIONES_LANDING.map(([clave, ruta]) => (
                  <li key={clave}>
                    <a href={`${LANDING_URL}${ruta}`} className={enlace}>
                      {nav(clave)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <h2 className="text-base font-bold text-enlace">{t("legal")}</h2>
              <ul className="mt-4 grid gap-1">
                <li>
                  <a href={`${LANDING_URL}/privacidad`} className={enlace}>
                    {t("privacidad")}
                  </a>
                </li>
                <li>
                  <a href={`${LANDING_URL}/aviso-legal`} className={enlace}>
                    {t("avisoLegal")}
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-borde pt-6 min-[36rem]:col-span-2">
              <h2 className="text-base font-bold text-enlace">{t("comunidad")}</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
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
              <p className="mt-6 text-xs text-suave">© {ANO} TechToJob</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
