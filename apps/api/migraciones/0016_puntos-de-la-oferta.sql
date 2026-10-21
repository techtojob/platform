ALTER TABLE "ofertas" ADD COLUMN "responsabilidades" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "requisitos" text[] DEFAULT '{}'::text[] NOT NULL;