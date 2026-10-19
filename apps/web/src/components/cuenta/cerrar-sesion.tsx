"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { authCliente } from "@/lib/auth-cliente";

export function CerrarSesion() {
  const t = useTranslations("cuenta");
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <Boton
      variante="secundario"
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          await authCliente.signOut();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {t("cerrarSesion")}
    </Boton>
  );
}
