ALTER TABLE "empresas" ADD COLUMN "ats" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "ats_id" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "ats_region" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "sincronizar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "bloqueada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "ultima_lectura" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "ultimo_error" text;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "fuente_ats" text;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "id_externo" text;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "descripcion_original" text;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "vista_en" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "ofertas_externas_idx" ON "ofertas" USING btree ("empresa_id","fuente_ats","id_externo");