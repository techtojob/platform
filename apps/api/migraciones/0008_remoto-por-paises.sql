ALTER TABLE "ofertas" ADD COLUMN "remoto_mundo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ofertas" ADD COLUMN "remoto_paises" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "ofertas_remoto_paises_idx" ON "ofertas" USING gin ("remoto_paises");--> statement-breakpoint
-- Las zonas de antes pasan a países (ver packages/shared/src/remoto.ts).
UPDATE "ofertas" SET "remoto_mundo" = true WHERE "remoto_desde" = 'mundo';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['ES'] WHERE "remoto_desde" = 'es';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['ES','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','SE','GB','CH','NO'] WHERE "remoto_desde" = 'eu';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['MX','GT','HN','SV','NI','CR','PA','CU','DO','PR','CO','VE','EC','PE','BO','CL','AR','UY','PY','BR'] WHERE "remoto_desde" = 'latam';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['US'] WHERE "remoto_desde" = 'eeuu';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['CA'] WHERE "remoto_desde" = 'canada';--> statement-breakpoint
UPDATE "ofertas" SET "remoto_paises" = ARRAY['US','CA'] WHERE "remoto_desde" = 'norteamerica';