import { useTranslations } from "next-intl";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Página que sale cuando algo no existe: una oferta retirada, un enlace mal copiado… */
export default function NoEncontrada() {
  const t = useTranslations("noEncontrada");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-5 px-6 py-24">
      <p className="font-bold text-primary">404</p>
      <h1 className="text-titulo-1 font-bold">{t("titulo")}</h1>
      <p className="text-lg text-white/75">{t("texto")}</p>
      <Link href="/" className={clasesBoton({ tamano: "lg" })}>
        {t("volver")}
      </Link>
    </main>
  );
}
