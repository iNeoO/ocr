ALTER TYPE "public"."file_kind" ADD VALUE 'process_markdown';--> statement-breakpoint
ALTER TABLE "process" ADD COLUMN "merged_md_file_id" text;--> statement-breakpoint
ALTER TABLE "process" ADD CONSTRAINT "process_merged_md_file_id_file_id_fk" FOREIGN KEY ("merged_md_file_id") REFERENCES "public"."file"("id") ON DELETE set null ON UPDATE no action;