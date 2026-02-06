CREATE TYPE "public"."generation_rating" AS ENUM('FAILED', 'POOR', 'ACCEPTABLE', 'GOOD', 'EXCELLENT');--> statement-breakpoint
CREATE TABLE "generation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_version_id" uuid NOT NULL,
	"result_rating" "generation_rating",
	"notes" text,
	"execution_time" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_image_input" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_image_output" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt" text NOT NULL,
	"name" varchar(255),
	"description" text,
	"model" varchar(255),
	"output_type" varchar(50),
	"aspect_ratio" varchar(20),
	"output_resolution" varchar(20),
	"temperature" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_prompt_version_id_prompt_version_id_fk" FOREIGN KEY ("prompt_version_id") REFERENCES "public"."prompt_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_image_input" ADD CONSTRAINT "generation_image_input_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_image_output" ADD CONSTRAINT "generation_image_output_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generation_prompt_version" ON "generation" USING btree ("prompt_version_id");--> statement-breakpoint
CREATE INDEX "idx_generation_created_at" ON "generation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_generation_rating" ON "generation" USING btree ("result_rating") WHERE result_rating IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_generation_unrated" ON "generation" USING btree ("created_at") WHERE result_rating IS NULL;--> statement-breakpoint
CREATE INDEX "idx_input_generation" ON "generation_image_input" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_output_generation" ON "generation_image_output" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_prompt_version_created_at" ON "prompt_version" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_prompt_version_active" ON "prompt_version" USING btree ("created_at") WHERE deleted_at IS NULL;