ALTER TABLE "ofertas" ADD COLUMN "caduca_en" timestamp with time zone;--> statement-breakpoint
-- Las ofertas ya publicadas caducan a los 45 días de su publicación.
UPDATE "ofertas" SET "caduca_en" = "publicada_en" + interval '45 days' WHERE "estado" = 'publicada' AND "caduca_en" IS NULL;
