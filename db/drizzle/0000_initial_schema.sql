CREATE TYPE "public"."file_kind" AS ENUM('source_pdf', 'page_image', 'page_markdown', 'zip');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('pending', 'processing', 'post_processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."process_status" AS ENUM('pending', 'splitting', 'processing', 'post_processing', 'finalizing', 'completed', 'failed');--> statement-breakpoint

CREATE TABLE "file" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "file_kind" NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"filename" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);--> statement-breakpoint

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp (6) with time zone,
	"refresh_token_expires_at" timestamp (6) with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "process" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_file_id" text NOT NULL,
	"zip_file_id" text,
	"status" "process_status" DEFAULT 'pending' NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"completed_pages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"started_at" timestamp (6) with time zone,
	"updated_at" timestamp (6) with time zone NOT NULL,
	"completed_at" timestamp (6) with time zone,
	"error_at" timestamp (6) with time zone,
	"error" text,
	CONSTRAINT "process_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "process_source_file_id_file_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "file"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "process_zip_file_id_file_id_fk" FOREIGN KEY ("zip_file_id") REFERENCES "file"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "page" (
	"id" text PRIMARY KEY NOT NULL,
	"process_id" text NOT NULL,
	"page_number" integer NOT NULL,
	"image_file_id" text,
	"markdown_file_id" text,
	"status" "page_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_at" timestamp (6) with time zone,
	"error" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "page_process_id_process_id_fk" FOREIGN KEY ("process_id") REFERENCES "process"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "page_image_file_id_file_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "page_markdown_file_id_file_id_fk" FOREIGN KEY ("markdown_file_id") REFERENCES "file"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "page_process_id_page_number_unique" UNIQUE("process_id","page_number")
);
