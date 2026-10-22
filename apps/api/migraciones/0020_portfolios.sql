CREATE TABLE "megusta_portfolios" (
	"portfolio_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "megusta_portfolios_portfolio_id_usuario_id_pk" PRIMARY KEY("portfolio_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"descripcion" text,
	"imagen" text,
	"oculto" boolean DEFAULT false NOT NULL,
	"juicio_pedido_en" timestamp with time zone,
	"juicio_revisado_en" timestamp with time zone,
	"juicio_video" text,
	"juicio_revisado_por" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reportes" ADD COLUMN "portfolio_id" text;--> statement-breakpoint
ALTER TABLE "megusta_portfolios" ADD CONSTRAINT "megusta_portfolios_portfolio_id_portfolios_usuario_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megusta_portfolios" ADD CONSTRAINT "megusta_portfolios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_juicio_revisado_por_usuarios_id_fk" FOREIGN KEY ("juicio_revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "megusta_portfolios_fecha_idx" ON "megusta_portfolios" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "portfolios_creado_idx" ON "portfolios" USING btree ("creada_en");--> statement-breakpoint
CREATE INDEX "portfolios_juicio_idx" ON "portfolios" USING btree ("juicio_pedido_en");--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_portfolio_id_portfolios_usuario_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_portfolio_unico_idx" ON "reportes" USING btree ("portfolio_id","reportado_por");