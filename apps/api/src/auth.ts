import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import type { Db } from "./db/cliente";
import { cuentas, limitesAcceso, sesiones, usuarios, verificaciones } from "./db/esquema";
import { actualizarEstadoDiscord, type ConfigDiscord } from "./servicios/discord";

/**
 * Inicio de sesión (Better Auth).
 *
 * - Se entra con Google o GitHub. Los dos dan una identidad fiable (email verificado).
 * - Discord NO sirve para entrar: solo se vincula desde "Mi cuenta", para saber si la
 *   persona está en el servidor de TechToJob. Lo comprueba el bot (servicios/discord.ts).
 * - Las rutas viven en /api/auth/*. La web las sirve desde su propio dominio (rewrite en
 *   apps/web/next.config.ts): así la cookie de sesión es de la web y no hay líos de dominios.
 *
 * Un proveedor sin su client id configurado no se activa: se puede programar sin tener
 * las apps de Google, GitHub o Discord creadas.
 */

export type EnvAuth = {
  /** Secreto para firmar las cookies (32+ caracteres al azar). */
  BETTER_AUTH_SECRET: string;
  /** Dirección de la web: http://localhost:3000 en local, https://techtojob.com en producción. */
  WEB_URL: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_SERVIDOR_ID?: string;
};

export const RUTA_AUTH = "/api/auth";

/** Bot y servidor de Discord, si están configurados. */
export function configDiscord(env: EnvAuth): ConfigDiscord | null {
  return env.DISCORD_BOT_TOKEN && env.DISCORD_SERVIDOR_ID
    ? { tokenBot: env.DISCORD_BOT_TOKEN, servidorId: env.DISCORD_SERVIDOR_ID }
    : null;
}

/** Comprueba el Discord vinculado de un usuario, si tiene. Nunca rompe el inicio de sesión. */
async function comprobarDiscordDe(db: Db, env: EnvAuth, userId: string) {
  const config = configDiscord(env);
  if (!config) return;
  try {
    const [cuenta] = await db
      .select({ discordId: cuentas.accountId })
      .from(cuentas)
      .where(and(eq(cuentas.userId, userId), eq(cuentas.providerId, "discord")))
      .limit(1);
    if (cuenta) await actualizarEstadoDiscord(db, config, userId, cuenta.discordId);
  } catch (error) {
    console.error("No se pudo comprobar el Discord del usuario:", error);
  }
}

/** Discord solo para vincular: rechaza entrar o crear una cuenta con él. */
export function guardiaDiscord(source: { action: string; oauth?: { providerId: string } | undefined }) {
  if (source.oauth?.providerId === "discord" && source.action !== "link-account") {
    return { error: "discord_solo_vincular", errorDescription: "Discord solo se puede vincular desde Mi cuenta." };
  }
}

export function opcionesAuth(db: Db, env: EnvAuth) {
  const proveedores: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    proveedores.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    proveedores.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    };
  }
  if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
    proveedores.discord = {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      // Solo el id y el nombre de usuario: ni email ni lista de servidores.
      scope: ["identify"],
      disableDefaultScope: true,
      disableSignUp: true,
    };
  }

  return {
    appName: "TechToJob",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.WEB_URL,
    basePath: RUTA_AUTH,
    trustedOrigins: [env.WEB_URL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: usuarios, session: sesiones, account: cuentas, verification: verificaciones, rateLimit: limitesAcceso },
    }),
    // Límite de intentos por IP (en la base de datos: vale igual en todos los servidores de Cloudflare).
    // Entrar y vincular: 10 por minuto. Lo demás: 100 por minuto. Saber si hay sesión (lo pide la
    // landing en cada página) no cuenta.
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/*": { window: 60, max: 10 },
        "/link-social": { window: 60, max: 10 },
        "/callback/*": { window: 60, max: 20 },
        "/get-session": false as const,
      },
    },
    advanced: {
      // La IP de verdad la da Cloudflare en esta cabecera (las demás se pueden falsear).
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    socialProviders: proveedores,
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 días
      updateAge: 60 * 60 * 24, // se renueva una vez al día si se usa
    },
    account: {
      // Tokens de Google, GitHub y Discord cifrados en la base de datos.
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        // Mismo email en Google y GitHub → misma cuenta de TechToJob, pero solo si el
        // proveedor dice que ese email está verificado. Google y GitHub NO van en
        // `trustedProviders` a propósito: si no, se unirían cuentas aunque el email no
        // estuviera verificado, y alguien podría entrar en la cuenta de otra persona
        // poniendo su email en GitHub.
        // Discord sí: solo pedimos "identify" (sin email), así que nunca trae un email
        // verificado. Es seguro porque con Discord no se puede entrar ni crear cuentas
        // (ver guardiaDiscord y el hook de abajo): solo se vincula desde Mi cuenta, con sesión.
        trustedProviders: ["discord"],
        // Discord no tiene el mismo email (no tiene ninguno): se vincula igualmente.
        allowDifferentEmails: true,
      },
    },
    user: {
      // Discord solo para vincular, nunca para entrar ni crear cuentas.
      validateUserInfo: ({ source }) => guardiaDiscord(source),
    },
    hooks: {
      // Ni siquiera se empieza a entrar con Discord: se corta antes de ir a discord.com.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/social" && (ctx.body as { provider?: string } | undefined)?.provider === "discord") {
          throw new APIError("FORBIDDEN", { code: "discord_solo_vincular", message: "Discord solo se puede vincular desde Mi cuenta." });
        }
      }),
    },
    databaseHooks: {
      account: {
        create: {
          after: async (cuenta) => {
            if (cuenta.providerId === "discord") await comprobarDiscordDe(db, env, cuenta.userId);
          },
        },
      },
      session: {
        create: {
          // En cada inicio de sesión se vuelve a mirar, por si ha salido o entrado del servidor.
          after: async (sesion) => comprobarDiscordDe(db, env, sesion.userId),
        },
      },
    },
  } satisfies BetterAuthOptions;
}

export function crearAuth(db: Db, env: EnvAuth) {
  return betterAuth(opcionesAuth(db, env));
}

export type Auth = ReturnType<typeof crearAuth>;
