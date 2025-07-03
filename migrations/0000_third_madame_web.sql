CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" bigint,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "analytics_polls" (
	"id" text PRIMARY KEY NOT NULL,
	"title_id" text NOT NULL,
	"polled_at" timestamp DEFAULT now() NOT NULL,
	"views" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" real NOT NULL,
	"average_view_duration" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "test_rotation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"title_id" text NOT NULL,
	"title_text" text NOT NULL,
	"rotated_at" timestamp DEFAULT now() NOT NULL,
	"rotation_order" integer NOT NULL,
	"duration_minutes" integer,
	"views_at_rotation" integer DEFAULT 0,
	"ctr_at_rotation" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"video_id" text NOT NULL,
	"video_title" text,
	"rotation_interval_minutes" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"winner_metric" text DEFAULT 'ctr' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current_title_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "title_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"title_id" text NOT NULL,
	"total_views" integer NOT NULL,
	"total_impressions" integer NOT NULL,
	"final_ctr" real NOT NULL,
	"final_avd" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "title_summaries_title_id_unique" UNIQUE("title_id")
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"text" text NOT NULL,
	"order" integer NOT NULL,
	"activated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"youtube_id" text,
	"oauth_token" text,
	"refresh_token" text,
	"subscription_status" text DEFAULT 'none',
	"subscription_tier" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_youtube_id_unique" UNIQUE("youtube_id")
);
