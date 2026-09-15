CREATE TYPE "public"."heart_rate_zone" AS ENUM('Z1', 'Z2', 'Z3', 'Z4', 'Z5');--> statement-breakpoint
CREATE TYPE "public"."session_priority" AS ENUM('core', 'optional');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('recovery', 'long_run', 'interval', 'tempo', 'threshold', 'hill_repeats', 'fartlek', 'technical_descent', 'race_simulation', 'race_recon', 'test_zones', 'test_hill', 'cross_training', 'rest', 'custom');--> statement-breakpoint
CREATE TYPE "public"."sport" AS ENUM('RUNNING', 'BIKING', 'SWIMMING');--> statement-breakpoint
CREATE TYPE "public"."terrain_type" AS ENUM('road', 'technical', 'trail', 'river');--> statement-breakpoint
CREATE TYPE "public"."user_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."week_day" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TYPE "public"."week_phase" AS ENUM('base', 'build', 'peak', 'taper', 'recovery');--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"race_id" uuid NOT NULL,
	"generated_at" date DEFAULT now() NOT NULL,
	"start_date" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"distance" numeric(5, 2) NOT NULL,
	"elevation_gain_m" integer NOT NULL,
	"location" text,
	"terrain" "terrain_type"[],
	"start_time" time,
	"target_time" integer,
	"gpx_ref" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" integer NOT NULL,
	"suggested_day_of_week" "week_day" NOT NULL,
	"scheduled_date" date NOT NULL,
	"sport" "sport" DEFAULT 'RUNNING' NOT NULL,
	"type" "session_type" NOT NULL,
	"session_title" text NOT NULL,
	"priority" "session_priority" NOT NULL,
	"test_difficulty_level" integer,
	"suggested_terrain_type" "terrain_type"[],
	"why" text,
	"custom_description" text,
	"steps" jsonb,
	"route_segment" jsonb
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"week_index" integer NOT NULL,
	"phase" "week_phase" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "level" "user_level" DEFAULT 'beginner';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_weekly_availability" "week_day"[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_weekly_sessions" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logistical_constraints" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "injury_or_pain_concerns" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planned_life_events" text;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_race_id_race_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."race"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;