ALTER TABLE "perfiles" ADD COLUMN "anos_experiencia" integer;--> statement-breakpoint
ALTER TABLE "perfiles" ADD COLUMN "lidera" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "perfiles" ADD COLUMN "foto" text DEFAULT 'ninguna' NOT NULL;--> statement-breakpoint
-- Perfiles de antes: la foto que enseñaban (si la enseñaban) según de dónde era la foto de la cuenta.
UPDATE "perfiles" AS p SET "foto" = CASE
  WHEN NOT p."mostrar_foto" THEN 'ninguna'
  WHEN u."imagen" LIKE '%githubusercontent%' THEN 'github'
  WHEN u."imagen" IS NULL THEN 'ninguna'
  ELSE 'google'
END
FROM "usuarios" AS u WHERE u."id" = p."usuario_id";--> statement-breakpoint
UPDATE "perfiles" SET "lidera" = true WHERE "seniority" = 'lead';
