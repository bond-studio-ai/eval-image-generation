CREATE TABLE "generation_step_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt" text NOT NULL,
	"model_name" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"temperature" numeric(3, 2),
	"output_type" varchar(50),
	"aspect_ratio" varchar(20),
	"output_resolution" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_generation_step_execution_order" UNIQUE("generation_id","step_order")
);
--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "renovation_type" "renovation_type";--> statement-breakpoint
ALTER TABLE "image_preset" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "strategy_v2" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "generation_step_execution" ADD CONSTRAINT "generation_step_execution_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;