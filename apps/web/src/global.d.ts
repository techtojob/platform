import type { Locale } from "@/i18n/routing";
import type mensajes from "../messages/es.json";

// Comprueba al compilar que cada texto usado con `t("...")` existe en español,
// que es el idioma de referencia.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof mensajes;
  }
}
