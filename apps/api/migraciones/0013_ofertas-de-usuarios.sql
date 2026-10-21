ALTER TABLE "ofertas" ADD COLUMN "autor_id" text;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ofertas_autor_idx" ON "ofertas" USING btree ("autor_id");