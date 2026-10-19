import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";
import { Avatar } from "./avatar";

/** Cabecera: "Entrar" o, con sesión, la foto y el nombre con enlace a "Mi cuenta". */
export async function MenuCuenta() {
  const [t, cabeceras] = await Promise.all([getTranslations("cuenta"), headers()]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie")).catch(() => null);

  if (!cuenta) {
    return (
      <Link href="/entrar" className={clasesBoton({ variante: "secundario" })}>
        {t("entrar")}
      </Link>
    );
  }
  return (
    <Link
      href="/cuenta/ajustes"
      aria-label={t("miCuenta")}
      className="flex h-11 items-center gap-2 rounded-control px-1.5 text-sm font-semibold text-texto hover:bg-hover sm:pr-3"
    >
      <Avatar nombre={cuenta.usuario.nombre} imagen={cuenta.usuario.imagen} />
      <span className="hidden max-w-32 truncate sm:inline">{cuenta.usuario.nombre.split(" ")[0]}</span>
    </Link>
  );
}

/** Lo que se ve mientras se mira si hay sesión: un hueco del mismo tamaño, para que nada salte. */
export function MenuCuentaCargando() {
  return <span aria-hidden="true" className="block h-11 w-11 rounded-control bg-hover sm:w-24" />;
}
