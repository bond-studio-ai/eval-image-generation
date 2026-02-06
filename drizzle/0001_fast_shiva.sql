CREATE TABLE "image_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"output_image_id" uuid NOT NULL,
	"product_accuracy_categories" text,
	"product_accuracy_issues" text,
	"product_accuracy_notes" text,
	"scene_accuracy_issues" text,
	"scene_accuracy_notes" text,
	"integration_accuracy_issues" text,
	"integration_accuracy_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_image_evaluation_output" UNIQUE("output_image_id")
);
--> statement-breakpoint
ALTER TABLE "image_evaluation" ADD CONSTRAINT "image_evaluation_output_image_id_generation_image_output_id_fk" FOREIGN KEY ("output_image_id") REFERENCES "public"."generation_image_output"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_image_evaluation_output" ON "image_evaluation" USING btree ("output_image_id");