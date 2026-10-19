import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";
import { Avatar } from "./avatar";

/** Cabecera: "Entrar" o, con sesión, la foto y el nombre con enlace a "Mi cuenta". */
export async function MenuCuenta() {
  const [t, cabeceras] = await Promise.all([
    getTranslations("cuenta"),
    headers(),
  ]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie")).catch(() => null);

  if (!cuenta) {
    return (
      <Link
        href="/entrar"
        className={clasesBoton({ className: "ml-1 px-4 min-[50rem]:px-5" })}
      >
        {t("entrar")}
      </Link>
    );
  }
  return (
    <>
      {/* Solo el staff ve el acceso a su panel */}
      {cuenta.esStaff && (
        <Link
          href="/staff"
          className="ml-1 hidden h-11 items-center rounded-full border border-acento px-4 text-sm font-bold text-enlace transition-colors hover:bg-acento hover:text-ink min-[50rem]:inline-flex"
        >
          {t("staff")}
        </Link>
      )}
      <Link
        href="/cuenta/ajustes"
        aria-label={t("miCuenta")}
        className="ml-1 flex h-11 items-center gap-2 rounded-full bg-chip pl-1.5 pr-1.5 text-sm font-bold text-texto transition-colors hover:bg-acento hover:text-ink sm:pr-4"
      >
        <Avatar nombre={cuenta.usuario.nombre} imagen={cuenta.usuario.imagen} />
        <span className="hidden max-w-32 truncate sm:inline">
          {cuenta.usuario.nombre.split(" ")[0]}
        </span>
      </Link>
    </>
  );
}

/** Lo que se ve mientras se mira si hay sesión: un hueco del mismo tamaño, para que nada salte. */
export function MenuCuentaCargando() {
  return (
    <span
      aria-hidden="true"
      className="ml-1 block h-11 w-11 rounded-full bg-chip sm:w-24"
    />
  );
}
